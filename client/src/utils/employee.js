/**
 * Employee-related utility functions
 */

/**
 * Generate display name for an employee using schema-driven field resolution.
 * @param {Object} employee - Employee object
 * @param {Array} [schema] - Optional fields schema array (each item has .role and .key).
 *   When provided, name fields are resolved via LAST_NAME/FIRST_NAME/MIDDLE_NAME roles.
 *   When omitted, falls back to hardcoded field names for backwards compatibility.
 * @returns {string} Formatted display name
 */
export function displayName(employee, schema) {
  if (!employee) return '';

  let lastName, firstName, middleName, empId;

  if (schema && schema.length > 0) {
    const lastNameField = schema.find(f => f.role === 'LAST_NAME');
    const firstNameField = schema.find(f => f.role === 'FIRST_NAME');
    const middleNameField = schema.find(f => f.role === 'MIDDLE_NAME');
    const empIdField = schema.find(f => f.role === 'EMPLOYEE_ID');
    lastName = lastNameField ? employee[lastNameField.key] : employee.last_name;
    firstName = firstNameField ? employee[firstNameField.key] : employee.first_name;
    middleName = middleNameField ? employee[middleNameField.key] : employee.middle_name;
    empId = empIdField ? employee[empIdField.key] : employee.employee_id;
  } else {
    lastName = employee.last_name;
    firstName = employee.first_name;
    middleName = employee.middle_name;
    empId = employee.employee_id;
  }

  const parts = [lastName, firstName, middleName].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : `ID: ${empId || 'Unknown'}`;
}
