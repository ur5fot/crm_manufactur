<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "./api";

const employeeFields = [
  "employee_id",
  "last_name",
  "first_name",
  "middle_name",
  "employment_status",
  "additional_status",
  "location",
  "department",
  "position",
  "grade",
  "salary_grid",
  "salary_amount",
  "specialty",
  "work_state",
  "work_type",
  "gender",
  "fit_status",
  "order_ref",
  "bank_name",
  "bank_card_number",
  "bank_iban",
  "tax_id",
  "email",
  "blood_group",
  "workplace_location",
  "residence_place",
  "registration_place",
  "driver_license_file",
  "id_certificate_file",
  "foreign_passport_number",
  "foreign_passport_issue_date",
  "foreign_passport_file",
  "criminal_record_file",
  "phone",
  "phone_note",
  "education",
  "notes"
];

// Динамическая схема полей, загружается из fields_schema.csv
const fieldGroups = ref([]);
const allFieldsSchema = ref([]);

// Динамический список документов из fields_schema
const documentFields = computed(() => {
  return allFieldsSchema.value
    .filter(field => field.type === 'file')
    .map(field => ({
      key: field.key,
      label: field.label
    }));
});

const csvLinks = [
  { label: "Сотрудники (employees.csv)", path: "/data/employees.csv" },
  { label: "Справочники (dictionaries.csv)", path: "/data/dictionaries.csv" }
];

const employees = ref([]);
const selectedId = ref("");
const searchTerm = ref("");
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const openingDataFolder = ref(false);
const importFile = ref(null);
const importResult = ref(null);
const importing = ref(false);
const dictionaries = ref({});
const viewMode = ref("cards"); // "cards", "table", or "logs"
const editingCells = reactive({}); // { employeeId_fieldName: value }
const columnFilters = reactive({}); // { fieldName: selectedValue }
const logs = ref([]);
const logsSearchTerm = ref("");

// Маппинг технических названий полей на человекопонятные
const fieldLabels = {
  employee_id: "ID сотрудника",
  last_name: "Фамилия",
  first_name: "Имя",
  middle_name: "Отчество",
  employment_status: "Статус работы",
  additional_status: "Дополнительный статус",
  location: "Местонахождение",
  department: "Подразделение",
  position: "Должность",
  grade: "Разряд",
  salary_grid: "Зарплатная сетка",
  salary_amount: "Оклад",
  specialty: "Специальность",
  work_state: "Рабочее состояние",
  work_type: "Тип работы",
  gender: "Пол",
  fit_status: "Пригодность",
  order_ref: "Приказ",
  bank_name: "Банк",
  bank_card_number: "Номер карты",
  bank_iban: "IBAN",
  tax_id: "ИНН",
  email: "Эл. почта",
  blood_group: "Группа крови",
  workplace_location: "Место работы",
  residence_place: "Место проживания",
  registration_place: "Место регистрации",
  driver_license_file: "Водительское удостоверение",
  id_certificate_file: "Удостоверение личности",
  foreign_passport_number: "Номер загранпаспорта",
  foreign_passport_issue_date: "Дата выдачи загранпаспорта",
  foreign_passport_file: "Загранпаспорт",
  criminal_record_file: "Справка о несудимости",
  phone: "Телефон",
  phone_note: "Примечание к телефону",
  education: "Образование",
  notes: "Примечание"
};

const form = reactive(emptyEmployee());
const documentFiles = reactive({});

// Dictionaries теперь формируются динамически из fields_schema.csv

const filteredEmployees = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  let result = employees.value;

  // Текстовый поиск
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

  // Фильтры столбцов (только для режима таблицы)
  if (viewMode.value === "table") {
    Object.keys(columnFilters).forEach((fieldName) => {
      const filterValues = columnFilters[fieldName];
      if (filterValues && filterValues.length > 0) {
        result = result.filter((employee) => filterValues.includes(employee[fieldName]));
      }
    });
  }

  return result;
});

