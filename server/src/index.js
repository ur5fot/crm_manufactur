import express from "express";
import cors from "cors";
import { parse } from "csv-parse/sync";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
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
  saveTemplates,
  loadGeneratedDocuments,
  saveGeneratedDocuments,
  addGeneratedDocument
} from "./store.js";
import { mergeRow, normalizeRows } from "./csv.js";
import { extractPlaceholders, generateDocx } from "./docx-generator.js";
import { generateDeclinedNames, generateDeclinedGradePosition } from "./declension.js";
import { getOpenCommand, openFolder, getNextId, normalizeEmployeeInput } from "./utils.js";
import { createImportUpload, createEmployeeFileUpload, createTemplateUpload } from "./upload-config.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";

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

const importUpload = createImportUpload(appConfig);

// Register dashboard and config routes
registerDashboardRoutes(app);

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

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || q.trim().length < 2) {
      res.status(400).json({ error: "Параметр q обов'язковий (мінімум 2 символи)" });
      return;
    }
    if (q.trim().length > 200) {
      res.status(400).json({ error: "Пошуковий запит занадто довгий (максимум 200 символів)" });
      return;
    }

    const query = q.trim().toLowerCase();

    const [employees, templates, documents, schema] = await Promise.all([
      loadEmployees(),
      loadTemplates(),
      loadGeneratedDocuments(),
      loadFieldsSchema()
    ]);

    const activeEmployees = employees.filter(e => e.active !== 'no');
    const activeTemplates = templates.filter(t => t.active !== 'no');

    const textFieldKeys = schema.filter(f => f.field_type !== 'file').map(f => f.field_name);

    const matchedEmployees = activeEmployees.filter(emp => {
      for (const key of textFieldKeys) {
        const val = emp[key];
        if (val && String(val).toLowerCase().includes(query)) return true;
      }
      return false;
    });

    const matchedTemplates = activeTemplates.filter(t => {
      return (t.template_name && t.template_name.toLowerCase().includes(query)) ||
        (t.description && t.description.toLowerCase().includes(query));
    });

    const employeeMap = new Map(activeEmployees.map(e => [e.employee_id, e]));
    const templateMap = new Map(activeTemplates.map(t => [t.template_id, t]));

    const matchedDocuments = documents.filter(doc => {
      if (doc.docx_filename && doc.docx_filename.toLowerCase().includes(query)) return true;
      const emp = employeeMap.get(doc.employee_id);
      if (emp) {
        const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(" ");
        if (name.toLowerCase().includes(query)) return true;
      }
      const tmpl = templateMap.get(doc.template_id);
      if (tmpl && tmpl.template_name && tmpl.template_name.toLowerCase().includes(query)) return true;
      return false;
    }).map(doc => {
      const emp = employeeMap.get(doc.employee_id);
      const tmpl = templateMap.get(doc.template_id);
      return {
        document_id: doc.document_id,
        template_id: doc.template_id,
        employee_id: doc.employee_id,
        docx_filename: doc.docx_filename,
        generation_date: doc.generation_date,
        employee_name: emp ? [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(" ") : "",
        template_name: tmpl ? tmpl.template_name : ""
      };
    });

    matchedDocuments.sort((a, b) => (b.generation_date || "").localeCompare(a.generation_date || ""));

    res.json({
      employees: matchedEmployees.slice(0, 20).map(e => ({
        employee_id: e.employee_id,
        last_name: e.last_name,
        first_name: e.first_name,
        middle_name: e.middle_name,
        employment_status: e.employment_status,
        department: e.department
      })),
      templates: matchedTemplates.slice(0, 10),
      documents: matchedDocuments.slice(0, 10),
      total: {
        employees: matchedEmployees.length,
        templates: matchedTemplates.length,
        documents: matchedDocuments.length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
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

const upload = createEmployeeFileUpload(appConfig);

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

// Placeholder preview (reference page)
app.get("/api/placeholder-preview/:employeeId?", async (req, res) => {
  try {
    const schema = await loadFieldsSchema();
    const employees = await loadEmployees();
    const activeEmployees = employees.filter(e => e.active !== 'no');

    let employee;
    if (req.params.employeeId) {
      employee = activeEmployees.find(e => e.employee_id === req.params.employeeId);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }
    } else {
      employee = activeEmployees[0];
      if (!employee) {
        res.status(404).json({ error: "Немає активних співробітників" });
        return;
      }
    }

    const placeholders = [];

    // Fields from schema
    for (const field of schema) {
      placeholders.push({
        placeholder: `{${field.field_name}}`,
        label: field.field_label || field.field_name,
        value: employee[field.field_name] || '',
        group: 'fields'
      });
    }

    // Declension placeholders
    const declined = await generateDeclinedNames(employee);
    const caseLabels = {
      genitive: 'родовий',
      dative: 'давальний',
      accusative: 'знахідний',
      vocative: 'кличний',
      locative: 'місцевий',
      ablative: 'орудний'
    };
    const nameFields = {
      last_name: 'Прізвище',
      first_name: "Ім'я",
      middle_name: 'По батькові',
      full_name: 'Повне ПІБ'
    };
    for (const [suffix, caseLabel] of Object.entries(caseLabels)) {
      for (const [field, fieldLabel] of Object.entries(nameFields)) {
        const key = `${field}_${suffix}`;
        placeholders.push({
          placeholder: `{${key}}`,
          label: `${fieldLabel} (${caseLabel})`,
          value: declined[key] || '',
          group: 'declension'
        });
      }
    }

    // Grade/position declension placeholders
    const declinedGradePosition = await generateDeclinedGradePosition(employee);
    const gradePositionFields = {
      grade: 'Посада',
      position: 'Звання'
    };
    for (const [suffix, caseLabel] of Object.entries(caseLabels)) {
      for (const [field, fieldLabel] of Object.entries(gradePositionFields)) {
        const key = `${field}_${suffix}`;
        placeholders.push({
          placeholder: `{${key}}`,
          label: `${fieldLabel} (${caseLabel})`,
          value: declinedGradePosition[key] || '',
          group: 'declension_fields'
        });
      }
    }

    // Special placeholders
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    placeholders.push({
      placeholder: '{current_date}',
      label: 'Поточна дата',
      value: `${day}.${month}.${year}`,
      group: 'special'
    });
    placeholders.push({
      placeholder: '{current_datetime}',
      label: 'Поточна дата і час',
      value: `${day}.${month}.${year} ${hours}:${minutes}`,
      group: 'special'
    });

    // Case variant placeholders (_upper and _cap for all text placeholders)
    for (const p of [...placeholders]) {
      const val = typeof p.value === 'string' ? p.value : '';
      placeholders.push({
        placeholder: p.placeholder.replace('}', '_upper}'),
        label: `${p.label} (ВЕЛИКІ)`,
        value: val.length > 0 ? val.toUpperCase() : '',
        group: 'case_variants'
      });
      placeholders.push({
        placeholder: p.placeholder.replace('}', '_cap}'),
        label: `${p.label} (З великої)`,
        value: val.length > 0 ? val.charAt(0).toUpperCase() + val.slice(1) : '',
        group: 'case_variants'
      });
    }

    const employeeName = [employee.last_name, employee.first_name, employee.middle_name]
      .filter(Boolean).join(' ');

    res.json({
      employee_name: employeeName,
      employee_id: employee.employee_id,
      placeholders
    });
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

const templateUpload = createTemplateUpload(appConfig);

app.post("/api/templates/:id/upload", templateUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Файл не надано" });
      return;
    }

    const templates = await loadTemplates();
    const template = templates.find((t) => t.template_id === req.params.id);

    if (!template) {
      // Clean up uploaded file
      await fsPromises.unlink(req.file.path);
      res.status(404).json({ error: "Шаблон не найден" });
      return;
    }

    // Extract placeholders from uploaded DOCX
    const placeholders = await extractPlaceholders(req.file.path);

    // Update template record
    template.docx_filename = req.file.filename;
    template.placeholder_fields = placeholders.join(', ');
    await saveTemplates(templates);

    await addLog(
      "UPLOAD_TEMPLATE_FILE",
      req.params.id,
      template.template_name,
      "",
      "",
      "",
      `Завантажено DOCX файл для шаблону: ${template.template_name}, плейсхолдери: ${placeholders.join(', ')}`
    );

    res.json({
      filename: req.file.filename,
      placeholders: placeholders
    });
  } catch (err) {
    console.error(err);
    // Clean up file on error
    if (req.file && req.file.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('Failed to clean up file:', unlinkErr);
      }
    }
    res.status(500).json({ error: err.message });
  }
});

// Open template DOCX file in default application
app.post("/api/templates/:id/open-file", async (req, res) => {
  try {
    const templates = await loadTemplates();
    const template = templates.find((t) => t.template_id === req.params.id && t.active !== 'no');

    if (!template) {
      res.status(404).json({ error: "Шаблон не найден" });
      return;
    }

    if (!template.docx_filename) {
      res.status(400).json({ error: "Шаблон не имеет загруженного DOCX файла" });
      return;
    }

    const filePath = path.join(FILES_DIR, 'templates', template.docx_filename);
    const resolvedPath = path.resolve(filePath);
    const allowedDir = path.resolve(path.join(FILES_DIR, 'templates'));

    if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
      res.status(403).json({ error: "Недопустимый путь к файлу" });
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({ error: "Файл DOCX не найден на диске" });
      return;
    }

    const command = getOpenCommand();
    execFile(command, [resolvedPath], (error) => {
      if (error) {
        console.warn(`Could not open file (expected in headless environments): ${error.message}`);
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Re-extract placeholders from template DOCX file
app.post("/api/templates/:id/reextract", async (req, res) => {
  try {
    const templates = await loadTemplates();
    const template = templates.find((t) => t.template_id === req.params.id && t.active !== 'no');

    if (!template) {
      res.status(404).json({ error: "Шаблон не найден" });
      return;
    }

    if (!template.docx_filename) {
      res.status(400).json({ error: "Шаблон не имеет загруженного DOCX файла" });
      return;
    }

    const filePath = path.join(FILES_DIR, 'templates', template.docx_filename);
    const resolvedPath = path.resolve(filePath);
    const allowedDir = path.resolve(path.join(FILES_DIR, 'templates'));

    if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
      res.status(403).json({ error: "Недопустимый путь к файлу" });
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({ error: "Файл DOCX не найден на диске" });
      return;
    }

    const placeholders = await extractPlaceholders(resolvedPath);
    template.placeholder_fields = placeholders.join(', ');
    await saveTemplates(templates);

    res.json({ placeholders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Generate document from template
app.post("/api/templates/:id/generate", async (req, res) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      res.status(400).json({ error: "employee_id обов'язковий" });
      return;
    }

    // Load template
    const templates = await loadTemplates();
    const template = templates.find((t) => t.template_id === req.params.id);

    if (!template) {
      res.status(404).json({ error: "Шаблон не знайдено" });
      return;
    }

    // Validate template has DOCX file
    if (!template.docx_filename) {
      res.status(400).json({ error: "Шаблон не має завантаженого DOCX файлу" });
      return;
    }

    // Load employee data
    const employees = await loadEmployees();
    const employee = employees.find((e) => e.employee_id === employee_id);

    if (!employee) {
      res.status(404).json({ error: "Співробітник не знайдено" });
      return;
    }

    // Prepare data with employee fields + special placeholders
    const now = new Date();
    const currentDate = now.toLocaleDateString('uk-UA'); // DD.MM.YYYY format
    const currentDateTime = now.toLocaleString('uk-UA'); // DD.MM.YYYY HH:mm:ss format

    const data = {
      ...employee,
      current_date: currentDate,
      current_datetime: currentDateTime
    };

    // Generate DOCX filename
    const timestamp = Date.now();
    const sanitizedName = template.template_name.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
    const sanitizedLastName = (employee.last_name || '').replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
    const docxFilename = sanitizedLastName
      ? `${sanitizedName}_${sanitizedLastName}_${employee_id}_${timestamp}.docx`
      : `${sanitizedName}_${employee_id}_${timestamp}.docx`;

    // Paths with path traversal protection
    const templatePath = path.join(FILES_DIR, 'templates', template.docx_filename);
    const resolvedTemplatePath = path.resolve(templatePath);
    const allowedTemplateDir = path.resolve(FILES_DIR, 'templates');

    if (!resolvedTemplatePath.startsWith(allowedTemplateDir + path.sep)) {
      res.status(403).json({ error: "Недозволений шлях до шаблону" });
      return;
    }

    const outputPath = path.join(FILES_DIR, 'documents', docxFilename);

    // Check template file exists
    if (!fs.existsSync(templatePath)) {
      res.status(404).json({ error: "DOCX файл шаблону не знайдено на диску" });
      return;
    }

    // Call generateDocx
    await generateDocx(templatePath, data, outputPath);

    // Create record in generated_documents.csv atomically with race condition protection
    const newDocId = await addGeneratedDocument({
      template_id: template.template_id,
      employee_id: employee_id,
      docx_filename: docxFilename,
      generation_date: new Date().toISOString(),
      generated_by: 'system', // Can be enhanced with user authentication later
      data_snapshot: JSON.stringify(data)
    });

    // Add audit log
    await addLog(
      "GENERATE_DOCUMENT",
      employee_id,
      `${employee.last_name || ''} ${employee.first_name || ''}`.trim(),
      "",
      "",
      "",
      `Згенеровано документ з шаблону: ${template.template_name}, файл: ${docxFilename}`
    );

    // Return response
    res.json({
      document_id: newDocId,
      filename: docxFilename,
      download_url: `/api/documents/${newDocId}/download`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get list of generated documents with filtering and pagination
app.get("/api/documents", async (req, res) => {
  try {
    const { template_id, employee_id, start_date, end_date, offset = '0', limit = '50' } = req.query;

    // Load all data sources
    const documents = await loadGeneratedDocuments();
    const templates = await loadTemplates();
    const employees = await loadEmployees();

    // Create lookup maps for joins
    const templateMap = new Map(templates.map(t => [t.template_id, t]));
    const employeeMap = new Map(employees.map(e => [e.employee_id, e]));

    // Filter documents
    let filtered = documents.filter(doc => {
      // Filter by template_id
      if (template_id && doc.template_id !== template_id) {
        return false;
      }

      // Filter by employee_id
      if (employee_id && doc.employee_id !== employee_id) {
        return false;
      }

      // Filter by date range
      if (start_date || end_date) {
        const docDate = new Date(doc.generation_date);

        if (start_date) {
          const startDateObj = new Date(start_date);
          if (docDate < startDateObj) {
            return false;
          }
        }

        if (end_date) {
          const endDateObj = new Date(end_date);
          // End date should include the whole day
          endDateObj.setHours(23, 59, 59, 999);
          if (docDate > endDateObj) {
            return false;
          }
        }
      }

      return true;
    });

    // Sort by generation_date DESC (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.generation_date);
      const dateB = new Date(b.generation_date);
      return dateB - dateA;
    });

    // Get total count before pagination
    const total = filtered.length;

    // Apply pagination with validation to prevent DoS
    const offsetNum = parseInt(offset, 10) || 0;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 1000);

    if (offsetNum < 0 || isNaN(offsetNum)) {
      res.status(400).json({ error: 'Invalid offset parameter' });
      return;
    }

    const paginated = filtered.slice(offsetNum, offsetNum + limitNum);

    // Join with templates and employees to enrich data
    const enriched = paginated.map(doc => {
      const template = templateMap.get(doc.template_id);
      const employee = employeeMap.get(doc.employee_id);

      return {
        document_id: doc.document_id,
        template_id: doc.template_id,
        template_name: template ? template.template_name : 'Unknown Template',
        employee_id: doc.employee_id,
        employee_name: employee
          ? `${employee.last_name || ''} ${employee.first_name || ''} ${employee.middle_name || ''}`.trim()
          : 'Unknown Employee',
        docx_filename: doc.docx_filename,
        generation_date: doc.generation_date,
        generated_by: doc.generated_by
      };
    });

    res.json({
      documents: enriched,
      total,
      offset: offsetNum,
      limit: limitNum
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Download generated document
app.get("/api/documents/:id/download", async (req, res) => {
  try {
    // Load document from generated_documents.csv
    const documents = await loadGeneratedDocuments();
    const document = documents.find((d) => d.document_id === req.params.id);

    if (!document) {
      res.status(404).json({ error: "Документ не знайдено" });
      return;
    }

    // SECURITY: Sanitize filename from database before using in path
    // Prevents path traversal if CSV is manually edited with malicious filename
    const sanitizedFilename = document.docx_filename.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ._-]/g, '_');

    // Validate file exists and prevent path traversal
    const filePath = path.join(FILES_DIR, 'documents', sanitizedFilename);
    const resolvedPath = path.resolve(filePath);
    const allowedDir = path.resolve(FILES_DIR, 'documents');

    if (!resolvedPath.startsWith(allowedDir + path.sep)) {
      res.status(403).json({ error: "Недозволений шлях до файлу" });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Файл документу не знайдено на диску" });
      return;
    }

    // Send file with proper headers (sanitize filename for security)
    const safeFilename = path.basename(document.docx_filename);
    res.download(filePath, safeFilename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Помилка завантаження файлу" });
        }
      }
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.listen(port, () => {
  console.log(`CRM server running on http://localhost:${port}`);
});
