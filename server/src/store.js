import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { readCsv, writeCsv } from "./csv.js";
import { EMPLOYEE_COLUMNS, LOG_COLUMNS, FIELD_SCHEMA_COLUMNS, STATUS_HISTORY_COLUMNS, REPRIMAND_COLUMNS, STATUS_EVENT_COLUMNS, loadEmployeeColumns, getCachedEmployeeColumns, loadDocumentFields, getCachedDocumentFields } from "./schema.js";
import { getNextId } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const FILES_DIR = path.join(ROOT_DIR, "files");

const EMPLOYEES_PATH = path.join(DATA_DIR, "employees.csv");
const LOGS_PATH = path.join(DATA_DIR, "logs.csv");
const FIELD_SCHEMA_PATH = path.join(DATA_DIR, "fields_schema.csv");
const FIELD_SCHEMA_TEMPLATE_PATH = path.join(DATA_DIR, "fields_schema.template.csv");
const CONFIG_PATH = path.join(DATA_DIR, "config.csv");
const TEMPLATES_PATH = path.join(DATA_DIR, "templates.csv");
const GENERATED_DOCUMENTS_PATH = path.join(DATA_DIR, "generated_documents.csv");
const STATUS_HISTORY_PATH = path.join(DATA_DIR, "status_history.csv");
const REPRIMANDS_PATH = path.join(DATA_DIR, "reprimands.csv");
const STATUS_EVENTS_PATH = path.join(DATA_DIR, "status_events.csv");

// Simple in-memory lock for log writes to prevent race conditions
let logWriteLock = Promise.resolve();

// Simple in-memory lock for employee writes to prevent race conditions
// when multiple requests try to update employees.csv concurrently
let employeeWriteLock = Promise.resolve();

// Simple in-memory lock for templates writes to prevent race conditions
let templatesWriteLock = Promise.resolve();

// Simple in-memory lock for generated_documents writes to prevent race conditions
let generatedDocumentsWriteLock = Promise.resolve();

// Simple in-memory lock for status_history writes to prevent race conditions
let statusHistoryWriteLock = Promise.resolve();

// Simple in-memory lock for reprimands writes to prevent race conditions
let reprimandWriteLock = Promise.resolve();

// Simple in-memory lock for status_events writes to prevent race conditions
let statusEventWriteLock = Promise.resolve();

export async function ensureDataDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(FILES_DIR, { recursive: true });
}

/**
 * Синхронизация fields_schema.csv с шаблоном fields_schema.template.csv
 * Добавляет отсутствующие поля из шаблона, сохраняя пользовательские настройки
 */
async function syncFieldsSchemaWithTemplate() {
  try {
    // Проверяем существование шаблона
    try {
      await fs.access(FIELD_SCHEMA_TEMPLATE_PATH);
    } catch {
      return; // Шаблон не найден, пропускаем
    }

    // Проверяем существование runtime-файла
    let runtimeExists = true;
    try {
      await fs.access(FIELD_SCHEMA_PATH);
    } catch {
      runtimeExists = false;
    }

    if (!runtimeExists) {
      // Если runtime-файл не существует, копируем из шаблона
      const templateContent = await fs.readFile(FIELD_SCHEMA_TEMPLATE_PATH, "utf-8");
      await fs.writeFile(FIELD_SCHEMA_PATH, templateContent, "utf-8");
      console.log("✓ fields_schema.csv створено з шаблону");
      return;
    }

    // Читаем оба файла
    const templateSchema = await readCsv(FIELD_SCHEMA_TEMPLATE_PATH, FIELD_SCHEMA_COLUMNS);
    const runtimeSchema = await readCsv(FIELD_SCHEMA_PATH, FIELD_SCHEMA_COLUMNS);

    if (templateSchema.length === 0) return;

    // Находим поля из шаблона, отсутствующие в runtime
    const runtimeFieldNames = new Set(runtimeSchema.map(f => f.field_name));
    const missingFields = templateSchema.filter(f => f.field_name && !runtimeFieldNames.has(f.field_name));

    if (missingFields.length === 0) return;

    // Добавляем отсутствующие поля
    const updatedSchema = [...runtimeSchema, ...missingFields];
    // Пересортировка по field_order
    updatedSchema.sort((a, b) => parseInt(a.field_order || 0, 10) - parseInt(b.field_order || 0, 10));

    await writeCsv(FIELD_SCHEMA_PATH, FIELD_SCHEMA_COLUMNS, updatedSchema);
    console.log(`✓ fields_schema.csv: додано ${missingFields.length} полів з шаблону (${missingFields.map(f => f.field_name).join(', ')})`);
  } catch (error) {
    console.error("⚠️ Помилка синхронізації fields_schema:", error.message);
  }
}

/**
 * Инициализирует колонки из fields_schema.csv при старте сервера
 * Должна быть вызвана один раз при запуске
 */