const isNew = computed(() => !form.employee_id);

const filteredLogs = computed(() => {
  const query = logsSearchTerm.value.trim().toLowerCase();
  if (!query) {
    return logs.value;
  }
  return logs.value.filter((log) => {
    const haystack = [
      log.action,
      log.employee_id,
      log.employee_name,
      log.field_name,
      log.old_value,
      log.new_value,
      log.details,
      log.timestamp
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
});

function emptyEmployee() {
  const base = {};
  for (const field of employeeFields) {
    base[field] = "";
  }
  return base;
}

function resetForm() {
  Object.assign(form, emptyEmployee());
  for (const key of Object.keys(documentFiles)) {
    documentFiles[key] = null;
  }
}

function displayName(employee) {
  const parts = [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Без имени";
}

function fileUrl(path) {
  if (!path) {
    return "";
  }
  if (path.startsWith("files/")) {
    return `/${path}`;
  }
  return path;
}

async function openDataFolder() {
  openingDataFolder.value = true;
  errorMessage.value = "";
  try {
    await api.openDataFolder();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    openingDataFolder.value = false;
  }
}

function onImportFileChange(event) {
  importFile.value = event.target.files?.[0] || null;
  importResult.value = null;
}

function resetImport() {
  importFile.value = null;
  importResult.value = null;
}

async function importEmployees() {
  if (!importFile.value) {
    return;
  }
  importing.value = true;
  errorMessage.value = "";
  try {
    const formData = new FormData();
    formData.append("file", importFile.value);
    const result = await api.importEmployees(formData);
    importResult.value = {
      added: result?.added ?? 0,
      skipped: result?.skipped ?? 0,
      errors: result?.errors || []
    };
    await loadEmployees();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    importing.value = false;
  }
}

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

async function selectEmployee(id) {
  if (!id) {
    return;
  }
  selectedId.value = id;
  errorMessage.value = "";
  try {
    const data = await api.getEmployee(id);
    Object.assign(form, emptyEmployee(), data.employee || {});
    for (const key of Object.keys(documentFiles)) {
      documentFiles[key] = null;
    }
  } catch (error) {
    errorMessage.value = error.message;
  }
}

function startNew() {
  selectedId.value = "";
  resetForm();
}

async function saveEmployee() {
  saving.value = true;
  errorMessage.value = "";
  try {
    // Валидация обязательных полей
    if (!form.first_name || !form.first_name.trim()) {
      errorMessage.value = "Имя обязательно для заполнения";
      saving.value = false;
      return;
    }
    if (!form.last_name || !form.last_name.trim()) {
      errorMessage.value = "Фамилия обязательна для заполнения";
      saving.value = false;
      return;
    }

    const payload = { ...form };

    if (isNew.value) {
      const response = await api.createEmployee(payload);
      await loadEmployees();
      if (response?.employee_id) {
        await selectEmployee(response.employee_id);
      } else {
        startNew();
      }
    } else {
      await api.updateEmployee(form.employee_id, payload);
      await loadEmployees();
      await selectEmployee(form.employee_id);
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}

async function deleteEmployee() {
  if (!form.employee_id) {
    return;
  }
  const confirmed = window.confirm("Удалить сотрудника и все связанные записи?");
  if (!confirmed) {
    return;
  }
  saving.value = true;
  errorMessage.value = "";
  try {
    await api.deleteEmployee(form.employee_id);
    await loadEmployees();
    startNew();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}

function onDocumentFileChange(key, event) {
  const file = event.target.files?.[0] || null;
  documentFiles[key] = file;
}

async function uploadDocument(doc) {
  if (!form.employee_id || !documentFiles[doc.key]) {
    return;
  }
  errorMessage.value = "";
  try {
    const formData = new FormData();
    formData.append("file", documentFiles[doc.key]);
    formData.append("file_field", doc.key);
    const response = await api.uploadEmployeeFile(form.employee_id, formData);
    form[doc.key] = response?.path || form[doc.key];
    documentFiles[doc.key] = null;
  } catch (error) {
    errorMessage.value = error.message;
  }
}

function openDocument(fieldKey) {
  if (!form[fieldKey]) return;
  const url = `${import.meta.env.VITE_API_URL || ""}/files/${form[fieldKey]}`;
  window.open(url, "_blank");
}

async function deleteDocument(doc) {
  if (!form.employee_id || !form[doc.key]) {
    return;
  }

  const confirmed = window.confirm(`Удалить документ "${doc.label}"?`);
  if (!confirmed) return;

  errorMessage.value = "";
  try {
    await api.deleteEmployeeFile(form.employee_id, doc.key);
    form[doc.key] = "";
    await loadEmployees();
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function loadLogs() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await api.getLogs();
    logs.value = data.logs || [];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function loadFieldsSchema() {
  try {
    const data = await api.getFieldsSchema();

    // Формируем группы полей для карточек (исключаем группу "Документы" - для нее отдельная таблица)
    const groups = data.groups || {};
    fieldGroups.value = Object.keys(groups)
      .filter(groupName => groupName !== 'Документы')
      .map(groupName => ({
        title: groupName,
        fields: groups[groupName].map(field => ({
          key: field.key,
          label: field.label,
          type: field.type,
          optionsKey: field.type === 'select' ? field.key : undefined,
          readOnly: field.key === 'employee_id'
        }))
      }));

    // Формируем колонки для сводной таблицы
    summaryColumns.value = (data.tableFields || []).map(field => ({
      key: field.key,
      label: field.label,
      editable: field.editableInTable,
      type: field.type,
      optionsKey: field.type === 'select' ? field.key : undefined
    }));

    // Сохраняем все поля для использования
    allFieldsSchema.value = data.allFields || [];

    // Формируем dictionaries из options
    const dict = {};
    allFieldsSchema.value.forEach(field => {
      if (field.type === 'select' && field.options && field.options.length > 0) {
        dict[field.key] = field.options.map(opt => ({
          value: opt,
          label: opt
        }));
      }
    });
    dictionaries.value = dict;

  } catch (error) {
    console.error("Failed to load fields schema:", error);
  }
}

// Сводная таблица - динамически загружается из fields_schema.csv
const summaryColumns = ref([]);

function startEditCell(employeeId, fieldName, currentValue) {
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
    const updatedEmployee = { ...employee, [fieldName]: newValue };
    await api.updateEmployee(employee.employee_id, updatedEmployee);

    // Обновляем локальные данные
    const index = employees.value.findIndex(e => e.employee_id === employee.employee_id);
    if (index !== -1) {
      employees.value[index][fieldName] = newValue;
    }

    delete editingCells[key];
  } catch (error) {
    errorMessage.value = error.message;
  }
}

function openEmployeeCard(employeeId) {
  viewMode.value = "cards";
  selectEmployee(employeeId);
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

  // Удаляем пустые массивы
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

function getFieldLabel(fieldName) {
  if (!fieldName) return "";
  const label = fieldLabels[fieldName] || fieldName;
  return `${label} (${fieldName})`;
}

function getDetailLabel(detail) {
  if (!detail) return "";
  // Заменяем "Изменено поле: field_name" на "Изменено поле: Название (field_name)"
  const match = detail.match(/Изменено поле: (\w+)/);
  if (match) {
    const fieldName = match[1];
    const label = fieldLabels[fieldName] || fieldName;
    return `Изменено поле: ${label} (${fieldName})`;
  }
  return detail;
}

onMounted(async () => {
  await loadFieldsSchema();
  await loadEmployees();
});
</script>

<template>
  <div class="app">
    <div class="page">
      <header class="topbar">
        <div class="brand">
          <div class="brand-title">CRM на CSV</div>
          <div class="brand-sub">Vue + Node, локальные CSV файлы</div>
        </div>
        <div class="top-actions">
          <button
            class="secondary"
            :class="{ active: viewMode === 'cards' }"
            type="button"
            @click="viewMode = 'cards'"
          >
            Карточки
          </button>
          <button
            class="secondary"
            :class="{ active: viewMode === 'table' }"
            type="button"
            @click="viewMode = 'table'"
          >
            Сводная таблица
          </button>
          <button
            class="secondary"
            :class="{ active: viewMode === 'logs' }"
            type="button"
            @click="viewMode = 'logs'; loadLogs()"
          >
            Логи
          </button>
          <button class="secondary" type="button" @click="loadEmployees">
            Обновить
          </button>
          <button class="primary" type="button" @click="startNew" v-if="viewMode === 'cards'">
            Новый сотрудник
          </button>
        </div>
      </header>

      <!-- Режим карточек -->
      <div v-if="viewMode === 'cards'" class="layout">
        <aside class="panel">
          <div class="panel-header">
            <div class="panel-title">Сотрудники</div>
            <div class="status-bar">
              <span v-if="loading">Загрузка...</span>
              <span v-else>{{ employees.length }} всего</span>
            </div>
          </div>
          <input
            v-model="searchTerm"
            class="search-input"
            type="search"
            placeholder="Поиск по ФИО, подразделению или ID"
          />
          <div class="employee-list">
            <div
              v-for="(employee, index) in filteredEmployees"
              :key="employee.employee_id"
              class="employee-card"
              :class="{ active: employee.employee_id === selectedId }"
              :style="{ animationDelay: `${index * 0.04}s` }"
              @click="selectEmployee(employee.employee_id)"
            >
              <div class="employee-name">{{ displayName(employee) }}</div>
              <div class="employee-meta">
                {{ employee.position || "Без должности" }}
                <span v-if="employee.department"> · {{ employee.department }}</span>
              </div>
              <div class="employee-tags">
                <span class="tag">{{ employee.employment_status || "без статуса" }}</span>
              </div>
            </div>
          </div>
        </aside>

        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">
              {{ isNew ? "Новый сотрудник" : "Карточка сотрудника" }}
            </div>
            <div class="actions">
              <button class="secondary" type="button" @click="startNew">
                Очистить форму
              </button>
              <button
                class="primary"
                type="button"
                :disabled="saving"
                @click="saveEmployee"
              >
                {{ saving ? "Сохранение..." : "Сохранить" }}
              </button>
              <button
                v-if="!isNew"
                class="danger"
                type="button"
                :disabled="saving"
                @click="deleteEmployee"
              >
                Удалить
              </button>
            </div>
          </div>

          <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>

          <div class="detail-grid">
            <div v-for="group in fieldGroups" :key="group.title" class="section">
              <div class="section-title">{{ group.title }}</div>
              <div class="form-grid">
                <div v-for="field in group.fields" :key="field.key" class="field">
                  <label :for="field.key">{{ field.label }}</label>
                  <select
                    v-if="field.type === 'select'"
                    :id="field.key"
                    v-model="form[field.key]"
                  >
                    <option value="">--</option>
                    <option
                      v-for="option in dictionaries[field.optionsKey] || []"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <textarea
                    v-else-if="field.type === 'textarea'"
                    :id="field.key"
                    v-model="form[field.key]"
                  ></textarea>
                  <input
                    v-else
                    :id="field.key"
                    :type="field.type || 'text'"
                    v-model="form[field.key]"
                    :readonly="field.readOnly"
                    :required="field.key === 'first_name' || field.key === 'last_name'"
                  />
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Документы</div>
              <div v-if="isNew" class="inline-note">
                Сначала сохраните сотрудника, затем загрузите документы.
              </div>
              <table v-else class="documents-table">
                <thead>
                  <tr>
                    <th>Документ</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="doc in documentFields" :key="doc.key">
                    <td>{{ doc.label }}</td>
                    <td>
                      <span v-if="form[doc.key]" class="status-uploaded">✓ Загружен</span>
                      <span v-else class="status-not-uploaded">✗ Не загружен</span>
                    </td>
                    <td>
                      <div class="document-actions">
                        <template v-if="form[doc.key]">
                          <button
                            class="secondary small"
                            type="button"
                            @click="openDocument(doc.key)"
                            title="Открыть документ"
                          >
                            Открыть
                          </button>
                          <button
                            class="danger small"
                            type="button"
                            @click="deleteDocument(doc)"
                            title="Удалить документ"
                          >
                            Удалить
                          </button>
                        </template>
                        <template v-else>
                          <input
                            type="file"
                            :id="`file-${doc.key}`"
                            accept="application/pdf"
                            @change="onDocumentFileChange(doc.key, $event)"
                            style="display: none"
                          />
                          <label :for="`file-${doc.key}`" class="file-label-btn secondary small">
                            Выбрать файл
                          </label>
                          <button
                            v-if="documentFiles[doc.key]"
                            class="primary small"
                            type="button"
                            @click="uploadDocument(doc)"
                          >
                            Загрузить
                          </button>
                          <span v-if="documentFiles[doc.key]" class="file-selected">
                            {{ documentFiles[doc.key].name }}
                          </span>
                        </template>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="panel-header">
                <div class="section-title">CSV файлы</div>
                <button
                  class="secondary"
                  type="button"
                  :disabled="openingDataFolder"
                  @click="openDataFolder"
                >
                  {{ openingDataFolder ? "Открываем..." : "Открыть папку data" }}
                </button>
              </div>
              <div class="table-list">
                <div v-for="link in csvLinks" :key="link.path" class="file-row">
                  <div>
                    <div class="employee-name">{{ link.label }}</div>
                    <div class="inline-note">Откроется в браузере, можно сохранить для Excel.</div>
                  </div>
                  <a class="file-link" :href="link.path" target="_blank" rel="noopener">
                    Открыть
                  </a>
                  <a class="file-link" :href="link.path" download>
                    Скачать
                  </a>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="panel-header">
                <div class="section-title">Импорт новых сотрудников</div>
                <a class="file-link" href="/data/employees_import_sample.csv" download>
                  Скачать шаблон
                </a>
              </div>
              <div class="field">
                <label>CSV файл</label>
                <input type="file" accept=".csv,text/csv" @change="onImportFileChange" />
              </div>
              <div class="actions">
                <button
                  class="primary"
                  type="button"
                  :disabled="!importFile || importing"
                  @click="importEmployees"
                >
                  {{ importing ? "Импортируем..." : "Импортировать" }}
                </button>
                <button
                  class="secondary"
                  type="button"
                  :disabled="!importFile && !importResult"
                  @click="resetImport"
                >
                  Очистить
                </button>
              </div>
              <div class="inline-note">
                CSV: UTF-8, разделитель ;, заголовки как в employees.csv. Фамилия или имя
                обязательны.
              </div>
              <div v-if="importFile" class="inline-note">Файл: {{ importFile.name }}</div>
              <div v-if="importResult" class="status-bar">
                Добавлено: {{ importResult.added }} · Пропущено: {{ importResult.skipped }}
              </div>
              <div
                v-if="importResult && importResult.errors && importResult.errors.length"
                class="inline-note"
              >
                Ошибки (первые {{ importResult.errors.length }}):
              </div>
              <div
                v-if="importResult && importResult.errors && importResult.errors.length"
                class="table-list"
              >
                <div
                  v-for="error in importResult.errors"
                  :key="`${error.row}-${error.reason}`"
                  class="error-row"
                >
                  <div class="employee-name">Строка {{ error.row }}</div>
                  <div class="inline-note">{{ error.reason }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Режим сводной таблицы -->
      <div v-else-if="viewMode === 'table'" class="layout-table">
        <div class="panel table-panel">
          <div class="panel-header">
            <div class="panel-title">Сводная таблица сотрудников</div>
            <div class="actions">
              <button
                v-if="getActiveFiltersCount() > 0"
                class="secondary"
                type="button"
                @click="clearAllFilters"
              >
                Сбросить фильтры ({{ getActiveFiltersCount() }})
              </button>
              <div class="status-bar">
                <span v-if="loading">Загрузка...</span>
                <span v-else>{{ filteredEmployees.length }} записей</span>
              </div>
            </div>
          </div>

          <input
            v-model="searchTerm"
            class="search-input"
            type="search"
            placeholder="Поиск по ФИО, подразделению или ID"
          />

          <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>

          <div class="table-container">
            <table class="summary-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th v-for="col in summaryColumns" :key="col.key">
                    <div class="th-content">
                      <div class="th-label">{{ col.label }}</div>
                      <div v-if="col.type === 'select'" class="column-filter-checkboxes" @click.stop>
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
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="employee in filteredEmployees"
                  :key="employee.employee_id"
                  class="table-row"
                  @click="openEmployeeCard(employee.employee_id)"
                >
                  <td class="id-cell">{{ employee.employee_id }}</td>
                  <td
                    v-for="col in summaryColumns"
                    :key="col.key"
                    class="editable-cell"
                    @click.stop="startEditCell(employee.employee_id, col.key, employee[col.key])"
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
                          title="Сохранить (Enter)"
                        >
                          ✓
                        </button>
                        <button
                          class="cell-btn cancel-btn"
                          type="button"
                          @click="cancelEditCell(employee.employee_id, col.key)"
                          title="Отменить (Esc)"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <!-- Режим просмотра -->
                    <div v-else class="view-cell" :title="'Клик для редактирования'">
                      {{ employee[col.key] || '—' }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Режим логов -->
      <div v-else-if="viewMode === 'logs'" class="layout-table">
        <div class="panel table-panel">
          <div class="panel-header">
            <div class="panel-title">Журнал изменений</div>
            <div class="actions">
              <button class="secondary" type="button" @click="loadLogs">
                Обновить
              </button>
              <div class="status-bar">
                <span v-if="loading">Загрузка...</span>
                <span v-else>{{ filteredLogs.length }} записей</span>
              </div>
            </div>
          </div>

          <input
            v-model="logsSearchTerm"
            class="search-input"
            type="search"
            placeholder="Поиск по ФИО, действию, полю или значению"
          />

          <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>

          <div class="table-container">
            <table class="summary-table logs-table">
              <thead>
                <tr>
                  <th>Дата и время</th>
                  <th>Действие</th>
                  <th>ID</th>
                  <th>Сотрудник</th>
                  <th>Поле</th>
                  <th>Старое значение</th>
                  <th>Новое значение</th>
                  <th>Детали</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in filteredLogs" :key="log.log_id">
                  <td class="log-timestamp">
                    {{ new Date(log.timestamp).toLocaleString('ru-RU') }}
                  </td>
                  <td>
                    <span
                      class="log-action"
                      :class="{
                        'action-create': log.action === 'CREATE',
                        'action-update': log.action === 'UPDATE',
                        'action-delete': log.action === 'DELETE'
                      }"
                    >
                      {{ log.action }}
                    </span>
                  </td>
                  <td class="id-cell">{{ log.employee_id }}</td>
                  <td>{{ log.employee_name }}</td>
                  <td>{{ getFieldLabel(log.field_name) }}</td>
                  <td class="log-value">{{ log.old_value || '—' }}</td>
                  <td class="log-value">{{ log.new_value || '—' }}</td>
                  <td class="log-details">{{ getDetailLabel(log.details) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
