// Fallback список колонок если fields_schema.csv недоступен
// Должен соответствовать fields_schema.template.csv
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

// Для обратной совместимости экспортируем дефолтные колонки
export const EMPLOYEE_COLUMNS = DEFAULT_EMPLOYEE_COLUMNS;
export const DOCUMENT_FIELDS = DEFAULT_DOCUMENT_FIELDS;

export const FIELD_SCHEMA_COLUMNS = [
  "field_order",
  "field_name",
  "field_label",
  "field_type",
  "field_options",
  "show_in_table",
  "field_group",
  "editable_in_table"
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

export const FIELD_LABELS = {
  photo: "Фото",
  employee_id: "ID сотрудника",
  last_name: "Фамилия",
  first_name: "Имя",
  middle_name: "Отчество",
  employment_status: "Статус работы",
  additional_status: "Дополнительный статус",
  gender: "Пол",
  blood_group: "Группа крови",
  department: "Подразделение",
  grade: "Разряд",
  position: "Должность",
  specialty: "Специальность",
  work_state: "Рабочее состояние",
  work_type: "Тип работы",
  fit_status: "Пригодность",
  order_ref: "Приказ",
  location: "Местонахождение",
  residence_place: "Место проживания",
  registration_place: "Место регистрации",
  email: "Эл. почта",
  phone: "Телефон",
  phone_note: "Примечание к телефону",
  education: "Образование",
  salary_grid: "Зарплатная сетка",
  salary_amount: "Оклад",
  bank_name: "Банк",
  bank_card_number: "Номер карты",
  bank_iban: "IBAN",
  tax_id: "ИНН",
  personal_matter_file: "Личное дело",
  medical_commission_file: "Медкомиссия",
  veterans_certificate_file: "Удостоверение ветерана",
  driver_license_file: "Водительское удостоверение",
  id_certificate_file: "Удостоверение личности",
  foreign_passport_number: "Номер загранпаспорта",
  foreign_passport_file: "Загранпаспорт",
  criminal_record_file: "Справка о несудимости",
  military_id_file: "Военный билет",
  medical_certificate_file: "Медицинская справка",
  insurance_file: "Страховой полис",
  education_diploma_file: "Диплом об образовании",
  status_start_date: "Дата начала статуса",
  status_end_date: "Дата окончания статуса",
  notes: "Примечание"
};
