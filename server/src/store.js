import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { readCsv, writeCsv } from "./csv.js";
import { EMPLOYEE_COLUMNS, LOG_COLUMNS, FIELD_SCHEMA_COLUMNS, loadEmployeeColumns, getCachedEmployeeColumns, loadDocumentFields, getCachedDocumentFields } from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const FILES_DIR = path.join(ROOT_DIR, "files");

const EMPLOYEES_PATH = path.join(DATA_DIR, "employees.csv");
const LOGS_PATH = path.join(DATA_DIR, "logs.csv");
const FIELD_SCHEMA_PATH = path.join(DATA_DIR, "fields_schema.csv");

export async function ensureDataDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(FILES_DIR, { recursive: true });
}

/**
 * Инициализирует колонки из fields_schema.csv при старте сервера
 * Должна быть вызвана один раз при запуске
 */
export async function initializeEmployeeColumns() {
  console.log("Инициализация колонок из fields_schema.csv...");
  const columns = await getEmployeeColumns();
  console.log(`Инициализировано ${columns.length} колонок для employees.csv`);

  console.log("Инициализация полей документов из fields_schema.csv...");
  const documentFields = await getDocumentFields();
  console.log(`Инициализировано ${documentFields.length} полей документов`);

  return columns;
}

/**
 * Возвращает текущий список колонок (должен быть вызван после инициализации)
 * Используется в синхронных функциях где нельзя использовать await
 */
export function getEmployeeColumnsSync() {
  return getCachedEmployeeColumns();
}

/**
 * Возвращает текущий список полей документов (должен быть вызван после инициализации)
 * Используется в синхронных функциях где нельзя использовать await
 */
export function getDocumentFieldsSync() {
  return getCachedDocumentFields();
}

export async function loadEmployees() {
  const columns = await getEmployeeColumns();
  return readCsv(EMPLOYEES_PATH, columns);
}

export async function saveEmployees(rows) {
  const columns = await getEmployeeColumns();
  return writeCsv(EMPLOYEES_PATH, columns, rows);
}

export async function loadFieldsSchema() {
  return readCsv(FIELD_SCHEMA_PATH, FIELD_SCHEMA_COLUMNS);
}

export async function saveFieldsSchema(rows) {
  return writeCsv(FIELD_SCHEMA_PATH, FIELD_SCHEMA_COLUMNS, rows);
}

/**
 * Получает список колонок для employees.csv из fields_schema.csv
 * @returns {Promise<string[]>}
 */
async function getEmployeeColumns() {
  return loadEmployeeColumns(loadFieldsSchema);
}

/**
 * Получает список полей документов из fields_schema.csv
 * @returns {Promise<string[]>}
 */
async function getDocumentFields() {
  return loadDocumentFields(loadFieldsSchema);
}

export async function loadLogs() {
  return readCsv(LOGS_PATH, LOG_COLUMNS);
}

export async function saveLogs(rows) {
  return writeCsv(LOGS_PATH, LOG_COLUMNS, rows);
}

export async function addLog(action, employeeId, employeeName, fieldName = "", oldValue = "", newValue = "", details = "") {
  const logs = await loadLogs();
  const maxId = logs.reduce((max, log) => {
    const id = parseInt(log.log_id, 10);
    return isNaN(id) ? max : Math.max(max, id);
  }, 0);

  const newLog = {
    log_id: String(maxId + 1),
    timestamp: new Date().toISOString(),
    action,
    employee_id: employeeId || "",
    employee_name: employeeName || "",
    field_name: fieldName || "",
    old_value: oldValue || "",
    new_value: newValue || "",
    details: details || ""
  };

  logs.push(newLog);
  await saveLogs(logs);
  return newLog;
}
