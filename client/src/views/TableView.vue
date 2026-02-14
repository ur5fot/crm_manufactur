<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { useFieldsSchema } from "../composables/useFieldsSchema";

const router = useRouter();
const { summaryColumns, dictionaries, loadFieldsSchema } = useFieldsSchema();

// State
const employees = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const searchTerm = ref("");
const editingCells = reactive({}); // { employeeId_fieldName: value }
const columnFilters = reactive({}); // { fieldName: [selectedValues] }

// Computed
const filteredEmployees = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  let result = employees.value;

  // Text search
  if (query) {
    result = result.filter((employee) => {
      const haystack = [
        displayName(employee),
        employee.department,
        employee.position,
        employee.employee_id
      ]
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
        if (filterValues.includes("__EMPTY__")) {
          if (!value || value.trim() === "") {
            return true;
          }
        }
        return filterValues.includes(value);
      });
    }
  });

  return result;
});

// Methods
function displayName(employee) {
  const parts = [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Без імені";
}

async function loadEmployees() {
  loading.value = true;
  try {
    const data = await api.getEmployees();
    employees.value = (data.employees || []).filter(e => e.active !== "no");
  } catch (e) {
    errorMessage.value = e.message;
  } finally {
    loading.value = false;
  }
}

function openEmployeeCard(employeeId) {
  router.push({ name: 'cards', params: { id: employeeId } });
}

function startEditCell(employeeId, fieldName, currentValue) {
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

async function saveCell(employee, fieldName) {
  const key = `${employee.employee_id}_${fieldName}`;
  const newValue = editingCells[key];

  if (newValue === undefined) return;

  errorMessage.value = "";
  try {
    const statusFields = ['employment_status', 'status_start_date', 'status_end_date'];
    if (statusFields.includes(fieldName)) {
      delete editingCells[key];
      return;
    }
    const updatedEmployee = { ...employee, [fieldName]: newValue };
    for (const sf of statusFields) delete updatedEmployee[sf];
    await api.updateEmployee(employee.employee_id, updatedEmployee);

    const index = employees.value.findIndex(e => e.employee_id === employee.employee_id);
    if (index !== -1) {
      employees.value[index][fieldName] = newValue;
    }

    delete editingCells[key];
  } catch (error) {
    errorMessage.value = error.message;
  }
}

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

async function exportTableData() {
  errorMessage.value = '';
  try {
    await api.exportCSV(columnFilters, searchTerm.value);
  } catch (e) {
    console.error('Export error:', e);
    errorMessage.value = `Помилка експорту: ${e.message}`;
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

                  <!-- Dropdown з фільтрами -->
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
                <!-- Режим редактирования -->
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
                <!-- Режим просмотра -->
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
