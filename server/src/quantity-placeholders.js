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

  return result;
}
