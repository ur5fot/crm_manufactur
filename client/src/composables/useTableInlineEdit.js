import { reactive } from "vue";
import { api } from "../api";

export function useTableInlineEdit(summaryColumns) {
  const editingCells = reactive({}); // { employeeId_fieldName: value }

  function startEditCell(employeeId, fieldName, currentValue) {
    // Check if editing is allowed for this field in table
    const col = summaryColumns.value.find(c => c.key === fieldName);
    if (col && !col.editable) return;

    const key = `${employeeId}_${fieldName}`;
    editingCells[key] = currentValue || "";
  }

  function cancelEditCell(employeeId, fieldName) {
    const key = `${employeeId}_${fieldName}`;
    delete editingCells[key];
  }

  function isEditingCell(employeeId, fieldName) {
    const key = `${employeeId}_${fieldName}`;
    return key in editingCells;
  }

  function getEditValue(employeeId, fieldName) {
    const key = `${employeeId}_${fieldName}`;
    return editingCells[key];
  }

  async function saveCell(employee, fieldName, employees, errorMessage) {
    const key = `${employee.employee_id}_${fieldName}`;
    const newValue = editingCells[key];

    if (newValue === undefined) return;

    errorMessage.value = "";
    try {
      const statusFields = ['employment_status', 'status_start_date', 'status_end_date'];
      // Status fields managed only via popup — don't allow inline editing
      if (statusFields.includes(fieldName)) {
        delete editingCells[key];
        return;
      }
      const updatedEmployee = { ...employee, [fieldName]: newValue };
      // Don't overwrite status fields during inline editing
      for (const sf of statusFields) delete updatedEmployee[sf];
      await api.updateEmployee(employee.employee_id, updatedEmployee);

      // Update local data
      const index = employees.value.findIndex(e => e.employee_id === employee.employee_id);
      if (index !== -1) {
        employees.value[index][fieldName] = newValue;
      }

      delete editingCells[key];
    } catch (error) {
      errorMessage.value = error.message;
    }
  }

  return {
    editingCells,
    startEditCell,
    cancelEditCell,
    isEditingCell,
    getEditValue,
    saveCell,
  };
}
