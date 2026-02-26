/**
 * Builds quantity placeholders for all select-type fields in the schema.
 *
 * For each select field, generates:
 * - {f_<field_id>_quantity} — total count of all employees
 * - {f_<field_id>_option<N>_quantity} — count of employees with that option value (1-indexed)
 *
 * @param {Array} schema - fields_schema entries
 * @param {Array} employees - active employee records
 * @returns {Object} plain object with quantity placeholder keys and string values
 */
export function buildQuantityPlaceholders(schema, employees) {
  const result = {};
  const selectFields = schema.filter(f => f.field_type === 'select');
  const totalCount = employees.length;

  for (const field of selectFields) {
    const fieldId = field.field_id;
    if (!fieldId) continue;

    // Total: all active employees
    result[`${fieldId}_quantity`] = String(totalCount);

    // Per-option counts
    const options = field.field_options ? field.field_options.split('|').filter(Boolean) : [];
    options.forEach((optionValue, index) => {
      const count = employees.filter(e => e[field.field_name] === optionValue).length;
      result[`${fieldId}_option${index + 1}_quantity`] = String(count);
    });
  }

  // present_quantity / absent_quantity based on STATUS role field
  const statusField = schema.find(f => f.role === 'STATUS' && f.field_type === 'select');
  if (statusField && statusField.field_id) {
    const options = statusField.field_options ? statusField.field_options.split('|').filter(Boolean) : [];
    const workingStatus = options[0] || '';    // e.g. "Працює"
    const dismissedStatus = options[1] || '';  // e.g. "Звільнений"
    const statusFieldName = statusField.field_name;

    if (workingStatus) {
      result['present_quantity'] = String(
        employees.filter(e => e[statusFieldName] === workingStatus).length
      );
      result['absent_quantity'] = String(
        employees.filter(e => {
          const v = e[statusFieldName];
          return v && v !== workingStatus && v !== dismissedStatus;
        }).length
      );
    }
  }

  return result;
}
