/**
 * Role-based field resolution utilities.
 *
 * Provides lookup functions for finding fields by their semantic role
 * instead of hardcoded field_name strings. This decouples business logic
 * from field naming, allowing field_name to be freely renamed.
 */

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

/**
 * Find a field object by its role.
 * @param {Array} schema - Array of field objects (each with .role property)
 * @param {string} role - Role to look up (e.g. ROLES.STATUS)
 * @returns {object|null} Full field object or null if not found
 */
export function getFieldByRole(schema, role) {
  if (!schema || !role) return null;
  return schema.find(f => f.role === role) || null;
}

/**
 * Get field_name for a given role.
 * @param {Array} schema - Array of field objects
 * @param {string} role - Role to look up
 * @returns {string|null} field_name or null
 */
export function getFieldNameByRole(schema, role) {
  const field = getFieldByRole(schema, role);
  return field ? field.field_name : null;
}

/**
 * Get field_id for a given role.
 * @param {Array} schema - Array of field objects
 * @param {string} role - Role to look up
 * @returns {string|null} field_id or null
 */
export function getFieldIdByRole(schema, role) {
  const field = getFieldByRole(schema, role);
  return field ? field.field_id : null;
}

/**
 * Build a Map from field_id to field_name.
 * @param {Array} schema - Array of field objects
 * @returns {Map<string, string>}
 */
export function buildFieldIdToNameMap(schema) {
  const map = new Map();
  if (!schema) return map;
  for (const field of schema) {
    if (field.field_id && field.field_name) {
      map.set(field.field_id, field.field_name);
    }
  }
  return map;
}

/**
 * Build a Map from field_name to field_id.
 * @param {Array} schema - Array of field objects
 * @returns {Map<string, string>}
 */
export function buildFieldNameToIdMap(schema) {
  const map = new Map();
  if (!schema) return map;
  for (const field of schema) {
    if (field.field_id && field.field_name) {
      map.set(field.field_name, field.field_id);
    }
  }
  return map;
}

/**
 * Get the field_name values for name-related fields (last, first, middle).
 * @param {Array} schema - Array of field objects
 * @returns {{ lastName: string|null, firstName: string|null, middleName: string|null }}
 */
export function buildNameFields(schema) {
  return {
    lastName: getFieldNameByRole(schema, ROLES.LAST_NAME),
    firstName: getFieldNameByRole(schema, ROLES.FIRST_NAME),
    middleName: getFieldNameByRole(schema, ROLES.MIDDLE_NAME),
  };
}

/**
 * Get the field_name values for status-related fields.
 * @param {Array} schema - Array of field objects
 * @returns {{ status: string|null, startDate: string|null, endDate: string|null }}
 */
export function buildStatusFields(schema) {
  return {
    status: getFieldNameByRole(schema, ROLES.STATUS),
    startDate: getFieldNameByRole(schema, ROLES.STATUS_START),
    endDate: getFieldNameByRole(schema, ROLES.STATUS_END),
  };
}

/**
 * Build a display name from an employee record using role-based field resolution.
 * @param {object} emp - Employee record
 * @param {Array} schema - Array of field objects
 * @returns {string} Display name (e.g. "Петренко Іван Миколайович")
 */
export function buildEmployeeName(emp, schema) {
  const { lastName, firstName, middleName } = buildNameFields(schema);
  const parts = [
    lastName ? emp[lastName] : '',
    firstName ? emp[firstName] : '',
    middleName ? emp[middleName] : '',
  ].filter(p => p && p.trim() !== '');
  return parts.join(' ');
}
