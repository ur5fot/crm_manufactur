/**
 * Employee-related utility functions
 */

/**
 * Generate display name for an employee
 * @param {Object} employee - Employee object with last_name, first_name, middle_name
 * @returns {string} Formatted display name
 */
export function displayName(employee) {
  if (!employee) return '';

  const parts = [
    employee.last_name,
    employee.first_name,
    employee.middle_name
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : `ID: ${employee.employee_id || 'Unknown'}`;
}
