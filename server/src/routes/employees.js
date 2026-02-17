import path from "path";
import fsPromises from "fs/promises";
import {
  FILES_DIR,
  loadEmployees,
  withEmployeeLock,
  addLog,
  addLogs,
  formatFieldNameWithLabel,
  getEmployeeColumnsSync,
  getDocumentFieldsSync,
  addStatusHistoryEntry,
  loadStatusHistory,
  removeStatusHistoryForEmployee,
  loadReprimands,
  addReprimand,
  updateReprimand,
  deleteReprimand,
  removeReprimandsForEmployee
} from "../store.js";
import { mergeRow } from "../csv.js";
import {
  getNextId,
  normalizeEmployeeInput,
  validateRequired,
  validatePath,
  findById,
  buildFullName
} from "../utils.js";

/**
 * Date validation logic - validates format and correctness of date fields
 */
function validateDateField(dateValue, dateField) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const trimmedValue = String(dateValue || "").trim();

  if (!trimmedValue) {
    return null; // Empty is valid
  }

  if (!dateRegex.test(trimmedValue)) {
    return `Невірний формат дати для поля ${dateField} (очікується YYYY-MM-DD)`;
  }

  if (isNaN(Date.parse(trimmedValue))) {
    return `Невірна дата для поля ${dateField} (неіснуюча дата)`;
  }

  // Validate calendar date: check that parsed date matches input (prevents Feb 30, Apr 31, etc.)
  // Use UTC methods to avoid timezone issues with YYYY-MM-DD dates
  const parsed = new Date(trimmedValue + 'T00:00:00Z');
  const roundtrip = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
  if (roundtrip !== trimmedValue) {
    return `Невірна календарна дата для поля ${dateField}: ${trimmedValue}`;
  }

  return null; // Valid
}

/**
 * Detect which fields changed between current and next employee objects
 */
function detectChangedFields(current, next) {
  const changedFields = [];
  getEmployeeColumnsSync().forEach((field) => {
    if (field !== "employee_id" && current[field] !== next[field]) {
      changedFields.push(field);
    }
  });
  return changedFields;
}

/**
 * Register employee CRUD routes
 */
