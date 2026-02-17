import { parse } from "csv-parse/sync";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import {
  DATA_DIR,
  FILES_DIR,
  withEmployeeLock,
  addLog,
  formatFieldNameWithLabel,
  ROOT_DIR,
  getEmployeeColumnsSync,
  getDocumentFieldsSync
} from "../store.js";
import { mergeRow, normalizeRows } from "../csv.js";
import { getNextId, openFolder } from "../utils.js";

export function registerEmployeeFileRoutes(app, importUpload, employeeFileUpload, photoUpload) {
  // Upload file for employee document field
  app.post("/api/employees/:id/files", (req, res, next) => {
    employeeFileUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  }, async (req, res) => {
    // Track the current location of the uploaded file for cleanup on error.
    // Starts as multer's temp path; updated to targetPath after successful rename.
    let uploadedFilePath = req.file ? req.file.path : null;
    let saveDone = false;
    try {
      if (!req.file) {
        res.status(400).json({ error: "Файл обов'язковий" });
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

      try {
        await fsPromises.rename(req.file.path, targetPath);
        uploadedFilePath = targetPath;
      } catch (renameErr) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        res.status(500).json({ error: "Ошибка сохранения файла" });
        return;
      }

      const relativePath = path
        .relative(ROOT_DIR, targetPath)
        .split(path.sep)
        .join("/");

      // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
      let oldFilePath;
      let oldFileIsSameAsTarget = false;
      let employeeName;
      await withEmployeeLock(async (employees) => {
        const index = employees.findIndex((item) => item.employee_id === req.params.id);

        if (index === -1) {
          throw Object.assign(new Error("Співробітник не знайдено"), { statusCode: 404 });
        }

        // Запоминаем старый путь (для удаления orphaned файла после сохранения)
        oldFilePath = employees[index][fileField];

        // Проверяем, совпадает ли старый файл с целевым путём
        // На case-insensitive FS (macOS/Windows) сравниваем без учёта регистра, на Linux — точное совпадение
        if (oldFilePath) {
          const oldFullPath = path.resolve(ROOT_DIR, oldFilePath);
          if (process.platform === 'linux') {
            oldFileIsSameAsTarget = oldFullPath === targetPath;
          } else {
            oldFileIsSameAsTarget = oldFullPath.toLowerCase() === targetPath.toLowerCase();
          }
        }

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

        employeeName = [updated.last_name, updated.first_name, updated.middle_name]
          .filter(Boolean)
          .join(" ");

        return employees;
      });
      saveDone = true;

      // Удаляем старый файл после успешного сохранения CSV (предотвращаем orphaned files при смене расширения)
      // Пропускаем если старый путь совпадает с новым (case-insensitive — файл уже перезаписан rename)
      if (oldFilePath && !oldFileIsSameAsTarget) {
        const oldFullPath = path.resolve(ROOT_DIR, oldFilePath);
        if (oldFullPath.startsWith(FILES_DIR + path.sep)) {
          await fsPromises.unlink(oldFullPath).catch(() => {});
        }
      }

      // Логирование загрузки файла (non-critical, don't fail the request)
      try {
        const formattedFieldName = await formatFieldNameWithLabel(fileField);
        await addLog("UPDATE", req.params.id, employeeName, formattedFieldName, oldFilePath || "", relativePath, `Завантажено документ: ${formattedFieldName}`);
      } catch (logErr) {
        console.error("Failed to log file upload:", logErr);
      }

      res.json({ path: relativePath });
    } catch (err) {
      // Only clean up the uploaded file if CSV save hasn't completed yet.
      // After save, CSV references this file — deleting it would leave a broken reference.
      if (!saveDone && uploadedFilePath) {
        await fsPromises.unlink(uploadedFilePath).catch(() => {});
      }
      if (err.statusCode === 404) {
        res.status(404).json({ error: err.message });
        return;
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

      // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
      let filePath;
      let employeeName;
      await withEmployeeLock(async (employees) => {
        const index = employees.findIndex((item) => item.employee_id === id);

        if (index === -1) {
          throw Object.assign(new Error("Співробітник не знайдено"), { statusCode: 404 });
        }

        const employee = employees[index];
        filePath = employee[fieldName];

        if (!filePath) {
          throw Object.assign(new Error("Файл не найден"), { statusCode: 404 });
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

        employeeName = [employee.last_name, employee.first_name, employee.middle_name]
          .filter(Boolean)
          .join(" ");

        return employees;
      });

      // Удаляем физический файл после успешного сохранения CSV (только если путь внутри FILES_DIR)
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

      // Логирование удаления
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
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
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
    let saveDone = false;
    let oldPhoto = null;
    try {
      if (!req.file) {
        res.status(400).json({ error: "Файл фото обов'язковий" });
        return;
      }

      const relativePath = path
        .relative(ROOT_DIR, req.file.path)
        .split(path.sep)
        .join("/");

      // Use withEmployeeLock to wrap the entire read-modify-write cycle,
      // preventing lost updates from concurrent requests
      let employeeName;
      await withEmployeeLock(async (employees) => {
        const index = employees.findIndex((item) => item.employee_id === req.params.id);

        if (index === -1) {
          throw Object.assign(new Error("Співробітник не знайдено"), { statusCode: 404, cleanupDir: true });
        }

        const employee = employees[index];
        oldPhoto = employee.photo;

        const updated = mergeRow(getEmployeeColumnsSync(), employee, { photo: relativePath });
        updated.employee_id = req.params.id;
        employees[index] = updated;

        employeeName = [employee.last_name, employee.first_name, employee.middle_name]
          .filter(Boolean)
          .join(" ");

        return employees;
      });
      saveDone = true;

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

      // Log photo upload (non-critical, don't fail the request)
      try {
        await addLog("UPDATE", req.params.id, employeeName, "Фото (photo)", oldPhoto || "", relativePath, "Завантажено фото співробітника");
      } catch (logErr) {
        console.error("Failed to log photo upload:", logErr);
      }

      res.json({ path: relativePath });
    } catch (err) {
      if (err.statusCode === 404) {
        await fsPromises.unlink(req.file.path).catch(() => {});
        if (err.cleanupDir) {
          const dir = path.dirname(req.file.path);
          await fsPromises.rmdir(dir).catch(() => {});
        }
        res.status(404).json({ error: err.message });
        return;
      }
      // Only clean up uploaded file if save hasn't completed yet
      // Skip cleanup if new file overwrote the old photo (same extension re-upload) —
      // deleting would leave CSV referencing a non-existent file
      if (!saveDone && req.file && req.file.path) {
        let isOverwrite = false;
        if (oldPhoto) {
          const oldFullPath = path.resolve(ROOT_DIR, oldPhoto);
          const newFullPath = path.resolve(req.file.path);
          isOverwrite = process.platform === 'linux'
            ? oldFullPath === newFullPath
            : oldFullPath.toLowerCase() === newFullPath.toLowerCase();
        }
        if (!isOverwrite) {
          await fsPromises.unlink(req.file.path).catch(() => {});
        }
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete employee photo
  app.delete("/api/employees/:id/photo", async (req, res) => {
    try {
      const { id } = req.params;

      // Use withEmployeeLock to wrap the entire read-modify-write cycle,
      // preventing lost updates from concurrent requests
      let photoPath;
      let employeeName;
      await withEmployeeLock(async (employees) => {
        const index = employees.findIndex((item) => item.employee_id === id);

        if (index === -1) {
          throw Object.assign(new Error("Співробітник не знайдено"), { statusCode: 404 });
        }

        const employee = employees[index];
        photoPath = employee.photo;

        if (!photoPath) {
          throw Object.assign(new Error("Фото не знайдено"), { statusCode: 404 });
        }

        // Clear photo field in DB
        const updated = mergeRow(getEmployeeColumnsSync(), employee, { photo: "" });
        updated.employee_id = id;
        employees[index] = updated;

        employeeName = [employee.last_name, employee.first_name, employee.middle_name]
          .filter(Boolean)
          .join(" ");

        return employees;
      });

      // Delete physical file after successful DB save
      const fullPath = path.resolve(ROOT_DIR, photoPath);
      if (fullPath.startsWith(path.resolve(FILES_DIR) + path.sep)) {
        await fsPromises.unlink(fullPath).catch(() => {});
      }

      // Log photo deletion (non-critical, don't fail the request)
      try {
        await addLog("UPDATE", id, employeeName, "Фото (photo)", photoPath, "", "Видалено фото співробітника");
      } catch (logErr) {
        console.error("Failed to log photo deletion:", logErr);
      }

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

    const errors = [];
    const maxErrors = 50;
    let added = 0;
    let skipped = 0;
    let newEmployees = [];

    // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
    await withEmployeeLock(async (employees) => {
      const existingIds = new Set(employees.map((item) => item.employee_id));
      const nextEmployees = [...employees];

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

      newEmployees = nextEmployees.slice(employees.length);
      return nextEmployees;
    });

    // Логирование импортированных сотрудников
    for (const employee of newEmployees) {
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