export async function initializeEmployeeColumns() {
  // Сначала синхронизируем fields_schema.csv с шаблоном
  await syncFieldsSchemaWithTemplate();

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
    const headerLine = lines[0].replace(/^\uFEFF/, '');
    const currentColumns = headerLine.split(";").map(col => col.trim().replace(/^"|"$/g, ''));

    // Находим недостающие колонки
    const missingColumns = expectedColumns.filter(col => !currentColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log("✓ Схема employees.csv актуальна, миграция не требуется");
      return;
    }

    console.log(`⚠️  Обнаружены недостающие колонки в employees.csv: ${missingColumns.join(", ")}`);
    console.log("🔄 Выполняется автоматическая миграция...");

    // Миграция переименованных колонок
    const renamedColumns = {
      vacation_start_date: 'status_start_date',
      vacation_end_date: 'status_end_date',
      foreign_passport_issue_date: 'foreign_passport_file_issue_date'
    };
    const renameMap = {};
    for (const [oldName, newName] of Object.entries(renamedColumns)) {
      if (currentColumns.includes(oldName) && !currentColumns.includes(newName)) {
        renameMap[oldName] = newName;
        console.log(`🔄 Переименование колонки: ${oldName} → ${newName}`);
      }
    }

    // Загружаем данные
    const employees = await readCsv(EMPLOYEES_PATH, currentColumns);

    // Добавляем недостающие колонки с пустыми значениями и переносим данные из переименованных
    const migratedEmployees = employees.map(emp => {
      const updated = { ...emp };
      // Копируем данные из старых колонок в новые
      for (const [oldName, newName] of Object.entries(renameMap)) {
        if (updated[oldName] && !updated[newName]) {
          updated[newName] = updated[oldName];
        }
      }
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

/**
 * Saves employee data to employees.csv with write lock to prevent race conditions
 * Uses lock to ensure only one write operation at a time - prevents concurrent edits
 * from overwriting each other's changes
 *
 * Lock mechanism:
 * 1. Wait for previous write to complete (await previousLock)
 * 2. Acquire new lock (other requests will wait for this)
 * 3. Perform write operation
 * 4. Release lock (allow next request to proceed)
 *
 * @param {Array} rows - Employee records to save
 * @returns {Promise<void>}
 */
export async function saveEmployees(rows) {
  // Acquire lock: wait for previous write to complete, then execute our write
  const previousLock = employeeWriteLock;
  let releaseLock;
  employeeWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;

    const columns = await getEmployeeColumns();
    await writeCsv(EMPLOYEES_PATH, columns, rows);
  } finally {
    releaseLock();
  }
}

/**
 * Executes a read-modify-write transaction on employees.csv under the write lock.
 * The callback receives the current employees array and must return the modified array.
 * This prevents lost-update race conditions where concurrent requests could overwrite
 * each other's changes.
 *
 * @param {function(Array): Promise<Array>} fn - Callback that receives employees and returns modified array
 * @returns {Promise<Array>} The saved employees array
 */
export async function withEmployeeLock(fn) {
  const previousLock = employeeWriteLock;
  let releaseLock;
  employeeWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;

    const columns = await getEmployeeColumns();
    const employees = await readCsv(EMPLOYEES_PATH, columns);
    const result = await fn(employees);
    await writeCsv(EMPLOYEES_PATH, columns, result);
    return result;
  } finally {
    releaseLock();
  }
}

export async function loadFieldsSchema() {
  return readCsv(FIELD_SCHEMA_PATH, FIELD_SCHEMA_COLUMNS);
}

export async function saveFieldsSchema(rows) {
  return writeCsv(FIELD_SCHEMA_PATH, FIELD_SCHEMA_COLUMNS, rows);
}

/**
 * Форматує назву поля з людинозрозумілою міткою: "Мітка (field_name)"
 * @param {string} fieldName - технічна назва поля
 * @returns {Promise<string>} - форматована назва "Мітка (field_name)" або просто "field_name" якщо мітка не знайдена
 */
export async function formatFieldNameWithLabel(fieldName) {
  const schema = await loadFieldsSchema();
  const field = schema.find(f => f.field_name === fieldName);
  if (field && field.field_label) {
    return `${field.field_label} (${fieldName})`;
  }
  return fieldName;
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

export async function getDashboardStats() {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();

  // Знаходимо поле employment_status та його options з fields_schema
  const statusField = schema.find(f => f.field_name === 'employment_status');
  const options = statusField?.field_options?.split('|') || [];

  const total = employees.length;

  // Підрахунок по кожній опції з schema — без хардкоду значень
  const statusCounts = options.map(opt => ({
    label: opt,
    count: employees.filter(e => e.employment_status === opt).length
  }));

  const counted = statusCounts.reduce((sum, s) => sum + s.count, 0);
  return { total, statusCounts, other: total - counted };
}

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getDashboardEvents() {
  const employees = await loadEmployees();
  const now = new Date();
  const today = localDateStr(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = localDateStr(tomorrow);

  const in7days = new Date(now);
  in7days.setDate(now.getDate() + 7);
  const in7daysStr = localDateStr(in7days);

  const todayEvents = [];
  const weekEvents = [];

  employees.forEach(emp => {
    const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');
    const startDate = emp.status_start_date;
    const endDate = emp.status_end_date;
    const statusType = emp.employment_status || '';

    if (startDate === today) {
      todayEvents.push({
        employee_id: emp.employee_id,
        name,
        type: 'status_start',
        status_type: statusType,
        date: startDate,
        end_date: endDate || ''
      });
    }
    if (endDate === today) {
      todayEvents.push({
        employee_id: emp.employee_id,
        name,
        type: 'status_end',
        status_type: statusType,
        date: endDate
      });
    }

    if (startDate && startDate >= tomorrowStr && startDate <= in7daysStr) {
      weekEvents.push({
        employee_id: emp.employee_id,
        name,
        type: 'status_start',
        status_type: statusType,
        date: startDate,
        end_date: endDate || ''
      });
    }
    if (endDate && endDate >= tomorrowStr && endDate <= in7daysStr) {
      weekEvents.push({
        employee_id: emp.employee_id,
        name,
        type: 'status_end',
        status_type: statusType,
        date: endDate
      });
    }
  });

  weekEvents.sort((a, b) => a.date.localeCompare(b.date));

  return { today: todayEvents, thisWeek: weekEvents };
}

export async function getDocumentExpiryEvents() {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();
  const now = new Date();
  const today = localDateStr(now);

  const in7days = new Date(now);
  in7days.setDate(now.getDate() + 7);
  const in7daysStr = localDateStr(in7days);

  const past30days = new Date(now);
  past30days.setDate(now.getDate() - 30);
  const past30daysStr = localDateStr(past30days);

  // Находим все поля типа file и их labels
  const fileFields = schema.filter(f => f.field_type === 'file');

  const todayEvents = [];
  const weekEvents = [];

  employees.forEach(emp => {
    const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');

    fileFields.forEach(field => {
      const expiryDateField = `${field.field_name}_expiry_date`;
      const expiryDate = emp[expiryDateField];
      if (!expiryDate) return;
      if (!emp[field.field_name]) return; // Пропускаем если документ отсутствует

      const event = {
        employee_id: emp.employee_id,
        name,
        document_field: field.field_name,
        document_label: field.field_label,
        expiry_date: expiryDate,
        has_file: true
      };

      if (expiryDate === today) {
        todayEvents.push({ ...event, type: 'expiring_today' });
      } else if (expiryDate > today && expiryDate <= in7daysStr) {
        weekEvents.push({ ...event, type: 'expiring_soon' });
      } else if (expiryDate < today && expiryDate >= past30daysStr) {
        todayEvents.push({ ...event, type: 'recently_expired' });
      }
    });
  });

  weekEvents.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

  return { today: todayEvents, thisWeek: weekEvents };
}

export async function getDocumentOverdueEvents() {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();
  const now = new Date();
  const today = localDateStr(now);

  // Находим все поля типа file и их labels
  const fileFields = schema.filter(f => f.field_type === 'file');

  const overdueEvents = [];

  employees.forEach(emp => {
    const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');

    fileFields.forEach(field => {
      const expiryDateField = `${field.field_name}_expiry_date`;
      const expiryDate = emp[expiryDateField];
      if (!expiryDate) return;
      if (!emp[field.field_name]) return; // Пропускаем если документ отсутствует

      // Документы с датой истечения строго меньше сегодняшней даты
      if (expiryDate < today) {
        overdueEvents.push({
          employee_id: emp.employee_id,
          name,
          document_field: field.field_name,
          document_label: field.field_label,
          expiry_date: expiryDate,
          has_file: true,
          type: 'overdue'
        });
      }
    });
  });

  // Сортируем по дате истечения (самые старые первыми)
  overdueEvents.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

  return { overdue: overdueEvents };
}

export async function getStatusReport(type) {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();
  const statusField = schema.find(f => f.field_name === 'employment_status');
  const options = statusField?.field_options?.split('|') || [];
  const workingOpt = options[0] || '';

  const now = new Date();
  const today = localDateStr(now);

  let filtered;
  if (type === 'current') {
    // Employees with active non-working status (start_date <= today, no end_date or end_date >= today)
    filtered = employees.filter(emp => {
      if (!emp.employment_status || emp.employment_status === workingOpt) return false;
      const start = emp.status_start_date;
      const end = emp.status_end_date;
      if (!start) return false;
      if (start > today) return false;
      if (end && end < today) return false;
      return true;
    });
  } else if (type === 'month') {
    const monthStart = today.slice(0, 7) + '-01';
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = today.slice(0, 7) + '-' + String(lastDay).padStart(2, '0');
    filtered = employees.filter(emp => {
      if (!emp.employment_status || emp.employment_status === workingOpt) return false;
      const start = emp.status_start_date;
      const end = emp.status_end_date;
      if (!start && !end) return false;
      if (start && start >= monthStart && start <= monthEnd) return true;
      if (end && end >= monthStart && end <= monthEnd) return true;
      if (start && end && start < monthStart && end > monthEnd) return true;
      return false;
    });
  } else {
    filtered = [];
  }

  return filtered.map(emp => {
    const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');
    const start = emp.status_start_date;
    const end = emp.status_end_date;
    let days = 0;
    if (start && end) {
      days = Math.floor((new Date(end) - new Date(start)) / 86400000) + 1;
      if (days < 0) days = 0;
    }
    return { employee_id: emp.employee_id, name, status_type: emp.employment_status || '', status_start_date: start, status_end_date: end, days };
  });
}

export async function exportEmployees(filters, searchTerm = '') {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();

  // Визначити колонки для export: тільки show_in_table=yes, відсортовані по field_order
  const exportFields = schema
    .filter(f => f.show_in_table === 'yes')
    .sort((a, b) => parseInt(a.field_order, 10) - parseInt(b.field_order, 10))
    .map(f => ({ key: f.field_name, label: f.field_label }));

  // Створити whitelist для валідації фільтрів
  const allFieldNames = schema.map(f => f.field_name);

  // Текстовий пошук (як в App.vue filteredEmployees)
  let filtered = employees;
  const query = searchTerm.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(emp => {
      const displayName = [emp.last_name, emp.first_name, emp.middle_name]
        .filter(Boolean)
        .join(' ');
      const haystack = [
        displayName,
        emp.department,
        emp.position,
        emp.employee_id
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  // Фільтрація за колонками (AND між полями, OR всередині значень)
  if (filters && typeof filters === 'object') {
    Object.keys(filters).forEach(fieldName => {
      // Problem #1 fix: Валідація fieldName по whitelist
      if (!allFieldNames.includes(fieldName)) {
        return; // Ігнорувати невалідні поля
      }

      const filterValues = filters[fieldName];
      if (Array.isArray(filterValues) && filterValues.length > 0) {
        filtered = filtered.filter(emp => {
          const value = emp[fieldName];

          // Problem #2 fix: Явна логіка для __EMPTY__
          const hasEmptyFilter = filterValues.includes('__EMPTY__');
          const isEmpty = !value || value.trim() === '';

          if (hasEmptyFilter && isEmpty) {
            return true;
          }

          // Перевірка на конкретні значення (виключаючи __EMPTY__ sentinel)
          const actualValues = filterValues.filter(v => v !== '__EMPTY__');
          if (actualValues.length > 0) {
            return actualValues.includes(value);
          }

          return false;
        });
      }
    });
  }

  // Генерація CSV з csv-stringify: field_label як заголовки
  const { stringify } = await import('csv-stringify/sync');
  const headers = exportFields.map(f => f.label);

  const rows = filtered.map(emp => {
    const row = {};
    exportFields.forEach(f => {
      row[f.label] = emp[f.key] || '';
    });
    return row;
  });

  const csv = stringify(rows, {
    header: true,
    columns: headers,
    delimiter: ';',
    record_delimiter: '\r\n'
  });

  return '\uFEFF' + csv;
}

export async function loadLogs() {
  return readCsv(LOGS_PATH, LOG_COLUMNS);
}

export async function saveLogs(rows) {
  return writeCsv(LOGS_PATH, LOG_COLUMNS, rows);
}

export async function addLog(action, employeeId, employeeName, fieldName = "", oldValue = "", newValue = "", details = "") {
  return addLogs([{ action, employeeId, employeeName, fieldName, oldValue, newValue, details }]);
}

/**
 * Batch-adds multiple log entries in a single write operation
 * Uses lock to prevent race condition when multiple requests write logs concurrently
 */
export async function addLogs(entries) {
  if (!entries || entries.length === 0) return [];

  // Acquire lock: wait for previous write to complete, then execute our write
  const previousLock = logWriteLock;
  let releaseLock;
  logWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;

    const logs = await loadLogs();
    let maxId = logs.reduce((max, log) => {
      const id = parseInt(log.log_id, 10);
      return isNaN(id) ? max : Math.max(max, id);
    }, 0);

    const newLogs = entries.map(({ action, employeeId, employeeName, fieldName = "", oldValue = "", newValue = "", details = "" }) => {
      maxId++;
      return {
        log_id: String(maxId),
        timestamp: new Date().toISOString(),
        action,
        employee_id: employeeId || "",
        employee_name: employeeName || "",
        field_name: fieldName || "",
        old_value: oldValue || "",
        new_value: newValue || "",
        details: details || ""
      };
    });

    logs.push(...newLogs);

    // Автоматическая очистка логов - выполняем в той же операции записи для предотвращения race condition
    const config = await loadConfig();
    const maxEntries = parseInt(config.max_log_entries, 10) || 1000;

    if (logs.length > maxEntries) {
      // Сортируем по timestamp (новые сначала) - clone array to avoid mutation
      const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      // Оставляем только maxEntries последних записей
      const trimmedLogs = sortedLogs.slice(0, maxEntries);
      await saveLogs(trimmedLogs);
      console.log(`✂️  Логи очищены: ${logs.length} → ${trimmedLogs.length} записей (лимит: ${maxEntries})`);
    } else {
      await saveLogs(logs);
    }

    return newLogs;
  } finally {
    releaseLock();
  }
}

/**
 * Загружает конфигурацию из config.csv
 * @returns {Promise<Object>} Объект с парами config_key: config_value
 */
export async function loadConfig() {
  try {
    const CONFIG_COLUMNS = ['config_key', 'config_value', 'config_description'];
    const configRows = await readCsv(CONFIG_PATH, CONFIG_COLUMNS);

    const config = {};
    configRows.forEach(row => {
      if (row.config_key) {
        config[row.config_key] = row.config_value;
      }
    });

    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('config.csv не найден, используются значения по умолчанию');
    } else {
      console.error('ОШИБКА: config.csv поврежден или имеет неверный формат:', error.message);
      console.error('Используются значения по умолчанию. Проверьте файл config.csv!');
    }
    // Возвращаем значения по умолчанию
    return { max_log_entries: '1000', max_file_upload_mb: '10', retirement_age_years: '60', max_report_preview_rows: '100' };
  }
}


/**
 * Получить события дней рождения (сегодня и следующие 7 дней)
 * @returns {Promise<{today: Array, next7Days: Array}>}
 */
export async function getBirthdayEvents() {
  const employees = await loadEmployees();
  const now = new Date();
  const currentYear = now.getFullYear();
  const today = localDateStr(now);

  // Normalize now to midnight for date-only comparison
  const nowDateOnly = new Date(currentYear, now.getMonth(), now.getDate());

  const in7days = new Date(now);
  in7days.setDate(now.getDate() + 7);

  const todayEvents = [];
  const next7DaysEvents = [];

  employees.forEach(emp => {
    const birthDate = emp.birth_date;
    if (!birthDate) return;

    // Парсим дату рождения
    const birthParts = birthDate.split('-');
    if (birthParts.length !== 3) return;

    const birthYear = parseInt(birthParts[0], 10);
    let birthMonth = parseInt(birthParts[1], 10);
    let birthDay = parseInt(birthParts[2], 10);

    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return;

    // Handle leap day (Feb 29) in non-leap years - celebrate on Feb 28 instead
    const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (birthMonth === 2 && birthDay === 29 && !isLeapYear(currentYear)) {
      birthDay = 28; // Celebrate on Feb 28 in non-leap years
    }

    // Проверяем день рождения в текущем году и следующем (для случая перехода через Новый год)
    const thisYearBirthday = new Date(currentYear, birthMonth - 1, birthDay);
    const nextYearBirthday = new Date(currentYear + 1, birthMonth - 1, birthDay);

    const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');

    // Проверяем день рождения в текущем году
    if (thisYearBirthday >= nowDateOnly && thisYearBirthday <= in7days) {
      const birthdayStr = localDateStr(thisYearBirthday);
      const age = currentYear - birthYear;

      const event = {
        employee_id: emp.employee_id,
        employee_name: name,
        birth_date: birthDate,
        current_year_birthday: birthdayStr,
        age: age
      };

      if (birthdayStr === today) {
        todayEvents.push(event);
      } else {
        next7DaysEvents.push(event);
      }
    }
    // Проверяем день рождения в следующем году (для случаев типа 29 декабря -> 2 января)
    else if (nextYearBirthday >= nowDateOnly && nextYearBirthday <= in7days) {
      const birthdayStr = localDateStr(nextYearBirthday);
      const age = (currentYear + 1) - birthYear;

      const event = {
        employee_id: emp.employee_id,
        employee_name: name,
        birth_date: birthDate,
        current_year_birthday: birthdayStr,
        age: age
      };

      if (birthdayStr === today) {
        todayEvents.push(event);
      } else {
        next7DaysEvents.push(event);
      }
    }
  });

  // Сортируем события следующих 7 дней по дате
  next7DaysEvents.sort((a, b) => {
    return a.current_year_birthday.localeCompare(b.current_year_birthday);
  });

  return { today: todayEvents, next7Days: next7DaysEvents };
}

/**
 * Получить события выхода на пенсию (сегодня и в этом месяце)
 * @param {number} retirementAge - Возраст выхода на пенсию
 * @returns {Promise<{today: Array, thisMonth: Array}>}
 */
export async function getRetirementEvents(retirementAge = 60) {
  const employees = await loadEmployees();
  const now = new Date();
  const currentYear = now.getFullYear();
  const today = localDateStr(now);

  // Normalize now to midnight for date-only comparison
  const nowDateOnly = new Date(currentYear, now.getMonth(), now.getDate());

  // Calculate month start and end
  const monthStart = new Date(currentYear, now.getMonth(), 1);
  const monthEnd = new Date(currentYear, now.getMonth() + 1, 0);

  const todayEvents = [];
  const thisMonthEvents = [];

  employees.forEach(emp => {
    const birthDate = emp.birth_date;
    if (!birthDate) return;

    // Парсим дату рождения
    const birthParts = birthDate.split('-');
    if (birthParts.length !== 3) return;

    const birthYear = parseInt(birthParts[0], 10);
    let birthMonth = parseInt(birthParts[1], 10);
    let birthDay = parseInt(birthParts[2], 10);

    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return;

    // Handle leap day (Feb 29) in non-leap years - celebrate on Feb 28 instead
    const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (birthMonth === 2 && birthDay === 29 && !isLeapYear(currentYear)) {
      birthDay = 28; // Celebrate on Feb 28 in non-leap years
    }

    // Проверяем день рождения в текущем году и следующем (для случая перехода через Новый год)
    const thisYearBirthday = new Date(currentYear, birthMonth - 1, birthDay);
    const nextYearBirthday = new Date(currentYear + 1, birthMonth - 1, birthDay);

    const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');

    // Проверяем день рождения в текущем году
    const age = currentYear - birthYear;
    if (age === retirementAge && thisYearBirthday >= monthStart && thisYearBirthday <= monthEnd) {
      const retirementDateStr = localDateStr(thisYearBirthday);

      const event = {
        employee_id: emp.employee_id,
        employee_name: name,
        birth_date: birthDate,
        retirement_date: retirementDateStr,
        age: age
      };

      if (retirementDateStr === today) {
        todayEvents.push(event);
      } else if (thisYearBirthday > nowDateOnly) {
        thisMonthEvents.push(event);
      }
    }

    // Проверяем день рождения в следующем году (для случая перехода через Новый год)
    const nextYearAge = (currentYear + 1) - birthYear;
    if (nextYearAge === retirementAge && nextYearBirthday >= monthStart && nextYearBirthday <= monthEnd) {
      const retirementDateStr = localDateStr(nextYearBirthday);

      const event = {
        employee_id: emp.employee_id,
        employee_name: name,
        birth_date: birthDate,
        retirement_date: retirementDateStr,
        age: nextYearAge
      };

      if (retirementDateStr === today) {
        todayEvents.push(event);
      } else if (nextYearBirthday > nowDateOnly) {
        thisMonthEvents.push(event);
      }
    }
  });

  // Сортируем события месяца по дате
  thisMonthEvents.sort((a, b) => {
    return a.retirement_date.localeCompare(b.retirement_date);
  });

  return { today: todayEvents, thisMonth: thisMonthEvents };
}

/**
 * Get custom report with advanced filtering
 * @param {Array} filters - Array of filter objects: [{field, condition, value}]
 * @param {Array|null} columns - Array of column names to include (null = all)
 * @returns {Promise<Array>} Filtered employee records
 */
export async function getCustomReport(filters = [], columns = null) {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();

  // Create whitelist for field validation (including auto-generated date fields)
  const allFieldNames = [];
  schema.forEach(f => {
    allFieldNames.push(f.field_name);
    // Add auto-generated date fields for document fields
    if (f.field_type === 'file') {
      allFieldNames.push(`${f.field_name}_issue_date`);
      allFieldNames.push(`${f.field_name}_expiry_date`);
    }
  });

  // Apply filters
  let filtered = employees;

  if (filters && Array.isArray(filters) && filters.length > 0) {
    filtered = filtered.filter(emp => {
      // AND logic: employee must match ALL filters
      return filters.every(filter => {
        const { field, condition, value, valueFrom, valueTo } = filter;

        // Validate field name
        if (!allFieldNames.includes(field)) {
          return true; // Skip invalid fields
        }

        const empValue = emp[field];
        const empValueStr = String(empValue || '').toLowerCase();
        const filterValueStr = String(value || '').toLowerCase();

        switch (condition) {
          case 'contains':
            return empValueStr.includes(filterValueStr);
          case 'not_contains':
            return !empValueStr.includes(filterValueStr);
          case 'equals':
            // For number fields, use numeric comparison
            if (typeof value === 'number' || !isNaN(parseFloat(value))) {
              const empNum = parseFloat(empValue);
              const valNum = parseFloat(value);
              if (isNaN(empNum) || isNaN(valNum)) return false;
              return empNum === valNum;
            }
            return empValue === value || empValueStr === filterValueStr;
          case 'not_equals':
            return empValue !== value && empValueStr !== filterValueStr;
          case 'greater_than': {
            const empNum = parseFloat(empValue || 0);
            const valNum = parseFloat(value || 0);
            if (isNaN(empNum) || isNaN(valNum)) return false;
            return empNum > valNum;
          }
          case 'less_than': {
            const empNum = parseFloat(empValue || 0);
            const valNum = parseFloat(value || 0);
            if (isNaN(empNum) || isNaN(valNum)) return false;
            return empNum < valNum;
          }
          case 'date_range':
            // Date range: check if empValue is between valueFrom and valueTo (inclusive)
            // Both dates are required for date_range condition
            if (!empValue) return false;
            if (!valueFrom || !valueTo) return false; // Require both dates
            if (empValue < valueFrom) return false;
            if (empValue > valueTo) return false;
            return true;
          case 'empty':
            return !empValue || empValue === '';
          case 'not_empty':
            return empValue && empValue !== '';
          default:
            return true;
        }
      });
    });
  }

  // If columns specified, project only those columns
  if (columns && Array.isArray(columns) && columns.length > 0) {
    const validColumns = columns.filter(col => allFieldNames.includes(col));
    filtered = filtered.map(emp => {
      const projected = {};
      validColumns.forEach(col => {
        projected[col] = emp[col];
      });
      // Always include employee_id for identification
      if (!projected.employee_id) {
        projected.employee_id = emp.employee_id;
      }
      return projected;
    });
  }

  return filtered;
}

// Templates CSV columns
const TEMPLATE_COLUMNS = [
  'template_id',
  'template_name',
  'template_type',
  'docx_filename',
  'placeholder_fields',
  'description',
  'created_date',
  'active'
];

// Generated documents CSV columns
const GENERATED_DOCUMENT_COLUMNS = [
  'document_id',
  'template_id',
  'employee_id',
  'docx_filename',
  'generation_date',
  'generated_by',
  'data_snapshot'
];

/**
 * Load templates from templates.csv
 * @returns {Promise<Array>} Array of template records
 */
export async function loadTemplates() {
  return readCsv(TEMPLATES_PATH, TEMPLATE_COLUMNS);
}

/**
 * Save templates to templates.csv with write lock to prevent race conditions
 * @param {Array} rows - Template records to save
 * @returns {Promise<void>}
 */
export async function saveTemplates(rows) {
  // Acquire lock: wait for previous write to complete, then execute our write
  const previousLock = templatesWriteLock;
  let releaseLock;
  templatesWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    await writeCsv(TEMPLATES_PATH, TEMPLATE_COLUMNS, rows);
  } finally {
    releaseLock();
  }
}

/**
 * Load generated documents from generated_documents.csv
 * @returns {Promise<Array>} Array of generated document records
 */
export async function loadGeneratedDocuments() {
  return readCsv(GENERATED_DOCUMENTS_PATH, GENERATED_DOCUMENT_COLUMNS);
}

/**
 * Save generated documents to generated_documents.csv with write lock to prevent race conditions
 * @param {Array} rows - Generated document records to save
 * @returns {Promise<void>}
 */
export async function saveGeneratedDocuments(rows) {
  // Acquire lock: wait for previous write to complete, then execute our write
  const previousLock = generatedDocumentsWriteLock;
  let releaseLock;
  generatedDocumentsWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    await writeCsv(GENERATED_DOCUMENTS_PATH, GENERATED_DOCUMENT_COLUMNS, rows);
  } finally {
    releaseLock();
  }
}

/**
 * Atomically adds a new generated document with race condition protection
 * @param {Object} documentData - Document data without document_id
 * @returns {Promise<string>} The new document_id
 */
export async function addGeneratedDocument(documentData) {
  // Acquire lock: wait for previous write to complete, then execute our write
  const previousLock = generatedDocumentsWriteLock;
  let releaseLock;
  generatedDocumentsWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const documents = await loadGeneratedDocuments();
    const newDocId = getNextId(documents, "document_id");

    const newDocument = {
      document_id: newDocId,
      ...documentData
    };

    documents.push(newDocument);
    await writeCsv(GENERATED_DOCUMENTS_PATH, GENERATED_DOCUMENT_COLUMNS, documents);

    return newDocId;
  } finally {
    releaseLock();
  }
}

/**
 * Load status history from status_history.csv
 * @returns {Promise<Array>} Array of status history records
 */
export async function loadStatusHistory() {
  return readCsv(STATUS_HISTORY_PATH, STATUS_HISTORY_COLUMNS);
}

/**
 * Atomically adds a new status history entry with race condition protection
 * @param {Object} entryData - Status history data without history_id
 * @returns {Promise<string>} The new history_id
 */
export async function addStatusHistoryEntry(entryData) {
  const previousLock = statusHistoryWriteLock;
  let releaseLock;
  statusHistoryWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const history = await loadStatusHistory();
    const newId = getNextId(history, "history_id");

    const newEntry = {
      ...entryData,
      history_id: newId,
      changed_at: new Date().toISOString()
    };

    history.push(newEntry);
    await writeCsv(STATUS_HISTORY_PATH, STATUS_HISTORY_COLUMNS, history);

    return newId;
  } finally {
    releaseLock();
  }
}

