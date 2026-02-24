<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { useFieldsSchema } from "../composables/useFieldsSchema";
import { useTableInlineEdit } from "../composables/useTableInlineEdit";
import { useTableColumnFilters } from "../composables/useTableColumnFilters";
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
  editingCells,
  startEditCell,
  cancelEditCell,
  isEditingCell,
  getEditValue,
  saveCell: saveCellRaw,
} = useTableInlineEdit(summaryColumns);

const {
  columnFilters,
  toggleFilter,
  isFilterChecked,
  clearAllFilters,
  getActiveFiltersCount,
  hasActiveFilters,
  getColumnFilterCount,
} = useTableColumnFilters();

// Wrap saveCell to pass dependencies
function saveCell(employee, fieldName) {
  return saveCellRaw(employee, fieldName, employees, errorMessage);
}

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

  return result;
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

// Navigate to employee card
function openEmployeeCard(employeeId) {
  router.push({ name: 'cards', params: { id: employeeId } });
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
              <th style="text-align: center;" title="ID співробітника">ID</th>
              <th v-for="col in summaryColumns" :key="col.key" class="filterable-column">
                <div class="th-content">
                  <div class="th-label">
                    {{ col.label }}
                    <span v-if="col.type === 'select'" class="filter-icon" :class="{ 'has-filters': hasActiveFilters(col.key) }">
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
            >
              <td class="id-cell" @dblclick="openEmployeeCard(employee.employee_id)" :title="'ID: ' + employee.employee_id">{{ employee.employee_id }}</td>
              <td
                v-for="col in summaryColumns"
                :key="col.key"
                class="editable-cell"
                @dblclick.stop="startEditCell(employee.employee_id, col.key, employee[col.key])"
              >
                <!-- Edit mode -->
                <div v-if="isEditingCell(employee.employee_id, col.key)" class="edit-cell" @click.stop>
                  <select
                    v-if="col.type === 'select'"
                    v-model="editingCells[`${employee.employee_id}_${col.key}`]"
                    @keydown.enter="saveCell(employee, col.key)"
                    @keydown.esc="cancelEditCell(employee.employee_id, col.key)"
                    class="cell-input"
                  >
                    <option value="">--</option>
                    <option
                      v-for="option in dictionaries[col.optionsKey] || []"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <input
                    v-else
                    v-model="editingCells[`${employee.employee_id}_${col.key}`]"
                    @keydown.enter="saveCell(employee, col.key)"
                    @keydown.esc="cancelEditCell(employee.employee_id, col.key)"
                    class="cell-input"
                    type="text"
                  />
                  <div class="cell-actions">
                    <button
                      class="cell-btn save-btn"
                      type="button"
                      @click="saveCell(employee, col.key)"
                      title="Зберегти (Enter)"
                    >
                      ✓
                    </button>
                    <button
                      class="cell-btn cancel-btn"
                      type="button"
                      @click="cancelEditCell(employee.employee_id, col.key)"
                      title="Скасувати (Esc)"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <!-- View mode -->
                <div v-else class="view-cell" :title="'Клік для редагування'">
                  {{ employee[col.key] || '—' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
