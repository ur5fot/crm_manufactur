<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api";
import { useFieldsSchema } from "../composables/useFieldsSchema";
import { useCustomReport } from "../composables/useCustomReport";

const {
  allFieldsSchema,
  documentFields,
  loadFieldsSchema,
  getFieldType
} = useFieldsSchema();

// App config
const appConfig = ref({
  max_report_preview_rows: 100
});

const {
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
} = useCustomReport(allFieldsSchema, documentFields, getFieldType, appConfig);

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
