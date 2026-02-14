import { ref, computed } from "vue";
import { api } from "../api";

// Module-level cache so schema is loaded once and shared across views
let schemaPromise = null;

const allFieldsSchema = ref([]);
const fieldGroups = ref([]);
const summaryColumns = ref([]);
const dictionaries = ref({});

const documentFields = computed(() => {
  return allFieldsSchema.value
    .filter(field => field.type === 'file')
    .map(field => ({
      key: field.key,
      label: field.label
    }));
});

function getFieldType(fieldName) {
  const field = allFieldsSchema.value.find(f => f.key === fieldName);
  return field?.type || 'text';
}

function getFieldLabel(fieldName) {
  const field = allFieldsSchema.value.find(f => f.key === fieldName);
  return field?.label || fieldName;
}

async function loadFieldsSchema() {
  // Return cached promise if already loading or loaded
  if (schemaPromise) return schemaPromise;

  schemaPromise = _doLoad();
  return schemaPromise;
}

async function _doLoad() {
  try {
    const data = await api.getFieldsSchema();

    // Field groups for employee card form (exclude "Документи" - separate table)
    const groups = data.groups || {};
    fieldGroups.value = Object.keys(groups)
      .filter(groupName => groupName && groupName !== 'Документи')
      .map(groupName => ({
        title: groupName,
        fields: groups[groupName].map(field => ({
          key: field.key,
          label: field.label,
          type: field.type,
          optionsKey: field.type === 'select' ? field.key : undefined,
          readOnly: field.key === 'employee_id'
        }))
      }));

    // Table columns
    summaryColumns.value = (data.tableFields || []).map(field => ({
      key: field.key,
      label: field.label,
      editable: field.editableInTable,
      type: field.type,
      optionsKey: field.type === 'select' ? field.key : undefined
    }));

    // All fields
    allFieldsSchema.value = data.allFields || [];

    // Dictionaries from select field options
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

  } catch (error) {
    console.error("Failed to load fields schema:", error);
    // Reset promise so retry is possible
    schemaPromise = null;
  }
}

// Force reload (useful when schema changes)
async function reloadFieldsSchema() {
  schemaPromise = null;
  return loadFieldsSchema();
}

export function useFieldsSchema() {
  return {
    allFieldsSchema,
    fieldGroups,
    summaryColumns,
    dictionaries,
    documentFields,
    getFieldType,
    getFieldLabel,
    loadFieldsSchema,
    reloadFieldsSchema
  };
}
