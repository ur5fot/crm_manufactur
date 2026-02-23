import { ref, computed } from "vue";
import { api } from "../api";

// Role constants matching backend ROLES in field-utils.js
export const ROLES = {
  PHOTO: 'PHOTO',
  EMPLOYEE_ID: 'EMPLOYEE_ID',
  LAST_NAME: 'LAST_NAME',
  FIRST_NAME: 'FIRST_NAME',
  MIDDLE_NAME: 'MIDDLE_NAME',
  BIRTH_DATE: 'BIRTH_DATE',
  GENDER: 'GENDER',
  STATUS: 'STATUS',
  STATUS_START: 'STATUS_START',
  STATUS_END: 'STATUS_END',
  GRADE: 'GRADE',
  POSITION: 'POSITION',
  INDECL_NAME: 'INDECL_NAME',
  INDECL_FIRST: 'INDECL_FIRST',
  INDECL_GRADE: 'INDECL_GRADE',
  INDECL_POSITION: 'INDECL_POSITION',
};

// Shared state for fields schema (singleton pattern)
const allFieldsSchema = ref([]);
const fieldGroups = ref([]);
const summaryColumns = ref([]);
const dictionaries = ref({});
const documentFields = ref([]);
let isLoaded = false;

export function useFieldsSchema() {
  async function loadFieldsSchema() {
    // Avoid reloading if already loaded
    if (isLoaded) {
      return;
    }

    try {
      const data = await api.getFieldsSchema();

      // Формируем группы полей для карточек (исключаем группу "Документи" - для неё окрема таблиця)
      const groups = data.groups || {};
      fieldGroups.value = Object.keys(groups)
        .filter(groupName => groupName && groupName !== 'Документи')
        .map(groupName => ({
          title: groupName,
          fields: groups[groupName]
            .filter(field => field.type !== 'photo')
            .map(field => ({
              key: field.key,
              fieldId: field.fieldId || '',
              label: field.label,
              type: field.type,
              role: field.role || '',
              optionsKey: field.type === 'select' ? field.key : undefined,
              readOnly: field.role === ROLES.EMPLOYEE_ID
            }))
        }));

      // Формируем колонки для сводной таблицы
      summaryColumns.value = (data.tableFields || []).map(field => ({
        key: field.key,
        fieldId: field.fieldId || '',
        label: field.label,
        editable: field.editableInTable,
        type: field.type,
        role: field.role || '',
        optionsKey: field.type === 'select' ? field.key : undefined
      }));

      // Сохраняем все поля для использования
      allFieldsSchema.value = data.allFields || [];

      // Формируем dictionaries из options
      const dict = {};
      allFieldsSchema.value.forEach(field => {
        if (field.type === 'select' && field.options && field.options.length > 0) {
          dict[field.key] = field.options.map(opt => ({
            value: opt,
            label: opt
          }));
        }
      });
      dictionaries.value = dict;

      // Динамический список документов из fields_schema
      documentFields.value = allFieldsSchema.value
        .filter(field => field.type === 'file')
        .map(field => ({
          key: field.key,
          label: field.label
        }));

      isLoaded = true;
    } catch (error) {
      console.error("Failed to load fields schema:", error);
    }
  }

  function getFieldType(fieldName) {
    const field = allFieldsSchema.value.find(f => f.key === fieldName);
    return field?.type || 'text';
  }

  function getFieldLabel(fieldName) {
    const field = allFieldsSchema.value.find(f => f.key === fieldName);
    return field?.label || fieldName;
  }

  function getFieldByRole(role) {
    if (!role) return null;
    return allFieldsSchema.value.find(f => f.role === role) || null;
  }

  function getFieldNameByRole(role) {
    const field = getFieldByRole(role);
    return field ? field.key : null;
  }

  return {
    allFieldsSchema,
    fieldGroups,
    summaryColumns,
    dictionaries,
    documentFields,
    loadFieldsSchema,
    getFieldType,
    getFieldLabel,
    getFieldByRole,
    getFieldNameByRole
  };
}
