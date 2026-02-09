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

      const event = {
        employee_id: emp.employee_id,
        name,
        document_field: field.field_name,
        document_label: field.field_label,
        expiry_date: expiryDate,
        has_file: !!emp[field.field_name]
      };

      if (expiryDate === today) {
        todayEvents.push({ ...event, type: 'expired_today' });
      } else if (expiryDate > today && expiryDate <= in7daysStr) {
        weekEvents.push({ ...event, type: 'expiring_soon' });
      } else if (expiryDate < today && expiryDate >= past30daysStr) {
        todayEvents.push({ ...event, type: 'already_expired' });
      }
    });
  });

  weekEvents.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

  return { today: todayEvents, thisWeek: weekEvents };
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
    .sort((a, b) => parseInt(a.field_order) - parseInt(b.field_order))
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
