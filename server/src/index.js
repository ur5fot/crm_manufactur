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

app.get("/api/fields-schema", async (_req, res) => {
  const schema = await loadFieldsSchema();

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
  const logs = await loadLogs();
  // Сортировка по убыванию (новые сначала)
  logs.sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateB - dateA;
  });
  res.json({ logs });
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
  const employees = await loadEmployees();
  res.json({ employees });
});

app.get("/api/employees/:id", async (req, res) => {
  const employees = await loadEmployees();
  const employee = employees.find((item) => item.employee_id === req.params.id);
  if (!employee) {
    res.status(404).json({ error: "Сотрудник не найден" });
    return;
  }

  res.json({ employee });
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
    const ext = path.extname(file.originalname) || ".pdf";
    const tempName = `temp_${Date.now()}${ext}`;
    cb(null, tempName);
  }
});

const upload = multer({ storage });

app.post("/api/employees/:id/files", upload.single("file"), async (req, res) => {
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

  const updated = mergeRow(getEmployeeColumnsSync(), employees[index], {
    [fileField]: relativePath
  });
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

  // Очищаем поле в CSV
  const updated = mergeRow(getEmployeeColumnsSync(), employee, {
    [fieldName]: ""
  });
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