/**
 * Remove all status history entries for a given employee
 * @param {string} employeeId - The employee ID whose history to remove
 */
export async function removeStatusHistoryForEmployee(employeeId) {
  const previousLock = statusHistoryWriteLock;
  let releaseLock;
  statusHistoryWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const history = await loadStatusHistory();
    const filtered = history.filter(h => h.employee_id !== employeeId);
    if (filtered.length !== history.length) {
      await writeCsv(STATUS_HISTORY_PATH, STATUS_HISTORY_COLUMNS, filtered);
    }
  } finally {
    releaseLock();
  }
}

/**
 * Synchronizes employees_import_sample.csv with fields_schema.csv
 * Adds missing columns from schema, removes obsolete columns
 * Preserves UTF-8 BOM encoding for Excel compatibility
 * @returns {Promise<{added: string[], removed: string[], status: string}>}
 */
export async function syncCSVTemplate() {
  const TEMPLATE_PATH = path.join(DATA_DIR, "employees_import_sample.csv");

  try {
    // Get current schema columns
    const schemaColumns = await getEmployeeColumns();

    // Check if template file exists
    let templateExists = true;
    try {
      await fs.access(TEMPLATE_PATH);
    } catch {
      templateExists = false;
    }

    if (!templateExists) {
      // Create new template with current schema
      const headerRow = schemaColumns.join(";");
      const content = "\uFEFF" + headerRow + "\r\n";
      await fs.writeFile(TEMPLATE_PATH, content, "utf-8");
      console.log("✓ Создан новый шаблон CSV с текущей схемой");
      return { added: schemaColumns, removed: [], status: "created" };
    }

    // Read existing template
    const fileContent = await fs.readFile(TEMPLATE_PATH, "utf-8");
    const lines = fileContent.split("\n").filter(line => line.trim());

    if (lines.length === 0) {
      // Empty file, create header
      const headerRow = schemaColumns.join(";");
      const content = "\uFEFF" + headerRow + "\r\n";
      await fs.writeFile(TEMPLATE_PATH, content, "utf-8");
      console.log("✓ Шаблон CSV был пуст, создан заголовок");
      return { added: schemaColumns, removed: [], status: "created" };
    }

    // Parse current header
    const headerLine = lines[0].replace(/^\uFEFF/, '');
    const currentColumns = headerLine.split(";").map(col => col.trim().replace(/^"|"$/g, ''));

    // Find differences
    const missingColumns = schemaColumns.filter(col => !currentColumns.includes(col));
    const obsoleteColumns = currentColumns.filter(col => !schemaColumns.includes(col));

    // If no changes needed
    if (missingColumns.length === 0 && obsoleteColumns.length === 0) {
      console.log("✓ Шаблон CSV актуален, синхронизация не требуется");
      return { added: [], removed: [], status: "up_to_date" };
    }

    // Reconstruct template with updated columns
    // Keep only current schema columns in correct order
    const newHeaderRow = schemaColumns.join(";");
    const content = "\uFEFF" + newHeaderRow + "\r\n";
    await fs.writeFile(TEMPLATE_PATH, content, "utf-8");

    // Log changes
    if (missingColumns.length > 0) {
      console.log(`✓ Добавлено колонок в шаблон CSV: ${missingColumns.join(", ")}`);
    }
    if (obsoleteColumns.length > 0) {
      console.log(`✓ Удалено устаревших колонок из шаблона CSV: ${obsoleteColumns.join(", ")}`);
    }

    return { added: missingColumns, removed: obsoleteColumns, status: "updated" };
  } catch (error) {
    console.error("❌ Ошибка синхронизації шаблону CSV:", error.message);
    throw error;
  }
}

