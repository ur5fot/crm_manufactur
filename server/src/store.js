import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { readCsv, writeCsv } from "./csv.js";
import { DICTIONARY_COLUMNS, EMPLOYEE_COLUMNS, LOG_COLUMNS, FIELD_SCHEMA_COLUMNS } from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const FILES_DIR = path.join(ROOT_DIR, "files");

const EMPLOYEES_PATH = path.join(DATA_DIR, "employees.csv");
const DICTIONARIES_PATH = path.join(DATA_DIR, "dictionaries.csv");
const LOGS_PATH = path.join(DATA_DIR, "logs.csv");
const FIELD_SCHEMA_PATH = path.join(DATA_DIR, "fields_schema.csv");

export async function ensureDataDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(FILES_DIR, { recursive: true });
}

export async function loadEmployees() {
  return readCsv(EMPLOYEES_PATH, EMPLOYEE_COLUMNS);
}

export async function saveEmployees(rows) {
  return writeCsv(EMPLOYEES_PATH, EMPLOYEE_COLUMNS, rows);
}

export async function loadDictionaries() {
  return readCsv(DICTIONARIES_PATH, DICTIONARY_COLUMNS);
}

export async function saveDictionaries(rows) {
  return writeCsv(DICTIONARIES_PATH, DICTIONARY_COLUMNS, rows);
}

export async function loadFieldsSchema() {
  return readCsv(FIELD_SCHEMA_PATH, FIELD_SCHEMA_COLUMNS);
}

export async function saveFieldsSchema(rows) {
  return writeCsv(FIELD_SCHEMA_PATH, FIELD_SCHEMA_COLUMNS, rows);
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
