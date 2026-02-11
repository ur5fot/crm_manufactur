import express from "express";
import cors from "cors";
import multer from "multer";
import { parse } from "csv-parse/sync";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { execFile } from "child_process";
import {
  ensureDataDirs,
  DATA_DIR,
  FILES_DIR,
  loadEmployees,
  saveEmployees,
  loadLogs,
  addLog,
  addLogs,
  loadFieldsSchema,
  formatFieldNameWithLabel,
  getDashboardStats,
  getDashboardEvents,
  getDocumentExpiryEvents,
  getDocumentOverdueEvents,
  getStatusReport,
  exportEmployees,
  ROOT_DIR,
  initializeEmployeeColumns,
  getEmployeeColumnsSync,
  getDocumentFieldsSync,
  getBirthdayEvents,
  getRetirementEvents,
  loadConfig,
  loadTemplates,
  saveTemplates
} from "./store.js";
import { mergeRow, normalizeRows } from "./csv.js";

const app = express();
const port = process.env.PORT || 3000;

await ensureDataDirs();
await initializeEmployeeColumns();

// Load configuration with fallback
let appConfig;
try {
  appConfig = await loadConfig();
  console.log(`Max file upload size: ${appConfig.max_file_upload_mb || 10}MB`);
} catch (err) {
  console.error('Failed to load config.csv, using default values:', err.message);
  appConfig = {
    max_file_upload_mb: 10,
    retirement_age_years: 60,
    max_log_entries: 1000,
    max_report_preview_rows: 100
  };
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/files", express.static(FILES_DIR));
// SECURITY: DATA_DIR static serving removed - sensitive CSV files should not be publicly accessible
// app.use("/data", express.static(DATA_DIR));

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(appConfig.max_file_upload_mb || 10) * 1024 * 1024 }
});

function getOpenCommand() {
  if (process.platform === "darwin") {
    return "open";
  }
  if (process.platform === "win32") {
    return "explorer";
  }
  return "xdg-open";
}

function openFolder(targetPath) {
  // SECURITY: Validate path is within allowed directories to prevent command injection
  const resolvedPath = path.resolve(targetPath);
  const allowedDirs = [path.resolve(FILES_DIR), path.resolve(DATA_DIR)];

  if (!allowedDirs.some(dir => resolvedPath.startsWith(dir + path.sep) || resolvedPath === dir)) {
    throw new Error('Path outside allowed directories');
  }

  const command = getOpenCommand();
  return new Promise((resolve, reject) => {
    execFile(command, [resolvedPath], (error) => {
      if (error) {
        // Graceful degradation: в headless окружении команда может провалиться
        // но это не критическая ошибка - папка создана, API должен вернуть успех
        console.warn(`Could not open folder in file manager (expected in headless environments): ${error.message}`);
        resolve();
        return;
      }
      resolve();
    });
  });
}

function getNextId(items, idField) {
  if (items.length === 0) {
    return "1";
  }
  const ids = items
    .map((item) => parseInt(item[idField], 10))
    .filter((id) => !isNaN(id));
  if (ids.length === 0) {
    return "1";
  }
  const maxId = Math.max(...ids);
  return String(maxId + 1);
}

