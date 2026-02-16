import { parse } from "csv-parse/sync";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import {
  DATA_DIR,
  FILES_DIR,
  loadEmployees,
  saveEmployees,
  addLog,
  formatFieldNameWithLabel,
  ROOT_DIR,
  getEmployeeColumnsSync,
  getDocumentFieldsSync
} from "../store.js";
import { mergeRow, normalizeRows } from "../csv.js";
import { getNextId, normalizeEmployeeInput, openFolder } from "../utils.js";

export function registerEmployeeFileRoutes(app, importUpload, employeeFileUpload, photoUpload) {
  // Upload file for employee document field
  app.post("/api/employees/:id/files", (req, res, next) => {
    employeeFileUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Файл обов'язковий" });
        return;
      }

      const employees = await loadEmployees();
      const index = employees.findIndex((item) => item.employee_id === req.params.id);

      if (index === -1) {
        // Удаляем временный файл
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const fileField = String(req.body.file_field || "");
      if (!getDocumentFieldsSync().includes(fileField)) {
        // Удаляем временный файл
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: "Невірне поле документа" });
        return;
      }

      // Валідація формату та коректності дат до збереження файлу
      const issueDate = String(req.body.issue_date || "").trim();
      const expiryDate = String(req.body.expiry_date || "").trim();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (issueDate && !dateRegex.test(issueDate)) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: "Невірний формат дати видачі (очікується YYYY-MM-DD)" });
        return;
      }
      if (issueDate && isNaN(Date.parse(issueDate))) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: "Невірна дата видачі (неіснуюча дата)" });
        return;
      }
      // Validate calendar date for issue_date
      // Use UTC methods to avoid timezone issues with YYYY-MM-DD dates
      if (issueDate) {
        const parsed = new Date(issueDate + 'T00:00:00Z');
        const roundtrip = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
        if (roundtrip !== issueDate) {
          await fsPromises.unlink(req.file.path).catch(() => {});
          res.status(400).json({ error: `Невірна календарна дата видачі: ${issueDate}` });
          return;
        }
      }

      if (expiryDate && !dateRegex.test(expiryDate)) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: "Невірний формат дати закінчення (очікується YYYY-MM-DD)" });
        return;
      }
      if (expiryDate && isNaN(Date.parse(expiryDate))) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: "Невірна дата закінчення (неіснуюча дата)" });
        return;
      }
      // Validate calendar date for expiry_date
      // Use UTC methods to avoid timezone issues with YYYY-MM-DD dates
      if (expiryDate) {
        const parsed = new Date(expiryDate + 'T00:00:00Z');
        const roundtrip = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
        if (roundtrip !== expiryDate) {
          await fsPromises.unlink(req.file.path).catch(() => {});
          res.status(400).json({ error: `Невірна календарна дата закінчення: ${expiryDate}` });
          return;
        }
      }

      // Перевіряємо що дата закінчення не раніше дати видачі
      if (issueDate && expiryDate && expiryDate < issueDate) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: "Дата закінчення не може бути раніше дати видачі" });
        return;
      }

      // Переименовываем файл с правильным именем
      // Нормализуем расширение в lowercase для предотвращения проблем на case-insensitive FS (macOS HFS+/APFS)
      const targetFileName = fileField
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase() + path.extname(req.file.originalname || ".pdf").toLowerCase();
      const targetPath = path.join(path.dirname(req.file.path), targetFileName);

      // Запоминаем старый путь до переименования (для удаления orphaned файла после сохранения)
      const oldFilePath = employees[index][fileField];

      // Проверяем, совпадает ли старый файл с целевым путём
      // На case-insensitive FS (macOS/Windows) сравниваем без учёта регистра, на Linux — точное совпадение
      let oldFileIsSameAsTarget = false;
      if (oldFilePath) {
        const oldFullPath = path.resolve(ROOT_DIR, oldFilePath);
        if (process.platform === 'linux') {
          oldFileIsSameAsTarget = oldFullPath === targetPath;
        } else {
          oldFileIsSameAsTarget = oldFullPath.toLowerCase() === targetPath.toLowerCase();
        }
      }

      try {
        await fsPromises.rename(req.file.path, targetPath);
      } catch (renameErr) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(500).json({ error: "Ошибка сохранения файла" });
        return;
      }

      const relativePath = path
        .relative(ROOT_DIR, targetPath)
        .split(path.sep)
        .join("/");

      // Сохраняем файл и даты (issue_date, expiry_date)
      const updateData = { [fileField]: relativePath };
      const issueDateField = `${fileField}_issue_date`;
      const expiryDateField = `${fileField}_expiry_date`;
      if (getEmployeeColumnsSync().includes(issueDateField)) {
        updateData[issueDateField] = issueDate;
      }
      if (getEmployeeColumnsSync().includes(expiryDateField)) {
        updateData[expiryDateField] = expiryDate;
      }

      const updated = mergeRow(getEmployeeColumnsSync(), employees[index], updateData);
      updated.employee_id = req.params.id;
      employees[index] = updated;

      try {
        await saveEmployees(employees);
      } catch (saveErr) {
        // CSV сохранение не удалось — откатываем файл только если он не перезаписал существующий
        // Если старый и новый путь совпадают (re-upload с тем же расширением), откат невозможен —
        // файл уже перезаписан rename, перемещение в temp оставит CSV без файла
        if (!oldFileIsSameAsTarget) {
          await fsPromises.rename(targetPath, req.file.path).catch(() => {});
        }
        res.status(500).json({ error: "Ошибка сохранения данных" });
        return;
      }

      // Удаляем старый файл после успешного сохранения CSV (предотвращаем orphaned files при смене расширения)
      // Пропускаем если старый путь совпадает с новым (case-insensitive — файл уже перезаписан rename)
      if (oldFilePath && !oldFileIsSameAsTarget) {
        const oldFullPath = path.resolve(ROOT_DIR, oldFilePath);
        if (oldFullPath.startsWith(FILES_DIR + path.sep)) {
          await fsPromises.unlink(oldFullPath).catch(() => {});
        }
      }

      // Логирование загрузки файла
      const employeeName = [employees[index].last_name, employees[index].first_name, employees[index].middle_name]
        .filter(Boolean)
        .join(" ");
      const formattedFieldName = await formatFieldNameWithLabel(fileField);
      await addLog("UPDATE", req.params.id, employeeName, formattedFieldName, oldFilePath || "", relativePath, `Завантажено документ: ${formattedFieldName}`);

      res.json({ path: relativePath });
    } catch (err) {
      // Очищаем временный файл при непредвиденной ошибке
      if (req.file && req.file.path) {
        await fsPromises.unlink(req.file.path).catch(() => {});
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete employee file
  app.delete("/api/employees/:id/files/:fieldName", async (req, res) => {
    try {
      const { id, fieldName } = req.params;

      // Перевірка що поле є документом
      if (!getDocumentFieldsSync().includes(fieldName)) {
        res.status(400).json({ error: "Невірне поле документа" });
        return;
      }

      const employees = await loadEmployees();
      const index = employees.findIndex((item) => item.employee_id === id);

      if (index === -1) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const employee = employees[index];
      const filePath = employee[fieldName];

      if (!filePath) {
        res.status(404).json({ error: "Файл не найден" });
        return;
      }

      // Удаляем физический файл (только если путь внутри FILES_DIR)
      // SECURITY: Normalize paths before comparison to prevent path traversal
      const fullPath = path.resolve(ROOT_DIR, filePath);
      const normalizedFullPath = path.resolve(fullPath);
      const normalizedFilesDir = path.resolve(FILES_DIR);
      if (normalizedFullPath.startsWith(normalizedFilesDir + path.sep)) {
        try {
          await fs.promises.unlink(normalizedFullPath);
        } catch (error) {
          console.error("Failed to delete file:", error);
          // Продолжаем даже если файл не удалось удалить
        }
      }

      // Очищаем поле и companion date-колонки в CSV
      const clearData = { [fieldName]: "" };
      const columns = getEmployeeColumnsSync();
      const issueDateField = `${fieldName}_issue_date`;
      const expiryDateField = `${fieldName}_expiry_date`;
      if (columns.includes(issueDateField)) clearData[issueDateField] = "";
      if (columns.includes(expiryDateField)) clearData[expiryDateField] = "";
      const updated = mergeRow(columns, employee, clearData);
      updated.employee_id = id;
      employees[index] = updated;
      await saveEmployees(employees);

      // Логирование удаления
      const employeeName = [employee.last_name, employee.first_name, employee.middle_name]
        .filter(Boolean)
        .join(" ");
      const formattedFieldName = await formatFieldNameWithLabel(fieldName);
      await addLog(
        "UPDATE",
        id,
        employeeName,
        formattedFieldName,
        filePath,
        "",
        `Удален документ: ${formattedFieldName}`
      );

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Upload employee photo
  app.post("/api/employees/:id/photo", (req, res, next) => {
    photoUpload.single("photo")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Файл фото обов'язковий" });
        return;
      }

      const employees = await loadEmployees();
      const index = employees.findIndex((item) => item.employee_id === req.params.id);

      if (index === -1) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const employee = employees[index];
      const oldPhoto = employee.photo;

      const relativePath = path
        .relative(ROOT_DIR, req.file.path)
        .split(path.sep)
        .join("/");

      const updated = mergeRow(getEmployeeColumnsSync(), employee, { photo: relativePath });
      updated.employee_id = req.params.id;
      employees[index] = updated;

      await saveEmployees(employees);

      // Delete old photo file after successful save (if different from new one)
      if (oldPhoto) {
        const oldFullPath = path.resolve(ROOT_DIR, oldPhoto);
        const normalizedFilesDir = path.resolve(FILES_DIR);
        if (oldFullPath.startsWith(normalizedFilesDir + path.sep)) {
          const newFullPath = path.resolve(req.file.path);
          if (oldFullPath.toLowerCase() !== newFullPath.toLowerCase()) {
            await fsPromises.unlink(oldFullPath).catch(() => {});
          }
        }
      }

      // Log photo upload
      const employeeName = [employee.last_name, employee.first_name, employee.middle_name]
        .filter(Boolean)
        .join(" ");
      await addLog("UPDATE", req.params.id, employeeName, "Фото (photo)", oldPhoto || "", relativePath, "Завантажено фото співробітника");

      res.json({ path: relativePath });
    } catch (err) {
      if (req.file && req.file.path) {
        await fsPromises.unlink(req.file.path).catch(() => {});
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete employee photo
  app.delete("/api/employees/:id/photo", async (req, res) => {
    try {
      const { id } = req.params;

      const employees = await loadEmployees();
      const index = employees.findIndex((item) => item.employee_id === id);

      if (index === -1) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const employee = employees[index];
      const photoPath = employee.photo;

      if (!photoPath) {
        res.status(404).json({ error: "Фото не знайдено" });
        return;
      }

      // Delete physical file
      const fullPath = path.resolve(ROOT_DIR, photoPath);
      if (fullPath.startsWith(path.resolve(FILES_DIR) + path.sep)) {
        await fsPromises.unlink(fullPath).catch(() => {});
      }

      // Clear photo field
      const updated = mergeRow(getEmployeeColumnsSync(), employee, { photo: "" });
      updated.employee_id = id;
      employees[index] = updated;
      await saveEmployees(employees);

      // Log photo deletion
      const employeeName = [employee.last_name, employee.first_name, employee.middle_name]
        .filter(Boolean)
        .join(" ");
      await addLog("UPDATE", id, employeeName, "Фото (photo)", photoPath, "", "Видалено фото співробітника");

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Open employee folder
  app.post("/api/employees/:id/open-folder", async (req, res) => {
    try {
      const employeeId = req.params.id;
      const employeeFolder = path.join(FILES_DIR, `employee_${employeeId}`);
      const resolvedFolder = path.resolve(employeeFolder);
      const allowedDir = path.resolve(FILES_DIR);

      // Path traversal protection - validate before directory creation
      if (!resolvedFolder.startsWith(allowedDir + path.sep)) {
        res.status(403).json({ error: "Недозволений шлях до папки" });
        return;
      }

      // Создаем папку если она не существует
      await fsPromises.mkdir(employeeFolder, { recursive: true });

      // Пытаемся открыть папку (graceful degradation в headless)
      await openFolder(employeeFolder);

      res.json({ ok: true });
    } catch (error) {
      // Ошибка только если security validation провалилась
      console.error('Open folder error:', error);
      res.status(500).json({ error: "Не удалось открыть папку сотрудника" });
    }
  });

  // Import employees from CSV
  app.post("/api/employees/import", importUpload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Файл CSV не найден" });
      return;
    }

    let records;
    try {
      const content = req.file.buffer.toString("utf8");
      records = parse(content, {
        columns: true,
        delimiter: ";",
        skip_empty_lines: true,
        bom: true,
        relax_quotes: true,
        relax_column_count: true,
        trim: true
      });
    } catch (error) {
      res.status(400).json({ error: "Неверный формат CSV" });
      return;
    }

    if (!records || records.length === 0) {
      res.status(400).json({ error: "CSV не содержит данных" });
      return;
    }

    const headerColumns = Object.keys(records[0] || {});
    const hasKnownHeaders = headerColumns.some((column) => getEmployeeColumnsSync().includes(column));
    if (!hasKnownHeaders) {
      res.status(400).json({ error: "Заголовки CSV не совпадают с employees.csv" });
      return;
    }

    const employees = await loadEmployees();
    const existingIds = new Set(employees.map((item) => item.employee_id));
    const nextEmployees = [...employees];

    const errors = [];
    const maxErrors = 50;
    let added = 0;
    let skipped = 0;

    records.forEach((record, index) => {
      const normalized = normalizeRows(getEmployeeColumnsSync(), [record])[0];
      const hasAnyValue = getEmployeeColumnsSync().some((column) => String(normalized[column] || "").trim());
      if (!hasAnyValue) {
        skipped += 1;
        return;
      }

      const hasFirstName = String(normalized.first_name || "").trim();
      const hasLastName = String(normalized.last_name || "").trim();
      if (!hasFirstName || !hasLastName) {
        skipped += 1;
        if (errors.length < maxErrors) {
          errors.push({ row: index + 2, reason: "Не указаны имя и фамилия (оба поля обязательны)" });
        }
        return;
      }

      let employeeId = String(normalized.employee_id || "").trim();
      if (employeeId && existingIds.has(employeeId)) {
        skipped += 1;
        if (errors.length < maxErrors) {
          errors.push({ row: index + 2, reason: "ID уже существует" });
        }
        return;
      }

      if (!employeeId) {
        employeeId = getNextId(nextEmployees, "employee_id");
      }

      // Очищаем файловые поля и фото — файлы загружаются только через upload endpoint
      for (const docField of getDocumentFieldsSync()) {
        normalized[docField] = "";
      }
      normalized.photo = "";

      normalized.employee_id = employeeId;
      existingIds.add(employeeId);
      nextEmployees.push(normalized);
      added += 1;
    });

    await saveEmployees(nextEmployees);

    // Логирование импортированных сотрудников
    for (let i = employees.length; i < nextEmployees.length; i++) {
      const employee = nextEmployees[i];
      const employeeName = [employee.last_name, employee.first_name, employee.middle_name]
        .filter(Boolean)
        .join(" ");
      await addLog("CREATE", employee.employee_id, employeeName, "", "", "", "Створено співробітника (імпорт)");
    }

    res.json({ added, skipped, errors });
  });

  // Download CSV import template
  app.get("/api/download/import-template", async (req, res) => {
    try {
      const templatePath = path.join(DATA_DIR, "employees_import_sample.csv");
      res.download(templatePath, "employees_import_sample.csv");
    } catch (error) {
      res.status(500).json({ error: "Не удалось загрузить шаблон CSV" });
    }
  });
}