/**
 * Load reprimands/commendations from reprimands.csv
 * @returns {Promise<Array>} Array of reprimand records
 */
export async function loadReprimands() {
  return readCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS);
}

/**
 * Atomically adds a new reprimand record with race condition protection
 * @param {Object} data - Reprimand data without record_id/created_at
 * @returns {Promise<Object>} The new reprimand record
 */
export async function addReprimand(data) {
  const previousLock = reprimandWriteLock;
  let releaseLock;
  reprimandWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const reprimands = await loadReprimands();
    const newId = getNextId(reprimands, "record_id");

    const newRecord = {
      record_id: newId,
      employee_id: data.employee_id || "",
      record_date: data.record_date || "",
      record_type: data.record_type || "",
      order_number: data.order_number || "",
      note: data.note || "",
      created_at: new Date().toISOString()
    };

    reprimands.push(newRecord);
    await writeCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS, reprimands);

    return newRecord;
  } finally {
    releaseLock();
  }
}

/**
 * Atomically updates an existing reprimand record
 * @param {string} recordId - The record ID to update
 * @param {Object} data - Updated fields (record_date, record_type, order_number, note)
 * @returns {Promise<Object|null>} The updated record or null if not found
 */
export async function updateReprimand(recordId, data) {
  const previousLock = reprimandWriteLock;
  let releaseLock;
  reprimandWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const reprimands = await loadReprimands();
    const idx = reprimands.findIndex(r => r.record_id === String(recordId));
    if (idx === -1) return null;

    reprimands[idx] = {
      ...reprimands[idx],
      record_date: data.record_date !== undefined ? data.record_date : reprimands[idx].record_date,
      record_type: data.record_type !== undefined ? data.record_type : reprimands[idx].record_type,
      order_number: data.order_number !== undefined ? data.order_number : reprimands[idx].order_number,
      note: data.note !== undefined ? data.note : reprimands[idx].note
    };

    await writeCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS, reprimands);
    return reprimands[idx];
  } finally {
    releaseLock();
  }
}

