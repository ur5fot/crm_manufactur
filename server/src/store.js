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

  // Автоматическая миграция схемы
  await migrateEmployeesSchema(columns);

  return columns;
}

/**
 * Автоматическая миграция employees.csv при изменении схемы
 * Добавляет недостающие колонки из fields_schema.csv
 */
async function migrateEmployeesSchema(expectedColumns) {
  try {
    // Проверяем существует ли файл
    try {
      await fs.access(EMPLOYEES_PATH);
    } catch {
      console.log("employees.csv не существует, миграция не требуется");
      return;
    }

    // Читаем текущий CSV
    const fileContent = await fs.readFile(EMPLOYEES_PATH, "utf-8");
    const lines = fileContent.split("\n").filter(line => line.trim());

    if (lines.length === 0) {
      console.log("employees.csv пуст, миграция не требуется");
      return;
    }

    // Парсим заголовок
    const headerLine = lines[0];
    const currentColumns = headerLine.split(";").map(col => col.trim().replace(/^"|"$/g, ''));

    // Находим недостающие колонки
    const missingColumns = expectedColumns.filter(col => !currentColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log("✓ Схема employees.csv актуальна, миграция не требуется");
      return;
    }

    console.log(`⚠️  Обнаружены недостающие колонки в employees.csv: ${missingColumns.join(", ")}`);
    console.log("🔄 Выполняется автоматическая миграция...");

    // Загружаем данные
    const employees = await readCsv(EMPLOYEES_PATH, currentColumns);

    // Добавляем недостающие колонки с пустыми значениями
    const migratedEmployees = employees.map(emp => {
      const updated = { ...emp };
      missingColumns.forEach(col => {
        if (!(col in updated)) {
          updated[col] = "";
        }
      });
      return updated;
    });

    // Сохраняем с новой схемой
    await writeCsv(EMPLOYEES_PATH, expectedColumns, migratedEmployees);

    console.log(`✓ Миграция завершена: добавлено ${missingColumns.length} колонок`);
    console.log(`  Всего колонок: ${currentColumns.length} → ${expectedColumns.length}`);
  } catch (error) {
    console.error("❌ Ошибка миграции схемы:", error.message);
    console.error("   Продолжаем работу со старой схемой");
  }
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