function normalizeEmployeeInput(payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  return normalizeRows(getEmployeeColumnsSync(), [input])[0];
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/dashboard/stats", async (_req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/events", async (_req, res) => {
  try {
    const events = await getDashboardEvents();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/document-expiry", async (_req, res) => {
  try {
    const events = await getDocumentExpiryEvents();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/document-overdue", async (_req, res) => {
  try {
    const events = await getDocumentOverdueEvents();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/birthday-events", async (_req, res) => {
  try {
    const events = await getBirthdayEvents();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/retirement-events", async (_req, res) => {
  try {
    const config = await loadConfig();
    const retirementAge = parseInt(config.retirement_age_years || 60, 10);
    const events = await getRetirementEvents(retirementAge);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/config", async (_req, res) => {
  try {
    const config = await loadConfig();
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/statuses", async (req, res) => {
  const type = req.query.type;
  if (type !== 'current' && type !== 'month') {
    res.status(400).json({ error: 'Query parameter "type" must be "current" or "month"' });
    return;
  }
  try {
    const report = await getStatusReport(type);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/custom", async (req, res) => {
  try {
    let filters = [];
    let columns = null;

    if (req.query.filters) {
      try {
        filters = JSON.parse(req.query.filters);
      } catch (err) {
        console.error('Invalid filters JSON:', err);
        res.status(400).json({ error: 'Invalid filters JSON' });
        return;
      }
    }

    if (req.query.columns) {
      try {
        columns = JSON.parse(req.query.columns);
      } catch (err) {
        console.error('Invalid columns JSON:', err);
        res.status(400).json({ error: 'Invalid columns JSON' });
        return;
      }
    }

    const { getCustomReport } = await import('./store.js');
    const results = await getCustomReport(filters, columns);
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/export", async (req, res) => {
  try {
    let filters = {};
    if (req.query.filters) {
      try {
        filters = JSON.parse(req.query.filters);
      } catch (err) {
        console.error('Invalid filters JSON:', err);
        res.status(400).json({ error: 'Invalid filters JSON' });
        return;
      }
    }
    const searchTerm = req.query.search || '';
    const csvString = await exportEmployees(filters, searchTerm);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="employees_export.csv"');
    res.send(csvString);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/fields-schema", async (_req, res) => {
  let schema;
  try {
    schema = await loadFieldsSchema();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
    return;
  }

  // Группируем поля по группам
  const groups = {};
  const tableFields = [];
  const allFields = [];

  schema.forEach((field) => {
    const fieldData = {
      order: parseInt(field.field_order, 10),
      key: field.field_name,
      label: field.field_label,
      type: field.field_type,
      options: field.field_options ? field.field_options.split('|') : [],
      group: field.field_group,
      showInTable: field.show_in_table === 'yes',
      editableInTable: field.editable_in_table === 'yes'
    };

    allFields.push(fieldData);

    // Группировка для карточек
    if (!groups[field.field_group]) {
      groups[field.field_group] = [];
    }
    groups[field.field_group].push(fieldData);

    // Поля для сводной таблицы
    if (field.show_in_table === 'yes') {
      tableFields.push(fieldData);
    }
  });

  res.json({
    groups,
    tableFields,
    allFields
  });
});

app.get("/api/logs", async (req, res) => {
  try {
    const logs = await loadLogs();
    // Сортировка по убыванию (новые сначала)
    logs.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;
    });
    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/open-data-folder", async (req, res) => {
  try {
    await openFolder(DATA_DIR);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Не удалось открыть папку data" });
  }
});

app.post("/api/employees/:id/open-folder", async (req, res) => {
  try {
    const employeeId = req.params.id;
    const employeeFolder = path.join(FILES_DIR, `employee_${employeeId}`);

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

// API endpoint for downloading CSV import template
app.get("/api/download/import-template", async (req, res) => {
  try {
    const templatePath = path.join(DATA_DIR, "employees_import_sample.csv");
    res.download(templatePath, "employees_import_sample.csv");
  } catch (error) {
    res.status(500).json({ error: "Не удалось загрузить шаблон CSV" });
  }
});

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

    // Очищаем файловые поля — файлы загружаются только через upload endpoint
    for (const docField of getDocumentFieldsSync()) {
      normalized[docField] = "";
    }

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
    const updates = { ...payload };
    for (const docField of getDocumentFieldsSync()) {
      delete updates[docField];
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

    // Удаляем директорию с файлами сотрудника
    const employeeDir = path.join(FILES_DIR, `employee_${req.params.id}`);
    await fsPromises.rm(employeeDir, { recursive: true, force: true }).catch(() => {});

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const employeeId = req.params.id;
    const targetDir = path.join(FILES_DIR, `employee_${employeeId}`);
    fs.mkdir(targetDir, { recursive: true }, (error) => {
      cb(error, targetDir);
    });
  },
  filename: (req, file, cb) => {
    // Используем временное имя, потому что req.body еще не доступен
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    const tempName = `temp_${Date.now()}${ext}`;
    cb(null, tempName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(appConfig.max_file_upload_mb || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Дозволені лише файли PDF та зображення (jpg, png, gif, webp)"));
    }
  }
});

app.post("/api/employees/:id/files", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Файл обязателен" });
      return;
    }

    const employees = await loadEmployees();
    const index = employees.findIndex((item) => item.employee_id === req.params.id);

    if (index === -1) {
      // Удаляем временный файл
      await fsPromises.unlink(req.file.path).catch(() => {});
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }

    const fileField = String(req.body.file_field || "");
    if (!getDocumentFieldsSync().includes(fileField)) {
      // Удаляем временный файл
      await fsPromises.unlink(req.file.path).catch(() => {});
      res.status(400).json({ error: "Неверное поле документа" });
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

app.delete("/api/employees/:id/files/:fieldName", async (req, res) => {
  try {
    const { id, fieldName } = req.params;

    // Проверка что поле является документом
    if (!getDocumentFieldsSync().includes(fieldName)) {
      res.status(400).json({ error: "Неверное поле документа" });
      return;
    }

    const employees = await loadEmployees();
    const index = employees.findIndex((item) => item.employee_id === id);

    if (index === -1) {
      res.status(404).json({ error: "Сотрудник не найден" });
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

// Templates CRUD API
app.get("/api/templates", async (req, res) => {
  try {
    const templates = await loadTemplates();
    // Return only active templates
    const activeTemplates = templates.filter((t) => t.active !== 'no');
    res.json({ templates: activeTemplates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/templates/:id", async (req, res) => {
  try {
    const templates = await loadTemplates();
    const template = templates.find((t) => t.template_id === req.params.id);
    if (!template) {
      res.status(404).json({ error: "Шаблон не найден" });
      return;
    }
    res.json({ template });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/templates", async (req, res) => {
  try {
    const payload = req.body || {};
    const templates = await loadTemplates();

    // Validation
    if (!payload.template_name || !payload.template_name.trim()) {
      res.status(400).json({ error: "Назва шаблону обов'язкова" });
      return;
    }
    if (!payload.template_type || !payload.template_type.trim()) {
      res.status(400).json({ error: "Тип шаблону обов'язковий" });
      return;
    }

    const templateId = getNextId(templates, "template_id");

    const newTemplate = {
      template_id: templateId,
      template_name: payload.template_name || '',
      template_type: payload.template_type || '',
      docx_filename: '',
      placeholder_fields: '',
      description: payload.description || '',
      created_date: new Date().toISOString().split('T')[0],
      active: 'yes'
    };

    templates.push(newTemplate);
    await saveTemplates(templates);

    await addLog(
      "CREATE_TEMPLATE",
      templateId,
      payload.template_name,
      "",
      "",
      "",
      `Створено шаблон: ${payload.template_name}`
    );

    res.status(201).json({ template_id: templateId, template: newTemplate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/templates/:id", async (req, res) => {
  try {
    const payload = req.body || {};
    const templates = await loadTemplates();
    const index = templates.findIndex((t) => t.template_id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: "Шаблон не найден" });
      return;
    }

    // Validation
    if (!payload.template_name || !payload.template_name.trim()) {
      res.status(400).json({ error: "Назва шаблону обов'язкова" });
      return;
    }
    if (!payload.template_type || !payload.template_type.trim()) {
      res.status(400).json({ error: "Тип шаблону обов'язковий" });
      return;
    }

    const oldTemplate = templates[index];

    templates[index] = {
      ...oldTemplate,
      template_name: payload.template_name || oldTemplate.template_name,
      template_type: payload.template_type || oldTemplate.template_type,
      description: payload.description !== undefined ? payload.description : oldTemplate.description,
      // Don't allow manual changes to docx_filename, placeholder_fields, active
    };

    await saveTemplates(templates);

    await addLog(
      "UPDATE_TEMPLATE",
      req.params.id,
      payload.template_name,
      "",
      "",
      "",
      `Оновлено шаблон: ${payload.template_name}`
    );

    res.json({ template: templates[index] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/templates/:id", async (req, res) => {
  try {
    const templates = await loadTemplates();
    const index = templates.findIndex((t) => t.template_id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: "Шаблон не найден" });
      return;
    }

    // Soft delete: set active='no'
    templates[index].active = 'no';
    await saveTemplates(templates);

    await addLog(
      "DELETE_TEMPLATE",
      req.params.id,
      templates[index].template_name,
      "",
      "",
      "",
      `Видалено шаблон: ${templates[index].template_name}`
    );

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`CRM server running on http://localhost:${port}`);
});