/**
 * Deletes a single reprimand record by ID (hard delete)
 * @param {string} recordId - The record ID to delete
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
export async function deleteReprimand(recordId) {
  const previousLock = reprimandWriteLock;
  let releaseLock;
  reprimandWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const reprimands = await loadReprimands();
    const filtered = reprimands.filter(r => r.record_id !== String(recordId));
    if (filtered.length === reprimands.length) return false;
    await writeCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS, filtered);
    return true;
  } finally {
    releaseLock();
  }
}

/**
 * Remove all reprimand records for a given employee (cleanup on employee delete)
 * @param {string} employeeId - The employee ID whose reprimands to remove
 */
export async function removeReprimandsForEmployee(employeeId) {
  const previousLock = reprimandWriteLock;
  let releaseLock;
  reprimandWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const reprimands = await loadReprimands();
    const filtered = reprimands.filter(r => r.employee_id !== String(employeeId));
    if (filtered.length !== reprimands.length) {
      await writeCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS, filtered);
    }
  } finally {
    releaseLock();
  }
}

// ===========================
// Status Events store functions
// ===========================

/**
 * Load all status events from status_events.csv
 * @returns {Promise<Array>} Array of status event records
 */
export async function loadStatusEvents() {
  return readCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS);
}

/**
 * Save status events to status_events.csv with write lock
 * @param {Array} rows - Status event records to save
 * @returns {Promise<void>}
 */
