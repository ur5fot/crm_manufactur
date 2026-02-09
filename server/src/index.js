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
  loadFieldsSchema,
  getDashboardStats,
  getDashboardEvents,
  getDocumentExpiryEvents,
  getStatusReport,
  exportEmployees,
  ROOT_DIR,
  initializeEmployeeColumns,
  getEmployeeColumnsSync,
  getDocumentFieldsSync
} from "./store.js";
import { mergeRow, normalizeRows } from "./csv.js";

const app = express();
const port = process.env.PORT || 3000;

await ensureDataDirs();
await initializeEmployeeColumns();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/files", express.static(FILES_DIR));
app.use("/data", express.static(DATA_DIR));

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
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
  const command = getOpenCommand();
  return new Promise((resolve, reject) => {
    execFile(command, [targetPath], (error) => {
      if (error) {
        reject(error);
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

app.get("/api/export", async (req, res) => {
  try {
    let filters = {};
    if (req.query.filters) {
      try {
        filters = JSON.parse(req.query.filters);
      } catch {
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

    await openFolder(employeeFolder);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Не удалось открыть папку сотрудника" });
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

    normalized.employee_id = employeeId;
    existingIds.add(employeeId);
    nextEmployees.push(normalized);
    added += 1;
  });

  await saveEmployees(nextEmployees);

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
  const payload = req.body || {};
  const employees = await loadEmployees();

  const baseEmployee = normalizeEmployeeInput(payload);

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
});

app.put("/api/employees/:id", async (req, res) => {
  const payload = req.body || {};
  const employees = await loadEmployees();
  const index = employees.findIndex((item) => item.employee_id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: "Сотрудник не найден" });
    return;
  }

  const updates = payload;
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

  // Логируем каждое изменение
  for (const field of changedFields) {
    await addLog(
      "UPDATE",
      req.params.id,
      employeeName,
      field,
      current[field] || "",
      next[field] || "",
      `Изменено поле: ${field}`
    );
  }

  res.json({ employee: next });
});

app.delete("/api/employees/:id", async (req, res) => {
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

  res.status(204).end();
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
  limits: { fileSize: 10 * 1024 * 1024 },
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

  // Удаляем старый файл если он существует (предотвращаем orphaned files при смене расширения)
  const oldFilePath = employees[index][fileField];
  if (oldFilePath) {
    const oldFullPath = path.join(ROOT_DIR, oldFilePath);
    await fsPromises.unlink(oldFullPath).catch(() => {});
  }

  // Переименовываем файл с правильным именем
  const targetFileName = fileField
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase() + path.extname(req.file.originalname || ".pdf");
  const targetPath = path.join(path.dirname(req.file.path), targetFileName);

  await fsPromises.rename(req.file.path, targetPath);

  const relativePath = path
    .relative(ROOT_DIR, targetPath)
    .split(path.sep)
    .join("/");

  // Сохраняем файл и даты (issue_date, expiry_date)
  const updateData = { [fileField]: relativePath };
  const issueDate = String(req.body.issue_date || "").trim();
  const expiryDate = String(req.body.expiry_date || "").trim();
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
  await saveEmployees(employees);

  res.json({ path: relativePath });
});

app.delete("/api/employees/:id/files/:fieldName", async (req, res) => {
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

  // Удаляем физический файл
  const fullPath = path.join(ROOT_DIR, filePath);
  try {
    await fs.promises.unlink(fullPath);
  } catch (error) {
    console.error("Failed to delete file:", error);
    // Продолжаем даже если файл не удалось удалить
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
  await addLog(
    "UPDATE",
    id,
    employeeName,
    fieldName,
    filePath,
    "",
    `Удален документ: ${fieldName}`
  );

  res.status(204).end();
});

app.listen(port, () => {
  console.log(`CRM server running on http://localhost:${port}`);
});
