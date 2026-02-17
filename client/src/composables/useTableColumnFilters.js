import { reactive } from "vue";

export function useTableColumnFilters() {
  const columnFilters = reactive({}); // { fieldName: selectedValue[] }

  function toggleFilter(fieldName, value) {
    if (!columnFilters[fieldName]) {
      columnFilters[fieldName] = [];
    }

    const index = columnFilters[fieldName].indexOf(value);
    if (index === -1) {
      columnFilters[fieldName].push(value);
    } else {
      columnFilters[fieldName].splice(index, 1);
    }

    // Remove empty arrays
    if (columnFilters[fieldName].length === 0) {
      delete columnFilters[fieldName];
    }
  }

  function isFilterChecked(fieldName, value) {
    return columnFilters[fieldName]?.includes(value) || false;
  }

  function clearAllFilters() {
    Object.keys(columnFilters).forEach(key => {
      delete columnFilters[key];
    });
  }

  function getActiveFiltersCount() {
    return Object.keys(columnFilters).reduce((count, key) => {
      return count + (columnFilters[key]?.length || 0);
    }, 0);
  }

  function hasActiveFilters(fieldName) {
    return columnFilters[fieldName] && columnFilters[fieldName].length > 0;
  }

  function getColumnFilterCount(fieldName) {
    return columnFilters[fieldName]?.length || 0;
  }

  return {
    columnFilters,
    toggleFilter,
    isFilterChecked,
    clearAllFilters,
    getActiveFiltersCount,
    hasActiveFilters,
    getColumnFilterCount,
  };
}