async function saveStatusEvents(rows) {
  const previousLock = statusEventWriteLock;
  let releaseLock;
  statusEventWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    await writeCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS, rows);
  } finally {
    releaseLock();
  }
}

/**
 * Get all active status events for an employee, sorted by start_date ascending
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
export async function getStatusEventsForEmployee(employeeId) {
  const events = await loadStatusEvents();
  return events
    .filter(e => e.employee_id === String(employeeId) && e.active !== 'no')
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

/**
 * Add a new status event
 * @param {Object} data - { employee_id, status, start_date, end_date? }
 * @returns {Promise<Object>} The new event record
 */
export async function addStatusEvent(data) {
  const previousLock = statusEventWriteLock;
  let releaseLock;
  statusEventWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const events = await loadStatusEvents();
    const newId = getNextId(events, "event_id");

    const newEvent = {
      event_id: newId,
      employee_id: String(data.employee_id || ""),
      status: data.status || "",
      start_date: data.start_date || "",
      end_date: data.end_date || "",
      created_at: new Date().toISOString(),
      active: "yes"
    };

    events.push(newEvent);
    await writeCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS, events);

    return newEvent;
  } finally {
    releaseLock();
  }
}

/**
 * Hard-delete a single status event by event_id
 * @param {string} eventId
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
export async function deleteStatusEvent(eventId) {
  const previousLock = statusEventWriteLock;
  let releaseLock;
  statusEventWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const events = await loadStatusEvents();
    const filtered = events.filter(e => e.event_id !== String(eventId));
    if (filtered.length === events.length) return false;
    await writeCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS, filtered);
    return true;
  } finally {
    releaseLock();
  }
}

/**
 * Hard-delete all status events for an employee (called on employee delete)
 * @param {string} employeeId
 */