export function registerEmployeeRoutes(app) {
  // GET all employees
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await loadEmployees();
      res.json({ employees });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET single employee by ID
  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }
      res.json({ employee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST create new employee
  app.post("/api/employees", async (req, res) => {
    try {
      const payload = req.body || {};

      const baseEmployee = normalizeEmployeeInput(payload);

      // Запрещаем установку файловых полей и фото через create — только через upload endpoint
      for (const docField of getDocumentFieldsSync()) {
        baseEmployee[docField] = "";
      }
      baseEmployee.photo = "";

      // Валидация обязательных полей
      const firstNameError = validateRequired(baseEmployee.first_name, 'first_name', "Ім'я обов'язкове для заповнення");
      if (firstNameError) {
        res.status(400).json({ error: firstNameError });
        return;
      }
      const lastNameError = validateRequired(baseEmployee.last_name, 'last_name', "Прізвище обов'язкове для заповнення");
      if (lastNameError) {
        res.status(400).json({ error: lastNameError });
        return;
      }

      // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
      let employeeId;
      await withEmployeeLock(async (employees) => {
        employeeId = baseEmployee.employee_id || getNextId(employees, "employee_id");

        if (employees.some((item) => item.employee_id === employeeId)) {
          throw Object.assign(new Error("ID співробітника вже існує"), { statusCode: 409 });
        }

        baseEmployee.employee_id = employeeId;
        employees.push(baseEmployee);
        return employees;
      });

      // Логирование создания
      const employeeName = buildFullName(baseEmployee);
      await addLog("CREATE", employeeId, employeeName, "", "", "", "Створено нового співробітника");

      res.status(201).json({ employee_id: employeeId });
    } catch (err) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update employee
  app.put("/api/employees/:id", async (req, res) => {
    try {
      const payload = req.body || {};

      // Запрещаем изменение файловых полей через PUT — только через upload endpoint
      // Build updates object safely to prevent prototype pollution
      const allowedColumns = getEmployeeColumnsSync().filter(col => !getDocumentFieldsSync().includes(col) && col !== 'photo');
      const updates = {};
      for (const col of allowedColumns) {
        if (col in payload && col !== '__proto__' && col !== 'constructor' && col !== 'prototype') {
          updates[col] = payload[col];
        }
      }

      // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
      let current;
      let next;
      let changedFields;
      await withEmployeeLock(async (employees) => {
        const index = employees.findIndex((item) => item.employee_id === req.params.id);

        if (index === -1) {
          throw Object.assign(new Error("Співробітник не знайдено"), { statusCode: 404 });
        }

        current = employees[index];
        next = mergeRow(getEmployeeColumnsSync(), current, updates);
        next.employee_id = req.params.id;

        // Валидация обязательных полей
        const firstNameError = validateRequired(next.first_name, 'first_name', "Ім'я обов'язкове для заповнення");
        if (firstNameError) {
          throw Object.assign(new Error(firstNameError), { statusCode: 400 });
        }
        const lastNameError = validateRequired(next.last_name, 'last_name', "Прізвище обов'язкове для заповнення");
        if (lastNameError) {
          throw Object.assign(new Error(lastNameError), { statusCode: 400 });
        }

        // Валидация дат (формат и корректность)
        // ВАЖНО: Валидируем только поля которые были изменены в этом запросе
        // Это предотвращает ошибки валидации из-за legacy невалидных данных в других полях
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
          const error = validateDateField(next[dateField], dateField);
          if (error) {
            throw Object.assign(new Error(error), { statusCode: 400 });
          }
        }

        // Валидация пар issue_date/expiry_date для документів
        for (const docField of getDocumentFieldsSync()) {
          const issueDateField = `${docField}_issue_date`;
          const expiryDateField = `${docField}_expiry_date`;
          const issueDate = String(next[issueDateField] || "").trim();
          const expiryDate = String(next[expiryDateField] || "").trim();

          if (issueDate && expiryDate && expiryDate < issueDate) {
            throw Object.assign(new Error(`Дата закінчення не може бути раніше дати видачі для документа ${docField}`), { statusCode: 400 });
          }
        }

        employees[index] = next;
        changedFields = detectChangedFields(current, next);

        return employees;
      });

      // Логирование изменений
      const employeeName = buildFullName(next);

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

      // Record status history when employment_status changes (best-effort: employee update already committed)
      if (changedFields.includes('employment_status')) {
        try {
          await addStatusHistoryEntry({
            employee_id: req.params.id,
            old_status: current.employment_status || '',
            new_status: next.employment_status || '',
            old_start_date: current.status_start_date || '',
            old_end_date: current.status_end_date || '',
            new_start_date: next.status_start_date || '',
            new_end_date: next.status_end_date || '',
            changed_by: 'user'
          });
        } catch (historyErr) {
          console.error('Failed to record status history:', historyErr);
        }
      }

      res.json({ employee: next });
    } catch (err) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET status history for employee
  app.get("/api/employees/:id/status-history", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const allHistory = await loadStatusHistory();
      const history = allHistory
        .filter(h => h.employee_id === req.params.id)
        .sort((a, b) => (b.changed_at || '').localeCompare(a.changed_at || ''));

      res.json({ history });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET reprimands for employee
  app.get("/api/employees/:id/reprimands", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const allReprimands = await loadReprimands();
      const reprimands = allReprimands
        .filter(r => r.employee_id === req.params.id)
        .sort((a, b) => (b.record_date || '').localeCompare(a.record_date || ''));

      res.json({ reprimands });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST create reprimand for employee
  app.post("/api/employees/:id/reprimands", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const { record_date, record_type, order_number, note } = req.body || {};

      if (!record_date || !String(record_date).trim()) {
        res.status(400).json({ error: "Дата запису обов'язкова" });
        return;
      }
      if (!record_type || !String(record_type).trim()) {
        res.status(400).json({ error: "Тип запису обов'язковий" });
        return;
      }

      const reprimand = await addReprimand({
        employee_id: req.params.id,
        record_date: String(record_date).trim(),
        record_type: String(record_type).trim(),
        order_number: order_number ? String(order_number).trim() : "",
        note: note ? String(note).trim() : ""
      });

      const employeeName = buildFullName(employee);
      await addLog("CREATE", req.params.id, employeeName, "reprimand", "", reprimand.record_id, `Додано запис: ${reprimand.record_type}`);

      res.status(201).json({ reprimand });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update reprimand for employee
  app.put("/api/employees/:id/reprimands/:recordId", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const { record_date, record_type, order_number, note } = req.body || {};

      if (!record_date || !String(record_date).trim()) {
        res.status(400).json({ error: "Дата запису обов'язкова" });
        return;
      }
      if (!record_type || !String(record_type).trim()) {
        res.status(400).json({ error: "Тип запису обов'язковий" });
        return;
      }

      // Verify ownership before writing
      const allReprimands = await loadReprimands();
      const existingRecord = allReprimands.find(r => r.record_id === req.params.recordId);
      if (!existingRecord) {
        res.status(404).json({ error: "Запис не знайдено" });
        return;
      }
      if (existingRecord.employee_id !== req.params.id) {
        res.status(403).json({ error: "Запис не належить цьому співробітнику" });
        return;
      }

      const updated = await updateReprimand(req.params.recordId, {
        record_date: String(record_date).trim(),
        record_type: String(record_type).trim(),
        order_number: order_number !== undefined ? String(order_number).trim() : "",
        note: note !== undefined ? String(note).trim() : ""
      });

      if (!updated) {
        res.status(404).json({ error: "Запис не знайдено" });
        return;
      }

      const employeeName = buildFullName(employee);
      await addLog("UPDATE", req.params.id, employeeName, "reprimand", req.params.recordId, req.params.recordId, `Оновлено запис: ${updated.record_type}`);

      res.json({ reprimand: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE single reprimand for employee
  app.delete("/api/employees/:id/reprimands/:recordId", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      // Load reprimands to verify ownership before deletion
      const allReprimands = await loadReprimands();
      const record = allReprimands.find(r => r.record_id === req.params.recordId);
      if (!record) {
        res.status(404).json({ error: "Запис не знайдено" });
        return;
      }
      if (record.employee_id !== req.params.id) {
        res.status(403).json({ error: "Запис не належить цьому співробітнику" });
        return;
      }

      const deleted = await deleteReprimand(req.params.recordId);
      if (!deleted) {
        res.status(404).json({ error: "Запис не знайдено" });
        return;
      }

      const employeeName = buildFullName(employee);
      await addLog("DELETE", req.params.id, employeeName, "reprimand", req.params.recordId, "", `Видалено запис: ${record.record_type}`);

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE employee (hard delete + physical file cleanup)
  app.delete("/api/employees/:id", async (req, res) => {
    try {
      // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
      let deletedEmployee;
      await withEmployeeLock(async (employees) => {
        deletedEmployee = findById(employees, 'employee_id', req.params.id);
        const nextEmployees = employees.filter((item) => item.employee_id !== req.params.id);

        if (nextEmployees.length === employees.length) {
          throw Object.assign(new Error("Співробітник не знайдено"), { statusCode: 404 });
        }

        return nextEmployees;
      });

      // Логирование удаления
      if (deletedEmployee) {
        const employeeName = buildFullName(deletedEmployee);
        await addLog("DELETE", req.params.id, employeeName, "", "", "", "Співробітник видалено");
      }

      // Удаляем директорию с файлами сотрудника с защитой от path traversal
      const employeeDir = path.join(FILES_DIR, `employee_${req.params.id}`);
      if (validatePath(employeeDir, FILES_DIR)) {
        await fsPromises.rm(employeeDir, { recursive: true, force: true }).catch(() => {});
      }

      // Clean up status history entries for deleted employee
      await removeStatusHistoryForEmployee(req.params.id).catch(err => {
        console.error('Failed to clean up status history:', err);
      });

      // Clean up reprimand records for deleted employee
      await removeReprimandsForEmployee(req.params.id).catch(err => {
        console.error('Failed to clean up reprimands:', err);
      });

      res.status(204).end();
    } catch (err) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
