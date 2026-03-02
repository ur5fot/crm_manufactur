<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { useFieldsSchema } from "../composables/useFieldsSchema";
import { useTableColumnFilters } from "../composables/useTableColumnFilters";
import { useTableSort } from "../composables/useTableSort";
const router = useRouter();

// Use shared fields schema composable
const { summaryColumns, dictionaries, loadFieldsSchema, allFieldsSchema } = useFieldsSchema();

// State
const employees = ref([]);
const searchTerm = ref("");
const loading = ref(false);
const errorMessage = ref("");

// Composables
const {
  columnFilters,
  toggleFilter,
  isFilterChecked,
  clearAllFilters,
  getActiveFiltersCount,
  hasActiveFilters,
  getColumnFilterCount,
} = useTableColumnFilters();

const {
  sortColumn,
  sortDirection,
  toggleSort,
  sortData,
} = useTableSort();

// Computed filtered employees
const filteredEmployees = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  let result = employees.value;

  // Text search across all text fields from schema
  if (query) {
    const searchableKeys = allFieldsSchema.value
      .filter(f => !['file', 'photo'].includes(f.type))
      .map(f => f.key);
    result = result.filter((employee) => {
      const haystack = searchableKeys
        .map(k => employee[k] || '')
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  // Column filters
  Object.keys(columnFilters).forEach((fieldName) => {
    const filterValues = columnFilters[fieldName];
    if (filterValues && filterValues.length > 0) {
      result = result.filter((employee) => {
        const value = employee[fieldName];
        // Check for empty value
        if (filterValues.includes("__EMPTY__")) {
          if (!value || value.trim() === "") {
            return true;
          }
        }
        // Check for specific values
        return filterValues.includes(value);
      });
    }
  });

  const allColumns = [{ key: "employee_id", type: "number" }, ...summaryColumns.value];
  return sortData(result, allColumns);
});

// Load employees
async function loadEmployees() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

// Export table data
async function exportTableData() {
  errorMessage.value = '';
  try {
    await api.exportCSV(columnFilters, searchTerm.value);
  } catch (e) {
    console.error('Export error:', e);
    errorMessage.value = `Помилка експорту: ${e.message}`;
  }
}

// Open employee card in new tab
function openEmployeeCardNewWindow(employeeId) {
  const route = router.resolve({ name: 'cards', params: { id: employeeId } });
  const newWindow = window.open(route.href, '_blank');
  if (!newWindow) {
    router.push(route);
  }
}

// Lifecycle
onMounted(async () => {
  await loadFieldsSchema();
  await loadEmployees();
});
</script>

<template>
  <div class="layout-table">
    <div class="panel table-panel">
      <div class="panel-header">
        <div class="panel-title">CRM Виробництво - Зведена таблиця</div>
        <div class="actions">
          <button
            v-if="getActiveFiltersCount() > 0"
            class="secondary"
            type="button"
            @click="clearAllFilters"
          >
            Скинути фільтри ({{ getActiveFiltersCount() }})
          </button>
          <button class="export-btn" type="button" @click="exportTableData">
            Експорт
          </button>
          <div class="status-bar">
            <span v-if="loading">Завантаження...</span>
            <span v-else>{{ filteredEmployees.length }} записів</span>
          </div>
        </div>
      </div>

      <input
        v-model="searchTerm"
        class="search-input"
        type="search"
        placeholder="Пошук за ПІБ, підрозділом або ID"
      />

      <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>

      <div class="table-container">
        <table class="summary-table">
          <thead>
            <tr>
              <th class="sortable-th" style="text-align: center;" title="ID співробітника" @click="toggleSort('employee_id')">
                ID
                <span v-if="sortColumn === 'employee_id'" class="sort-indicator">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th v-for="col in summaryColumns" :key="col.key" class="filterable-column sortable-th" @click="toggleSort(col.key)">
                <div class="th-content">
                  <div class="th-label">
                    {{ col.label }}
                    <span v-if="sortColumn === col.key" class="sort-indicator">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                    <span v-if="col.type === 'select'" class="filter-icon" :class="{ 'has-filters': hasActiveFilters(col.key) }" @click.stop>
                      🔽
                      <span v-if="getColumnFilterCount(col.key) > 0" class="filter-count">{{ getColumnFilterCount(col.key) }}</span>
                    </span>
                  </div>

                  <!-- Dropdown with filters -->
                  <div v-if="col.type === 'select'" class="filter-dropdown" @click.stop>
                    <div class="filter-dropdown-content">
                      <label class="filter-checkbox-label">
                        <input
                          type="checkbox"
                          :checked="isFilterChecked(col.key, '__EMPTY__')"
                          @change="toggleFilter(col.key, '__EMPTY__')"
                          class="filter-checkbox"
                        />
                        <span class="filter-checkbox-text">(Порожньо)</span>
                      </label>
                      <label
                        v-for="option in dictionaries[col.optionsKey] || []"
                        :key="option.value"
                        class="filter-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          :checked="isFilterChecked(col.key, option.value)"
                          @change="toggleFilter(col.key, option.value)"
                          class="filter-checkbox"
                        />
                        <span class="filter-checkbox-text">{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="employee in filteredEmployees"
              :key="employee.employee_id"
              class="table-row"
              @dblclick="openEmployeeCardNewWindow(employee.employee_id)"
            >
              <td class="id-cell" :title="'ID: ' + employee.employee_id">{{ employee.employee_id }}</td>
              <td
                v-for="col in summaryColumns"
                :key="col.key"
              >
                {{ employee[col.key] || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
