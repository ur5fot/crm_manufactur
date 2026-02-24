// Fallback список колонок если fields_schema.csv недоступен.
// These are field_name values (CSV column headers) and must match
// the field_name column in data/fields_schema.template.csv.
// Used only when fields_schema.csv cannot be loaded.
const DEFAULT_EMPLOYEE_COLUMNS = [
  "photo",
  "employee_id",
  "last_name",
  "first_name",
  "middle_name",
  "birth_date",
  "employment_status",
  "additional_status",
  "gender",
  "blood_group",
  "department",
  "grade",
  "position",
  "specialty",
  "work_state",
  "work_type",
  "fit_status",
  "order_ref",
  "location",
  "residence_place",
  "registration_place",
  "email",
  "phone",
  "phone_note",
  "education",
  "salary_grid",
  "salary_amount",
  "bank_name",
  "bank_card_number",
  "bank_iban",
  "tax_id",
  "personal_matter_file",
  "personal_matter_file_issue_date",
  "personal_matter_file_expiry_date",
  "medical_commission_file",
  "medical_commission_file_issue_date",
  "medical_commission_file_expiry_date",
  "veterans_certificate_file",
  "veterans_certificate_file_issue_date",
  "veterans_certificate_file_expiry_date",
  "driver_license_file",
  "driver_license_file_issue_date",
  "driver_license_file_expiry_date",
  "id_certificate_file",
  "id_certificate_file_issue_date",
  "id_certificate_file_expiry_date",
  "foreign_passport_number",
  "foreign_passport_file",
  "foreign_passport_file_issue_date",
  "foreign_passport_file_expiry_date",
  "criminal_record_file",
  "criminal_record_file_issue_date",
  "criminal_record_file_expiry_date",
  "military_id_file",
  "military_id_file_issue_date",
  "military_id_file_expiry_date",
  "medical_certificate_file",
  "medical_certificate_file_issue_date",
  "medical_certificate_file_expiry_date",
  "insurance_file",
  "insurance_file_issue_date",
  "insurance_file_expiry_date",
  "education_diploma_file",
  "education_diploma_file_issue_date",
  "education_diploma_file_expiry_date",
  "status_start_date",
  "status_end_date",
  "notes"
];

// Fallback список полей документов если fields_schema.csv недоступен
const DEFAULT_DOCUMENT_FIELDS = [
  "personal_matter_file",
  "medical_commission_file",
  "veterans_certificate_file",
  "driver_license_file",
  "id_certificate_file",
  "foreign_passport_file",
  "criminal_record_file",
  "military_id_file",
  "medical_certificate_file",
  "insurance_file",
  "education_diploma_file"
];

// Кэш для динамически загруженных колонок
let cachedEmployeeColumns = null;
let cachedDocumentFields = null;
let cachedFieldIdMap = null; // Map<field_id, field_name>
let cachedFieldSchema = null; // Full schema array with field_id/role
let cachedRawFieldSchema = null; // Raw rows from fields_schema.csv (all FIELD_SCHEMA_COLUMNS)

/**
 * Загружает список колонок из fields_schema.csv отсортированный по field_order
 * @param {Function} loadFieldsSchemaFn - функция для загрузки fields_schema
 * @returns {Promise<string[]>} - массив названий полей
 */
export async function loadEmployeeColumns(loadFieldsSchemaFn) {
  if (cachedEmployeeColumns) {
    return cachedEmployeeColumns;
  }

  try {
    const schema = await loadFieldsSchemaFn();
    if (!schema || schema.length === 0) {
      console.warn("fields_schema.csv пуст, используем DEFAULT_EMPLOYEE_COLUMNS");
      cachedEmployeeColumns = DEFAULT_EMPLOYEE_COLUMNS;
      return cachedEmployeeColumns;
    }

    // Cache the raw schema rows so loadFieldsSchema() can use this cached version
    // during schema migrations, keeping concurrent reads consistent with the CSV files.
    cachedRawFieldSchema = schema;

    // Сортируем по field_order и извлекаем field_name
    const sortedFields = schema
      .sort((a, b) => parseInt(a.field_order || 0, 10) - parseInt(b.field_order || 0, 10))
      .filter(field => field.field_name && field.field_name.trim() !== "");

    // Строим список колонок, для file-полей автоматически добавляем _issue_date и _expiry_date
    const columns = [];
    for (const field of sortedFields) {
      columns.push(field.field_name);
      if (field.field_type === "file") {
        columns.push(`${field.field_name}_issue_date`);
        columns.push(`${field.field_name}_expiry_date`);
      }
    }

    if (columns.length === 0) {
      console.warn("Не найдено ни одной валидной колонки в fields_schema.csv");
      cachedEmployeeColumns = DEFAULT_EMPLOYEE_COLUMNS;
      return cachedEmployeeColumns;
    }

    cachedEmployeeColumns = columns;

    // Cache field_id mapping and full schema
    cachedFieldIdMap = new Map();
    cachedFieldSchema = [];
    for (const field of sortedFields) {
      if (field.field_id && field.field_name) {
        cachedFieldIdMap.set(field.field_id, field.field_name);
      }
      cachedFieldSchema.push({
        field_id: field.field_id || '',
        field_name: field.field_name,
        field_label: field.field_label || '',
        field_type: field.field_type || 'text',
        field_options: field.field_options || '',
        field_group: field.field_group || '',
        role: field.role || ''
      });
    }

    console.log(`Загружено ${columns.length} колонок из fields_schema.csv (включая auto-generated date колонки для документов)`);
    return cachedEmployeeColumns;
  } catch (error) {
    console.error("Ошибка загрузки fields_schema.csv:", error.message);
    cachedEmployeeColumns = DEFAULT_EMPLOYEE_COLUMNS;
    return cachedEmployeeColumns;
  }
}

