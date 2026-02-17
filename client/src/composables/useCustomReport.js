import { ref, computed, watch } from "vue";
import { api } from "../api";

export function useCustomReport(allFieldsSchema, documentFields, getFieldType) {
  const customFilters = ref([]);
  const customReportResults = ref([]);
  const customReportLoading = ref(false);
  const selectedColumns = ref([]);
  const reportSortColumn = ref(null);
  const reportSortDirection = ref('asc');
  const columnSearchTerm = ref('');
  const errorMessage = ref('');

  // Watch for filter field changes to reset condition if field type changes
  watch(() => customFilters.value, (newFilters, oldFilters) => {
    if (!oldFilters) return;

    newFilters.forEach((filter, index) => {
      const oldFilter = oldFilters[index];
      if (!oldFilter || !filter.field || !oldFilter.field) return;

      // If field changed, check if current condition is still valid
      if (filter.field !== oldFilter.field) {
        const newFieldType = getFieldType(filter.field);
        const oldFieldType = getFieldType(oldFilter.field);

        // If field type changed, reset condition to first available option
        if (newFieldType !== oldFieldType) {
          const availableOptions = filterConditionOptions(filter);
          filter.condition = availableOptions[0]?.value || 'contains';
          filter.value = '';
          filter.valueFrom = '';
          filter.valueTo = '';
        }
      }
    });
  }, { deep: true });

  // Computed property for filtering column selector
  const filteredColumnsForSelector = computed(() => {
    const searchLower = columnSearchTerm.value.toLowerCase().trim();

    // Build list: all regular fields + document date fields
    const regularFields = allFieldsSchema.value.map(f => ({
      key: f.key,
      label: f.label
    }));

    // Add document date fields
    const docFields = documentFields.value;
    const dateFields = [];
    docFields.forEach(doc => {
      dateFields.push({
        key: `${doc.key}_issue_date`,
        label: `${doc.label} - Дата видачі`
      });
      dateFields.push({
        key: `${doc.key}_expiry_date`,
        label: `${doc.label} - Дата закінчення`
      });
    });

    const allColumns = [...regularFields, ...dateFields];

    // Filter by search term if provided
    if (!searchLower) {
      return allColumns;
    }

    return allColumns.filter(col =>
      col.label.toLowerCase().includes(searchLower)
    );
  });

  // Get filter condition options based on field type
  function filterConditionOptions(filter) {
    if (!filter || !filter.field) {
      return [
        { value: 'contains', label: 'Містить' },
        { value: 'empty', label: 'Порожнє' },
        { value: 'not_empty', label: 'Не порожнє' }
      ];
    }

    const fieldType = getFieldType(filter.field);

    if (fieldType === 'number' || filter.field === 'salary_amount') {
      return [
        { value: 'greater_than', label: 'Більше ніж' },
        { value: 'less_than', label: 'Менше ніж' },
        { value: 'equals', label: 'Дорівнює' },
        { value: 'empty', label: 'Порожнє' },
        { value: 'not_empty', label: 'Не порожнє' }
      ];
    }

    if (fieldType === 'date') {
      return [
        { value: 'date_range', label: 'Період від-до' },
        { value: 'empty', label: 'Порожнє' },
        { value: 'not_empty', label: 'Не порожнє' }
      ];
    }

    // Default for text, select, textarea, etc.
    return [
      { value: 'contains', label: 'Містить' },
      { value: 'not_contains', label: 'Не містить' },
      { value: 'empty', label: 'Порожнє' },
      { value: 'not_empty', label: 'Не порожнє' }
    ];
  }

  function addCustomFilter() {
    customFilters.value.push({
      field: '',
      condition: 'contains',
      value: '',
      valueFrom: '',
      valueTo: ''
    });
  }

  function removeCustomFilter(index) {
    customFilters.value.splice(index, 1);
  }

  function clearCustomFilters() {
    customFilters.value = [];
    customReportResults.value = [];
  }

  async function runCustomReport() {
    customReportLoading.value = true;
    errorMessage.value = '';
    try {
      const validFilters = customFilters.value.filter(f => f.field && f.condition);
      const columns = selectedColumns.value.length > 0 ? selectedColumns.value : null;
      const data = await api.getCustomReport(validFilters, columns);
      customReportResults.value = data.results || [];
    } catch (error) {
      errorMessage.value = error.message;
      customReportResults.value = [];
    } finally {
      customReportLoading.value = false;
    }
  }

  function exportCustomReportCSV() {
    if (customReportResults.value.length === 0) {
      alert('Немає даних для експорту');
      return;
    }

    const schema = allFieldsSchema.value;
    const columns = selectedColumns.value.length > 0
      ? selectedColumns.value
      : schema.filter(f => f.showInTable).map(f => f.key);

    // Build lookup map for all fields including document date fields (use unfiltered list)
    const allColumnsMap = {};
    allFieldsSchema.value.forEach(f => {
      allColumnsMap[f.key] = f.label;
    });
    const docFields = documentFields.value;
    docFields.forEach(doc => {
      allColumnsMap[`${doc.key}_issue_date`] = `${doc.label} - Дата видачі`;
      allColumnsMap[`${doc.key}_expiry_date`] = `${doc.label} - Дата закінчення`;
    });

    const headers = columns.map(col => {
      return allColumnsMap[col] || col;
    });

    const rows = customReportResults.value.map(emp => {
      return columns.map(col => {
        const val = emp[col];
        if (val == null || val === '') return '';
        const strVal = String(val).replace(/"/g, '""');
        return strVal.includes(';') || strVal.includes('"') || strVal.includes('\n')
          ? `"${strVal}"`
          : strVal;
      });
    });

    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `report_${timestamp}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function sortReportPreview(fieldKey) {
    // Toggle sort direction if clicking same column, otherwise default to ascending
    if (reportSortColumn.value === fieldKey) {
      reportSortDirection.value = reportSortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
      reportSortColumn.value = fieldKey;
      reportSortDirection.value = 'asc';
    }

    // Sort the results array
    customReportResults.value.sort((a, b) => {
      const valA = a[fieldKey] || '';
      const valB = b[fieldKey] || '';

      // Try numeric comparison first
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return reportSortDirection.value === 'asc' ? numA - numB : numB - numA;
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (reportSortDirection.value === 'asc') {
        return strA.localeCompare(strB);
      } else {
        return strB.localeCompare(strA);
      }
    });
  }

  return {
    customFilters,
    customReportResults,
    customReportLoading,
    selectedColumns,
    reportSortColumn,
    reportSortDirection,
    columnSearchTerm,
    errorMessage,
    filteredColumnsForSelector,
    filterConditionOptions,
    addCustomFilter,
    removeCustomFilter,
    clearCustomFilters,
    runCustomReport,
    exportCustomReportCSV,
    sortReportPreview,
  };
}
