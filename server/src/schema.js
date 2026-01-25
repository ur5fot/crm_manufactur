export const EMPLOYEE_COLUMNS = [
  "employee_id",
  "last_name",
  "first_name",
  "middle_name",
  "employment_status",
  "additional_status",
  "location",
  "department",
  "position",
  "grade",
  "salary_grid",
  "salary_amount",
  "specialty",
  "work_state",
  "work_type",
  "gender",
  "fit_status",
  "order_ref",
  "bank_name",
  "bank_card_number",
  "bank_iban",
  "tax_id",
  "email",
  "blood_group",
  "workplace_location",
  "residence_place",
  "registration_place",
  "driver_license_file",
  "id_certificate_file",
  "foreign_passport_number",
  "foreign_passport_issue_date",
  "foreign_passport_file",
  "criminal_record_file",
  "phone",
  "phone_note",
  "education",
  "notes"
];

export const DOCUMENT_FIELDS = [
  "driver_license_file",
  "id_certificate_file",
  "foreign_passport_file",
  "criminal_record_file"
];

export const DICTIONARY_COLUMNS = [
  "dictionary_id",
  "dictionary_type",
  "value",
  "label",
  "order_index"
];

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
  employee_id: "ID сотрудника",
  last_name: "Фамилия",
  first_name: "Имя",
  middle_name: "Отчество",
  employment_status: "Статус работы",
  additional_status: "Дополнительный статус",
  location: "Местонахождение",
  department: "Подразделение",
  position: "Должность",
  grade: "Разряд",
  salary_grid: "Зарплатная сетка",
  salary_amount: "Оклад",
  specialty: "Специальность",
  work_state: "Рабочее состояние",
  work_type: "Тип работы",
  gender: "Пол",
  fit_status: "Пригодность",
  order_ref: "Приказ",
  bank_name: "Банк",
  bank_card_number: "Номер карты",
  bank_iban: "IBAN",
  tax_id: "ИНН",
  email: "Эл. почта",
  blood_group: "Группа крови",
  workplace_location: "Место работы",
  residence_place: "Место проживания",
  registration_place: "Место регистрации",
  driver_license_file: "Водительское удостоверение",
  id_certificate_file: "Удостоверение личности",
  foreign_passport_number: "Номер загранпаспорта",
  foreign_passport_issue_date: "Дата выдачи загранпаспорта",
  foreign_passport_file: "Загранпаспорт",
  criminal_record_file: "Справка о несудимости",
  phone: "Телефон",
  phone_note: "Примечание к телефону",
  education: "Образование",
  notes: "Примечание"
};