/**
 * Загружает список полей типа "file" из fields_schema.csv
 * @param {Function} loadFieldsSchemaFn - функция для загрузки fields_schema
 * @returns {Promise<string[]>} - массив названий полей документов
 */
export async function loadDocumentFields(loadFieldsSchemaFn) {
  if (cachedDocumentFields) {
    return cachedDocumentFields;
  }

  try {
    const schema = await loadFieldsSchemaFn();
    if (!schema || schema.length === 0) {
      console.warn("fields_schema.csv пуст, используем DEFAULT_DOCUMENT_FIELDS");
      cachedDocumentFields = DEFAULT_DOCUMENT_FIELDS;
      return cachedDocumentFields;
    }

    // Фильтруем поля с типом "file"
    const fileFields = schema
      .filter(field => field.field_type === "file")
      .map(field => field.field_name)
      .filter(name => name && name.trim() !== "");

    if (fileFields.length === 0) {
      console.warn("Не найдено ни одного поля типа 'file' в fields_schema.csv");
      cachedDocumentFields = DEFAULT_DOCUMENT_FIELDS;
      return cachedDocumentFields;
    }

    cachedDocumentFields = fileFields;
    console.log(`Загружено ${fileFields.length} полей документов из fields_schema.csv`);
    return cachedDocumentFields;
  } catch (error) {
    console.error("Ошибка загрузки полей документов из fields_schema.csv:", error.message);
    cachedDocumentFields = DEFAULT_DOCUMENT_FIELDS;
    return cachedDocumentFields;
  }
}

/**
 * Сбрасывает кэш колонок (для тестов или перезагрузки схемы)
 */
export function resetEmployeeColumnsCache() {
  cachedEmployeeColumns = null;
  cachedDocumentFields = null;
  cachedFieldIdMap = null;
  cachedFieldSchema = null;
  cachedRawFieldSchema = null;
}

/**
 * Возвращает закэшированные колонки (синхронно)
 * Должен быть вызван после loadEmployeeColumns()
 * @returns {string[]}
 */
export function getCachedEmployeeColumns() {
  return cachedEmployeeColumns || DEFAULT_EMPLOYEE_COLUMNS;
}

/**
 * Возвращает закэшированные поля документов (синхронно)
 * Должен быть вызван после loadDocumentFields()
 * @returns {string[]}
 */
export function getCachedDocumentFields() {
  return cachedDocumentFields || DEFAULT_DOCUMENT_FIELDS;
}

/**
 * Возвращает закэшированные сырые строки fields_schema.csv (синхронно).
 * Populated by loadEmployeeColumns(). Used by loadFieldsSchema() in store.js
 * to return consistent (old) schema during migration windows instead of reading
 * the newly-written schema file before CSV column renames have been applied.
 * @returns {Array|null}
 */
export function getCachedRawFieldSchema() {
  return cachedRawFieldSchema;
}

/**
 * Возвращает закэшированную карту field_id → field_name (синхронно)
 * Должен быть вызван после loadEmployeeColumns()
 * @returns {Map<string, string>|null}
 */
export function getCachedFieldIdMap() {
  return cachedFieldIdMap;
}

/**
 * Возвращает закэшированную полную схему полей (синхронно)
 * Каждый элемент: { field_id, field_name, field_label, field_type, field_options, field_group, role }
 * Должен быть вызван после loadEmployeeColumns()
 * @returns {Array|null}
 */
export function getCachedFieldSchema() {
  return cachedFieldSchema;
}

// Для обратной совместимости экспортируем дефолтные колонки
export const EMPLOYEE_COLUMNS = DEFAULT_EMPLOYEE_COLUMNS;
export const DOCUMENT_FIELDS = DEFAULT_DOCUMENT_FIELDS;

export const FIELD_SCHEMA_COLUMNS = [
  "field_id",
  "field_order",
  "field_name",
  "field_label",
  "field_type",
  "field_options",
  "show_in_table",
  "field_group",
  "editable_in_table",
  "role"
];

export const LOG_COLUMNS = [
  "log_id",
  "timestamp",
  "action",
  "employee_id",
  "employee_name",
  "field_name",
  "old_value",
  "new_value",
  "details"
];

export const STATUS_HISTORY_COLUMNS = [
  "history_id",
  "employee_id",
  "old_status",
  "new_status",
  "old_start_date",
  "old_end_date",
  "new_start_date",
  "new_end_date",
  "changed_at",
  "changed_by"
];

export const REPRIMAND_COLUMNS = [
  "record_id",
  "employee_id",
  "record_date",
  "record_type",
  "order_number",
  "note",
  "created_at"
];

export const STATUS_EVENT_COLUMNS = [
  "event_id",
  "employee_id",
  "status",
  "start_date",
  "end_date",
  "created_at",
  "active"
];

export const FIELD_MAPPING_COLUMNS = [
  "field_id",
  "field_name"
];

export const TEMPLATE_COLUMNS = [
  "template_id",
  "template_name",
  "template_type",
  "docx_filename",
  "placeholder_fields",
  "description",
  "created_date",
  "active"
];

