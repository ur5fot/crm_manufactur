<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { api } from "../api";
import { useFieldsSchema } from "../composables/useFieldsSchema";

const {
  allFieldsSchema,
  documentFields,
  loadFieldsSchema,
  getFieldType
} = useFieldsSchema();

// Custom reports state
const customFilters = ref([]);
const customReportResults = ref([]);
const customReportLoading = ref(false);
const selectedColumns = ref([]);
const reportSortColumn = ref(null);
const reportSortDirection = ref('asc');
const columnSearchTerm = ref('');
const errorMessage = ref('');

// App config
const appConfig = ref({
  max_report_preview_rows: 100
});

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

// Load config
onMounted(async () => {
  await loadFieldsSchema();
  await loadConfig();
});

async function loadConfig() {
  try {
    const data = await api.getConfig();
    appConfig.value = data;
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

// Get filter condition options based on field type
const filterConditionOptions = (filter) => {
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
};

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

  // Build lookup map for all fields including document date fields
  const allColumnsMap = {};
  filteredColumnsForSelector.value.forEach(col => {
    allColumnsMap[col.key] = col.label;
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
</script>

<template>
  <div class="layout-table">
    <div class="panel table-panel">
      <div class="panel-header">
        <div class="panel-title">Користувацькі звіти</div>
      </div>

      <div class="custom-reports-container">
        <!-- Filter Builder -->
        <div class="filter-builder">
          <h3>Фільтри</h3>
          <div v-for="(filter, index) in customFilters" :key="index" class="filter-row">
            <select v-model="filter.field" class="filter-field">
              <option value="">-- Виберіть поле --</option>
              <option v-for="field in allFieldsSchema" :key="field.key" :value="field.key">
                {{ field.label }}
              </option>
            </select>

            <select v-model="filter.condition" class="filter-condition">
              <option v-for="opt in filterConditionOptions(filter)" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>

            <!-- Date range: show two date inputs -->
            <template v-if="filter.condition === 'date_range'">
              <input
                v-model="filter.valueFrom"
                type="date"
                class="filter-value"
                placeholder="Від"
              />
              <input
                v-model="filter.valueTo"
                type="date"
                class="filter-value"
                placeholder="До"
              />
            </template>

            <!-- Number field: show number input -->
            <input
              v-else-if="filter.condition && !['empty', 'not_empty'].includes(filter.condition) && (getFieldType(filter.field) === 'number' || filter.field === 'salary_amount')"
              v-model="filter.value"
              type="number"
              class="filter-value"
              placeholder="Значення"
            />

            <!-- Text field: show text input -->
            <input
              v-else-if="filter.condition && !['empty', 'not_empty', 'date_range'].includes(filter.condition)"
              v-model="filter.value"
              type="text"
              class="filter-value"
              placeholder="Значення"
            />

            <button type="button" class="btn-remove-filter" @click="removeCustomFilter(index)" title="Видалити фільтр">
              ✕
            </button>
          </div>

          <div class="filter-actions">
            <button type="button" class="secondary" @click="addCustomFilter">
              Додати фільтр
            </button>
            <button type="button" class="secondary" @click="clearCustomFilters">
              Очистити фільтри
            </button>
          </div>
        </div>

        <!-- Column Selector -->
        <div class="column-selector">
          <h3>Колонки для експорту</h3>
          <p class="help-text">Не вибрано жодної колонки = експортуються всі колонки з таблиці</p>
          <input
            type="text"
            v-model="columnSearchTerm"
            placeholder="Пошук полів..."
            style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem; border: 1px solid #ccc; border-radius: 4px;"
          />
          <div class="column-checkboxes">
            <label v-for="field in filteredColumnsForSelector" :key="field.key" class="column-checkbox">
              <input
                type="checkbox"
                :value="field.key"
                v-model="selectedColumns"
              />
              {{ field.label }}
            </label>
          </div>
          <p class="hint-text" style="font-size: 0.85rem; color: #666; margin-top: 0.5rem;">
            💡 Підказка: звіт автоматично виконується після вибору колонок
          </p>
        </div>

        <!-- Run Report Button -->
        <div class="report-actions">
          <button type="button" class="primary" @click="runCustomReport" :disabled="customReportLoading">
            {{ customReportLoading ? 'Завантаження...' : 'Виконати звіт' }}
          </button>
          <button
            type="button"
            class="secondary"
            @click="exportCustomReportCSV"
            :disabled="customReportResults.length === 0"
          >
            Експорт в CSV
          </button>
        </div>

        <!-- Results Preview -->
        <div v-if="customReportResults.length > 0" class="report-preview">
          <h3>Попередній перегляд результатів</h3>
          <div class="status-bar">
            <span>Знайдено записів: {{ customReportResults.length }} (показано: {{ Math.min(customReportResults.length, parseInt(appConfig.max_report_preview_rows) || 100) }})</span>
          </div>
          <div class="table-container">
            <table class="summary-table">
              <thead>
                <tr>
                  <th>
                    №
                  </th>
                  <th v-for="field in (selectedColumns.length > 0 ? selectedColumns : allFieldsSchema.filter(f => f.showInTable).map(f => f.key))" :key="field" style="cursor: pointer;" @click="sortReportPreview(field)">
                    {{ filteredColumnsForSelector.find(f => f.key === field)?.label || allFieldsSchema.find(f => f.key === field)?.label || field }}
                    <span v-if="reportSortColumn === field">
                      {{ reportSortDirection === 'asc' ? '↑' : '↓' }}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(emp, idx) in customReportResults.slice(0, parseInt(appConfig.max_report_preview_rows) || 100)" :key="emp.employee_id || idx">
                  <td>{{ idx + 1 }}</td>
                  <td v-for="field in (selectedColumns.length > 0 ? selectedColumns : allFieldsSchema.filter(f => f.showInTable).map(f => f.key))" :key="field">
                    {{ emp[field] || '' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else-if="customReportResults.length === 0 && !customReportLoading && customFilters.length > 0" class="alert">
          За обраними фільтрами не знайдено результатів
        </div>

        <div v-if="errorMessage" class="alert">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>
