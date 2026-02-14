import path from "path";
import fsPromises from "fs/promises";
import {
  loadEmployees,
  saveEmployees,
  addLog,
  addLogs,
  formatFieldNameWithLabel,
  getEmployeeColumnsSync,
  getDocumentFieldsSync,
  FILES_DIR
} from "../store.js";
import { mergeRow } from "../csv.js";
import { getNextId, normalizeEmployeeInput } from "../utils.js";

export function registerEmployeeRoutes(app) {
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await loadEmployees();
      res.json({ employees });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = employees.find((item) => item.employee_id === req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Сотрудник не найден" });
        return;
      }
      res.json({ employee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const payload = req.body || {};
      const employees = await loadEmployees();

      const baseEmployee = normalizeEmployeeInput(payload);

      // Запрещаем установку файловых полей через create — только через upload endpoint
      for (const docField of getDocumentFieldsSync()) {
        baseEmployee[docField] = "";
      }

      // Валидация обязательных полей
      if (!baseEmployee.first_name || !baseEmployee.first_name.trim()) {
        res.status(400).json({ error: "Имя обязательно для заполнения" });
        return;
      }
      if (!baseEmployee.last_name || !baseEmployee.last_name.trim()) {
        res.status(400).json({ error: "Фамилия обязательна для заполнения" });
        return;
      }

      const employeeId = baseEmployee.employee_id || getNextId(employees, "employee_id");

      if (employees.some((item) => item.employee_id === employeeId)) {
        res.status(409).json({ error: "ID сотрудника уже существует" });
        return;
      }

      baseEmployee.employee_id = employeeId;
      employees.push(baseEmployee);
      await saveEmployees(employees);

      // Логирование создания
      const employeeName = [baseEmployee.last_name, baseEmployee.first_name, baseEmployee.middle_name]
        .filter(Boolean)
        .join(" ");
      await addLog("CREATE", employeeId, employeeName, "", "", "", "Создан новый сотрудник");

      res.status(201).json({ employee_id: employeeId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const payload = req.body || {};
      const employees = await loadEmployees();
      const index = employees.findIndex((item) => item.employee_id === req.params.id);

      if (index === -1) {
        res.status(404).json({ error: "Сотрудник не найден" });
        return;
      }

      // Запрещаем изменение файловых полей через PUT — только через upload endpoint
      // Build updates object safely to prevent prototype pollution
      const allowedColumns = getEmployeeColumnsSync().filter(col => !getDocumentFieldsSync().includes(col));
      const updates = {};
      for (const col of allowedColumns) {
        if (col in payload && col !== '__proto__' && col !== 'constructor' && col !== 'prototype') {
          updates[col] = payload[col];
        }
      }
      const current = employees[index];
      const next = mergeRow(getEmployeeColumnsSync(), current, updates);
      next.employee_id = req.params.id;

      // Валидация обязательных полей
      if (!next.first_name || !next.first_name.trim()) {
        res.status(400).json({ error: "Имя обязательно для заполнения" });
        return;
      }
      if (!next.last_name || !next.last_name.trim()) {
        res.status(400).json({ error: "Фамилия обязательна для заполнения" });
        return;
      }

      // Валидация дат (формат и корректность)
      // ВАЖНО: Валидируем только поля которые были изменены в этом запросе
      // Это предотвращает ошибки валидации из-за legacy невалидных данных в других полях
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const dateFields = getEmployeeColumnsSync().filter(col =>
        col.includes('_date') || col === 'birth_date'
      );

      // Находим какие поля были изменены в этом запросе
      const changedDateFields = dateFields.filter(dateField => {
        const currentValue = String(current[dateField] || "").trim();
        const nextValue = String(next[dateField] || "").trim();
        return currentValue !== nextValue;
      });

      for (const dateField of changedDateFields) {
        const dateValue = String(next[dateField] || "").trim();
        if (dateValue) {
          if (!dateRegex.test(dateValue)) {
            res.status(400).json({ error: `Невірний формат дати для поля ${dateField} (очікується YYYY-MM-DD)` });
            return;
          }
          if (isNaN(Date.parse(dateValue))) {
            res.status(400).json({ error: `Невірна дата для поля ${dateField} (неіснуюча дата)` });
            return;
          }
          // Validate calendar date: check that parsed date matches input (prevents Feb 30, Apr 31, etc.)
          // Use UTC methods to avoid timezone issues with YYYY-MM-DD dates
          const parsed = new Date(dateValue + 'T00:00:00Z');
          const roundtrip = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
          if (roundtrip !== dateValue) {
            res.status(400).json({ error: `Невірна календарна дата для поля ${dateField}: ${dateValue}` });
            return;
          }
        }
      }

      // Валидация пар issue_date/expiry_date для документів
      for (const docField of getDocumentFieldsSync()) {
        const issueDateField = `${docField}_issue_date`;
        const expiryDateField = `${docField}_expiry_date`;
        const issueDate = String(next[issueDateField] || "").trim();
        const expiryDate = String(next[expiryDateField] || "").trim();

        if (issueDate && expiryDate && expiryDate < issueDate) {
          res.status(400).json({
            error: `Дата закінчення не може бути раніше дати видачі для документа ${docField}`
          });
          return;
        }
      }
      employees[index] = next;

      await saveEmployees(employees);

      // Логирование изменений
      const employeeName = [next.last_name, next.first_name, next.middle_name]
        .filter(Boolean)
        .join(" ");

      // Находим измененные поля
      const changedFields = [];
      getEmployeeColumnsSync().forEach((field) => {
        if (field !== "employee_id" && current[field] !== next[field]) {
          changedFields.push(field);
        }
      });

      // Логируем все изменения одной batch-операцией для предотвращения race condition
      if (changedFields.length > 0) {
        const logEntries = await Promise.all(changedFields.map(async (field) => {
          const formattedFieldName = await formatFieldNameWithLabel(field);
          return {
            action: "UPDATE",
            employeeId: req.params.id,
            employeeName: employeeName,
            fieldName: formattedFieldName,
            oldValue: current[field] || "",
            newValue: next[field] || "",
            details: `Изменено поле: ${formattedFieldName}`
          };
        }));
        await addLogs(logEntries);
      }

      res.json({ employee: next });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const deletedEmployee = employees.find((item) => item.employee_id === req.params.id);
      const nextEmployees = employees.filter((item) => item.employee_id !== req.params.id);

      if (nextEmployees.length === employees.length) {
        res.status(404).json({ error: "Сотрудник не найден" });
        return;
      }

      await saveEmployees(nextEmployees);

      // Логирование удаления
      if (deletedEmployee) {
        const employeeName = [deletedEmployee.last_name, deletedEmployee.first_name, deletedEmployee.middle_name]
          .filter(Boolean)
          .join(" ");
        await addLog("DELETE", req.params.id, employeeName, "", "", "", "Сотрудник удален");
      }

      // Удаляем директорию с файлами сотрудника с защитой от path traversal
      const employeeDir = path.join(FILES_DIR, `employee_${req.params.id}`);
      const resolvedDir = path.resolve(employeeDir);
      const allowedDir = path.resolve(FILES_DIR);

      if (resolvedDir.startsWith(allowedDir + path.sep)) {
        await fsPromises.rm(resolvedDir, { recursive: true, force: true }).catch(() => {});
      }

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