export async function removeStatusEventsForEmployee(employeeId) {
  const previousLock = statusEventWriteLock;
  let releaseLock;
  statusEventWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const events = await loadStatusEvents();
    const filtered = events.filter(e => e.employee_id !== String(employeeId));
    if (filtered.length !== events.length) {
      await writeCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS, filtered);
    }
  } finally {
    releaseLock();
  }
}

/**
 * Find the currently active status event for an employee on a given date.
 * An event is active if: start_date <= dateStr AND (end_date is empty OR end_date >= dateStr)
 * @param {string} employeeId
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Promise<Object|null>} The active event or null
 */
export async function getActiveEventForEmployee(employeeId, dateStr) {
  const events = await getStatusEventsForEmployee(employeeId);
  const active = events.find(e => {
    if (e.start_date > dateStr) return false;
    if (e.end_date && e.end_date < dateStr) return false;
    return true;
  });
  return active || null;
}

/**
 * Validate that a new event does not overlap with existing events for an employee.
 * Overlap algorithm: A overlaps B if A.start_date <= B.end_or_inf AND A.end_or_inf >= B.start_date
 * @param {string} employeeId
 * @param {string} start_date - YYYY-MM-DD
 * @param {string} end_date - YYYY-MM-DD or empty (= no end)
 * @param {string} [excludeEventId] - event_id to exclude (for update scenarios)
 * @returns {Promise<boolean>} true if no overlap, false if overlap found
 */
export async function validateNoOverlap(employeeId, start_date, end_date, excludeEventId) {
  const events = await getStatusEventsForEmployee(employeeId);
  const FAR_FUTURE = "9999-12-31";
  const newEnd = end_date || FAR_FUTURE;

  for (const e of events) {
    if (excludeEventId && e.event_id === String(excludeEventId)) continue;
    const existingEnd = e.end_date || FAR_FUTURE;
    // Overlap: new.start <= existing.end AND new.end >= existing.start
    if (start_date <= existingEnd && newEnd >= e.start_date) {
      return false;
    }
  }
  return true;
}
