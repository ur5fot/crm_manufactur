<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
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
  "status_start_date",
  "status_end_date",
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
  { label: "Співробітники (employees.csv)", path: "/data/employees.csv" },
  { label: "Довідники (dictionaries.csv)", path: "/data/dictionaries.csv" }
];

const employees = ref([]);
const selectedId = ref("");
const searchTerm = ref("");
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const openingDataFolder = ref(false);
const openingEmployeeFolder = ref(false);
const importFile = ref(null);
const importResult = ref(null);
const importing = ref(false);
const dictionaries = ref({});
const currentView = ref("dashboard"); // "dashboard", "cards", "table", or "logs"
const refreshIntervalId = ref(null);
const lastUpdated = ref(null);
const isRefreshing = ref(false);
const dashboardEvents = ref({ today: [], thisWeek: [] });
const expandedCard = ref(null); // null | 'total' | '<status_label>' | 'other'
const activeReport = ref(null); // null | 'current' | 'month'
const reportData = ref([]);
const reportLoading = ref(false);

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'cards', label: 'Картки' },
  { key: 'table', label: 'Таблиця' },
  { key: 'logs', label: 'Логи' },
];

function switchView(view) {
  currentView.value = view;
  if (view === 'logs') loadLogs();
}

function startDashboardRefresh() {
  stopDashboardRefresh();
  refreshIntervalId.value = setInterval(async () => {
    await loadEmployees(true);
    await loadDashboardEvents();
  }, 300000);
}

function refreshManually() {
  loadEmployees();
  if (currentView.value === 'dashboard') {
    loadDashboardEvents();
    startDashboardRefresh();
  }
}

function stopDashboardRefresh() {
  if (refreshIntervalId.value) {
    clearInterval(refreshIntervalId.value);
    refreshIntervalId.value = null;
  }
}

watch(currentView, (newView, oldView) => {
  if (newView === 'dashboard') {
    loadEmployees();
    loadDashboardEvents();
    startDashboardRefresh();
  } else if (oldView === 'dashboard') {
    stopDashboardRefresh();
  }
});
const editingCells = reactive({}); // { employeeId_fieldName: value }
const columnFilters = reactive({}); // { fieldName: selectedValue }
const logs = ref([]);
const logsSearchTerm = ref("");

// Уведомления о сменах статусов
const statusReturning = ref([]);
const statusStarting = ref([]);
const showStatusNotification = ref(false);
const notifiedEmployeeIds = new Set();
let notifiedDate = '';

// Динамические значения статусов из fields_schema (по позиции в field_options)
// Конвенция: options[0] = рабочий, options[1] = уволен, options[2] = отпуск, options[3] = больничный
const employmentOptions = computed(() => {
  const field = allFieldsSchema.value.find(f => f.key === 'employment_status');
  return field?.options || [];
});

const workingStatus = computed(() => employmentOptions.value[0] || '');

// Эмодзи по позиции статуса: options[2] (отпуск) — ✈️, options[3] (лікарняний) — 🏥, остальные — ℹ️
function statusEmoji(statusValue) {
  const idx = employmentOptions.value.indexOf(statusValue);
  if (idx === 2) return '✈️';
  if (idx === 3) return '🏥';
  return 'ℹ️';
}

function timelineEventEmoji(event) {
  if (event.type === 'status_end') return '🏢';
  return statusEmoji(event.status_type);
}

function timelineEventDesc(event) {
  if (event.type === 'status_end') {
    return `— повернення (${event.status_type || 'статус'})`;
  }
  const label = event.status_type || 'статус';
  if (event.end_date) {
    return `— ${label} (до ${formatEventDate(event.end_date)})`;
  }
  return `— ${label}`;
}

// Маппинг технических названий полей на человекопонятные — динамически из fields_schema
const fieldLabels = computed(() => {
  const map = {};
  allFieldsSchema.value.forEach(f => {
    map[f.key] = f.label;
  });
  return map;
});

// Цвета stat-card по позиции option (CSS-переменные)
const statusColors = [
  'var(--color-status-active)',    // options[0] — рабочий
  'var(--color-status-warning)',   // options[1]
  'var(--color-status-vacation)',  // options[2] — отпуск
  'var(--color-status-warning)',   // options[3]
];
function statusCardColor(idx) {
  return statusColors[idx] || 'var(--color-status-inactive)';
}

function toggleStatCard(cardKey) {
  expandedCard.value = expandedCard.value === cardKey ? null : cardKey;
}

const expandedEmployees = computed(() => {
  const key = expandedCard.value;
  if (!key) return [];
  const emps = employees.value;
  if (key === 'total') return emps;
  if (key === 'other') {
    const options = employmentOptions.value;
    return emps.filter(e => !options.includes(e.employment_status));
  }
  return emps.filter(e => e.employment_status === key);
});

async function exportTableData() {
  errorMessage.value = '';
  try {
    await api.exportCSV(columnFilters, searchTerm.value);
  } catch (e) {
    console.error('Export error:', e);
    errorMessage.value = `Помилка експорту: ${e.message}`;
  }
}

async function toggleReport(type) {
  if (activeReport.value === type) {
    activeReport.value = null;
    reportData.value = [];
    return;
  }
  activeReport.value = type;
  reportLoading.value = true;
  try {
    const data = await api.getStatusReport(type);
    reportData.value = data;
    errorMessage.value = '';
  } catch (e) {
    reportData.value = [];
    errorMessage.value = 'Помилка завантаження звіту';
  } finally {
    reportLoading.value = false;
  }
}

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
  if (currentView.value === "table") {
    Object.keys(columnFilters).forEach((fieldName) => {
      const filterValues = columnFilters[fieldName];
      if (filterValues && filterValues.length > 0) {
        result = result.filter((employee) => {
          const value = employee[fieldName];
          // Проверка на пустое значение
          if (filterValues.includes("__EMPTY__")) {
            if (!value || value.trim() === "") {
              return true;
            }
          }
          // Проверка на конкретные значения
          return filterValues.includes(value);
        });
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

// Статистика по кожному статусу з field_options — повністю динамічно
const dashboardStats = computed(() => {
  const emps = employees.value;
  const total = emps.length;
  const options = employmentOptions.value;

  // Підрахунок по кожній опції з schema
  const statusCounts = options.map(opt => ({
    label: opt,
    count: emps.filter(e => e.employment_status === opt).length
  }));

  const counted = statusCounts.reduce((sum, s) => sum + s.count, 0);
  return { total, statusCounts, other: total - counted };
});

const formattedLastUpdated = computed(() => {
  if (!lastUpdated.value) return '';
  const d = lastUpdated.value;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});

// Попап зміни статусу
const showStatusChangePopup = ref(false);
const statusChangeForm = reactive({
  status: '',
  startDate: '',
  endDate: ''
});

function openStatusChangePopup() {
  // Заповнюємо поточними значеннями (якщо статус = робочий, скидаємо на порожній для вибору)
  const currentStatus = form.employment_status || '';
  statusChangeForm.status = currentStatus === workingStatus.value ? '' : currentStatus;
  statusChangeForm.startDate = form.status_start_date || '';
  statusChangeForm.endDate = form.status_end_date || '';
  showStatusChangePopup.value = true;
}

function closeStatusChangePopup() {
  showStatusChangePopup.value = false;
}

async function applyStatusChange() {
  if (!statusChangeForm.status || !statusChangeForm.startDate) return;
  if (!form.employee_id) return;
  if (saving.value) return;
  if (statusChangeForm.endDate && statusChangeForm.endDate < statusChangeForm.startDate) {
    errorMessage.value = 'Дата завершення не може бути раніше дати початку';
    return;
  }

  errorMessage.value = '';
  saving.value = true;
  try {
    // Используем данные из employees.value, а не из form, чтобы не сохранять несохранённые изменения формы
    const currentEmployee = employees.value.find(e => e.employee_id === form.employee_id);
    if (!currentEmployee) {
      errorMessage.value = 'Співробітника не знайдено. Оновіть сторінку.';
      saving.value = false;
      return;
    }
    const payload = {
      ...currentEmployee,
      employment_status: statusChangeForm.status,
      status_start_date: statusChangeForm.startDate,
      status_end_date: statusChangeForm.endDate || ''
    };
    await api.updateEmployee(form.employee_id, payload);
    await loadEmployees();
    await selectEmployee(form.employee_id);
    closeStatusChangePopup();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}

async function resetStatus() {
  if (!form.employee_id) return;
  if (saving.value) return;

  errorMessage.value = '';
  saving.value = true;
  try {
    // Используем данные из employees.value, а не из form, чтобы не сохранять несохранённые изменения формы
    const currentEmployee = employees.value.find(e => e.employee_id === form.employee_id);
    if (!currentEmployee) {
      errorMessage.value = 'Співробітника не знайдено. Оновіть сторінку.';
      saving.value = false;
      return;
    }
    const payload = {
      ...currentEmployee,
      employment_status: workingStatus.value,
      status_start_date: '',
      status_end_date: ''
    };
    await api.updateEmployee(form.employee_id, payload);
    await loadEmployees();
    await selectEmployee(form.employee_id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}

// Опції для попапу зміни статусу (всі крім options[0] — "робочий" стан)
const statusChangeOptions = computed(() => {
  return employmentOptions.value.slice(1);
});

function emptyEmployee() {
  const base = {};
  // Используем динамический список полей из schema
  if (allFieldsSchema.value.length > 0) {
    for (const field of allFieldsSchema.value) {
      base[field.key] = "";
    }
  } else {
    // Fallback на статический список если schema еще не загружена
    for (const field of employeeFields) {
      base[field] = "";
    }
  }
  return base;
}

function resetForm() {
  // Полностью очищаем все свойства формы
  for (const key of Object.keys(form)) {
    delete form[key];
  }
  // Заполняем пустыми значениями
  Object.assign(form, emptyEmployee());
  // Очищаем файлы
  for (const key of Object.keys(documentFiles)) {
    documentFiles[key] = null;
  }
}

function displayName(employee) {
  const parts = [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Без імені";
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

async function openEmployeeFolder() {
  if (!form.employee_id) return;
  openingEmployeeFolder.value = true;
  errorMessage.value = "";
  try {
    await api.openEmployeeFolder(form.employee_id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    openingEmployeeFolder.value = false;
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

async function loadEmployees(silent = false) {
  if (silent && isRefreshing.value) return;
  if (!silent) loading.value = true;
  isRefreshing.value = true;
  if (!silent) errorMessage.value = "";
  try {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
    await checkStatusChanges();
    lastUpdated.value = new Date();
  } catch (error) {
    if (!silent) errorMessage.value = error.message;
  } finally {
    isRefreshing.value = false;
    if (!silent) loading.value = false;
  }
}

const shortDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const day = shortDays[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}, ${dd}.${mm}.${d.getFullYear()}`;
}

function daysFromNowLabel(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - today) / 86400000);
  if (diff === 1) return 'завтра';
  if (diff >= 2 && diff <= 4) return `через ${diff} дні`;
  return `через ${diff} днів`;
}

async function loadDashboardEvents() {
  try {
    const data = await api.getDashboardEvents();
    dashboardEvents.value = data;
  } catch (error) {
    console.error('Failed to load dashboard events:', error);
  }
}

// Универсальная проверка и обработка смены статусов
async function checkStatusChanges() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Сбрасываем уведомления при смене дня (для длительных сессий)
  if (notifiedDate !== today) {
    notifiedEmployeeIds.clear();
    notifiedDate = today;
  }

  const returningToday = [];
  const startingToday = [];
  const needsUpdate = [];

  employees.value.forEach(employee => {
    const startDate = employee.status_start_date;
    const endDate = employee.status_end_date;

    // Пропускаем если нет дат статуса
    if (!startDate && !endDate) return;

    // Пропускаем автовозврат для уволенных (options[1]) — увольнение не должно автоматически сбрасываться
    const firedStatus = employmentOptions.value[1] || '';
    const isFired = firedStatus && employee.employment_status === firedStatus;

    // Проверка 1: сегодня последний день статуса — уведомить (но НЕ сбрасывать,
    // end_date включительна, сброс произойдёт завтра в проверке 2: end_date < today)
    if (endDate === today && !isFired) {
      returningToday.push({
        id: employee.employee_id,
        name: displayName(employee),
        position: employee.position || '',
        statusType: employee.employment_status
      });
      return;
    }

    // Проверка 2: статус уже прошел (end_date < today) — очистить даты, вернуть options[0]
    if (endDate && endDate < today && !isFired) {
      needsUpdate.push({
        ...employee,
        status_start_date: '',
        status_end_date: '',
        employment_status: workingStatus.value
      });
      return;
    }

    // Проверка 3: сегодня начинается статус — уведомить
    if (startDate === today && employee.employment_status !== workingStatus.value) {
      startingToday.push({
        id: employee.employee_id,
        name: displayName(employee),
        position: employee.position || '',
        endDate: endDate,
        statusType: employee.employment_status
      });
      return;
    }

    // Проверка 4: сейчас в статусе (start_date <= today, end_date > today или пуста) — ничего не делаем
  });

  // Обновляем статусы сотрудников
  for (const employee of needsUpdate) {
    try {
      await api.updateEmployee(employee.employee_id, employee);
    } catch (error) {
      console.error(`Ошибка обновления сотрудника ${employee.employee_id}:`, error);
    }
  }

  // Показываем уведомление только для ещё не показанных сотрудников
  const newReturning = returningToday.filter(e => !notifiedEmployeeIds.has(e.id));
  const newStarting = startingToday.filter(e => !notifiedEmployeeIds.has(e.id));
  if (newReturning.length > 0 || newStarting.length > 0) {
    newReturning.forEach(e => notifiedEmployeeIds.add(e.id));
    newStarting.forEach(e => notifiedEmployeeIds.add(e.id));
    statusReturning.value = newReturning;
    statusStarting.value = newStarting;
    showStatusNotification.value = true;
  }

  // Перезагружаем список если были обновления
  if (needsUpdate.length > 0) {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
  }
}

function closeStatusNotification() {
  showStatusNotification.value = false;
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
      errorMessage.value = "Ім'я обов'язкове для заповнення";
      saving.value = false;
      return;
    }
    if (!form.last_name || !form.last_name.trim()) {
      errorMessage.value = "Прізвище обов'язкове для заповнення";
      saving.value = false;
      return;
    }

    const payload = { ...form };

    // Статусные поля управляются только через попап смены статуса — удаляем из payload,
    // чтобы не перезаписать актуальные значения устаревшими данными из формы
    if (!isNew.value) {
      delete payload.employment_status;
      delete payload.status_start_date;
      delete payload.status_end_date;
    }

    // Новому сотруднику устанавливаем статус по умолчанию — options[0] (рабочий)
    if (isNew.value && !payload.employment_status && workingStatus.value) {
      payload.employment_status = workingStatus.value;
    }

    // Очищаем пустые поля документов при создании нового сотрудника
    if (isNew.value) {
      documentFields.value.forEach(doc => {
        if (!payload[doc.key] || payload[doc.key].trim() === "") {
          delete payload[doc.key];
        }
      });
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
  const confirmed = window.confirm("Видалити співробітника та всі пов'язані записи?");
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
  const url = `${import.meta.env.VITE_API_URL || ""}/${form[fieldKey]}`;
  window.open(url, "_blank");
}

async function deleteDocument(doc) {
  if (!form.employee_id || !form[doc.key]) {
    return;
  }

  const confirmed = window.confirm(`Видалити документ "${doc.label}"?`);
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
      .filter(groupName => groupName && groupName !== 'Документы')
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
  // Проверяем, разрешено ли редактирование этого поля в таблице
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
    const updatedEmployee = { ...employee, [fieldName]: newValue };
    // Статусные поля управляются только через попап — не перезаписываем их при inline-редактировании
    delete updatedEmployee.employment_status;
    delete updatedEmployee.status_start_date;
    delete updatedEmployee.status_end_date;
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
  currentView.value = "cards";
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

/**
 * Перевірити чи є активні фільтри для колонки
 */
function hasActiveFilters(fieldName) {
  return columnFilters[fieldName] && columnFilters[fieldName].length > 0;
}

/**
 * Отримати кількість активних фільтрів для колонки
 */
function getColumnFilterCount(fieldName) {
  return columnFilters[fieldName]?.length || 0;
}

function getFieldLabel(fieldName) {
  if (!fieldName) return "";
  const label = fieldLabels.value[fieldName] || fieldName;
  return `${label} (${fieldName})`;
}

function getDetailLabel(detail) {
  if (!detail) return "";
  // Заменяем "Изменено поле: field_name" на "Изменено поле: Название (field_name)"
  const match = detail.match(/Изменено поле: (\w+)/);
  if (match) {
    const fieldName = match[1];
    const label = fieldLabels.value[fieldName] || fieldName;
    return `Змінено поле: ${label} (${fieldName})`;
  }
  return detail;
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape') {
    if (showStatusChangePopup.value) {
      closeStatusChangePopup();
    } else if (showStatusNotification.value) {
      closeStatusNotification();
    }
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleGlobalKeydown);
  await loadFieldsSchema();
  await loadEmployees();
  await loadDashboardEvents();
  startDashboardRefresh();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  stopDashboardRefresh();
});
</script>

<template>
  <div class="app">
    <!-- Уведомление о сменах статусов -->
    <div v-if="showStatusNotification" class="vacation-notification-overlay" @click="closeStatusNotification">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>📋 Сповіщення про зміну статусів</h3>
          <button class="close-btn" @click="closeStatusNotification">×</button>
        </div>
        <div class="vacation-notification-body">
          <!-- Сьогодні змінюють статус -->
          <div v-if="statusStarting.length > 0" class="notification-section">
            <p class="notification-message">📋 Сьогодні змінюють статус:</p>
            <ul class="vacation-employees-list">
              <li v-for="emp in statusStarting" :key="emp.id" class="vacation-employee starting">
                <div class="employee-info">
                  <span class="employee-name">{{ statusEmoji(emp.statusType) }} {{ emp.name }}</span>
                  <span v-if="emp.position" class="employee-position">{{ emp.position }}</span>
                </div>
                <div class="status-details">
                  <span class="status-badge">{{ emp.statusType }}</span>
                  <span v-if="emp.endDate" class="vacation-end-date">до {{ formatEventDate(emp.endDate) }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Повертаються до робочого стану -->
          <div v-if="statusReturning.length > 0" class="notification-section">
            <p class="notification-message">🏢 Сьогодні повертаються:</p>
            <ul class="vacation-employees-list">
              <li v-for="emp in statusReturning" :key="emp.id" class="vacation-employee returning">
                <div class="employee-info">
                  <span class="employee-name">{{ emp.name }}</span>
                  <span v-if="emp.position" class="employee-position">{{ emp.position }}</span>
                </div>
                <span class="status-badge returning-badge">{{ emp.statusType }} → {{ workingStatus }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="vacation-notification-footer">
          <button class="primary" @click="closeStatusNotification">Зрозуміло</button>
        </div>
      </div>
    </div>

    <!-- Попап зміни статусу -->
    <div v-if="showStatusChangePopup" class="vacation-notification-overlay" @click="closeStatusChangePopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>Зміна статусу роботи</h3>
          <button class="close-btn" @click="closeStatusChangePopup">×</button>
        </div>
        <div class="vacation-notification-body">
          <div class="status-change-form">
            <div class="field">
              <label for="status-change-select">Новий статус</label>
              <select id="status-change-select" v-model="statusChangeForm.status">
                <option value="">-- Оберіть статус --</option>
                <option v-for="opt in statusChangeOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
            <div class="field">
              <label for="status-change-start">Дата початку *</label>
              <input id="status-change-start" type="date" v-model="statusChangeForm.startDate" required />
            </div>
            <div class="field">
              <label for="status-change-end">Дата завершення</label>
              <input id="status-change-end" type="date" v-model="statusChangeForm.endDate" />
            </div>
          </div>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="closeStatusChangePopup">Скасувати</button>
          <button
            class="primary"
            type="button"
            :disabled="!statusChangeForm.status || !statusChangeForm.startDate || saving"
            @click="applyStatusChange"
          >
            Застосувати
          </button>
        </div>
      </div>
    </div>

    <div class="page">
      <header class="topbar">
        <div class="brand">
          <div class="brand-title">CRM на CSV</div>
          <div class="brand-sub">Vue + Node, локальні CSV файли</div>
        </div>
        <div class="topbar-actions">
          <button class="secondary" type="button" @click="refreshManually">
            Оновити
          </button>
          <button class="primary" type="button" @click="startNew" v-if="currentView === 'cards'">
            Новий співробітник
          </button>
        </div>
        <div class="tab-bar">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-item"
            :class="{ active: currentView === tab.key }"
            @click="switchView(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
      </header>

      <!-- Режим Dashboard -->
      <div v-if="currentView === 'dashboard'" class="dashboard">
        <div v-if="loading" class="status-bar" style="justify-content: center; padding: 24px;">
          <span>Завантаження...</span>
        </div>
        <div class="stats-grid">
          <div class="stat-card-wrap">
            <div class="stat-card" :class="{ expanded: expandedCard === 'total' }"
                 style="--card-color: #E0E0E0" @click="toggleStatCard('total')">
              <div class="stat-card-header">
                <div>
                  <div class="stat-card-number">{{ dashboardStats.total }}</div>
                  <div class="stat-card-label">Всього</div>
                </div>
                <span class="stat-card-toggle">{{ expandedCard === 'total' ? '▲' : '▼' }}</span>
              </div>
            </div>
            <div class="inline-expand" :class="{ open: expandedCard === 'total' }">
              <div class="inline-expand-list">
                <div v-if="expandedEmployees.length === 0" class="inline-expand-empty">Немає працівників</div>
                <div v-for="emp in expandedEmployees" :key="emp.employee_id" class="inline-expand-item" @click.stop="openEmployeeCard(emp.employee_id)">
                  {{ [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ') }}
                </div>
              </div>
            </div>
          </div>
          <div
            v-for="(stat, idx) in dashboardStats.statusCounts"
            :key="stat.label"
            class="stat-card-wrap"
          >
            <div
              class="stat-card"
              :class="{ expanded: expandedCard === stat.label }"
              :style="{ '--card-color': statusCardColor(idx) }"
              @click="toggleStatCard(stat.label)"
            >
              <div class="stat-card-header">
                <div>
                  <div class="stat-card-number">{{ stat.count }}</div>
                  <div class="stat-card-label">{{ stat.label }}</div>
                </div>
                <span class="stat-card-toggle">{{ expandedCard === stat.label ? '▲' : '▼' }}</span>
              </div>
            </div>
            <div class="inline-expand" :class="{ open: expandedCard === stat.label }">
              <div class="inline-expand-list">
                <div v-if="expandedEmployees.length === 0" class="inline-expand-empty">Немає працівників</div>
                <div v-for="emp in expandedEmployees" :key="emp.employee_id" class="inline-expand-item" @click.stop="openEmployeeCard(emp.employee_id)">
                  {{ [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ') }}
                </div>
              </div>
            </div>
          </div>
          <div class="stat-card-wrap">
            <div class="stat-card" :class="{ expanded: expandedCard === 'other' }"
                 style="--card-color: var(--color-status-inactive)" @click="toggleStatCard('other')">
              <div class="stat-card-header">
                <div>
                  <div class="stat-card-number">{{ dashboardStats.other }}</div>
                  <div class="stat-card-label">Інше</div>
                </div>
                <span class="stat-card-toggle">{{ expandedCard === 'other' ? '▲' : '▼' }}</span>
              </div>
            </div>
            <div class="inline-expand" :class="{ open: expandedCard === 'other' }">
              <div class="inline-expand-list">
                <div v-if="expandedEmployees.length === 0" class="inline-expand-empty">Немає працівників</div>
                <div v-for="emp in expandedEmployees" :key="emp.employee_id" class="inline-expand-item" @click.stop="openEmployeeCard(emp.employee_id)">
                  {{ [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ') }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="timeline-grid">
        <!-- Timeline: Сьогодні -->
        <div class="timeline-card">
          <div class="timeline-title">Сьогодні</div>
          <div v-if="dashboardEvents.today.length === 0" class="timeline-empty">
            Нічого термінового
          </div>
          <div v-for="event in dashboardEvents.today" :key="event.employee_id + event.type" class="timeline-event">
            <span class="timeline-emoji">{{ timelineEventEmoji(event) }}</span>
            <span class="timeline-name timeline-link" @click="openEmployeeCard(event.employee_id)">{{ event.name }}</span>
            <span class="timeline-desc">{{ timelineEventDesc(event) }}</span>
          </div>
        </div>
        <!-- Timeline: Цього тижня -->
        <div class="timeline-card">
          <div class="timeline-title">Найближчі 7 днів</div>
          <div v-if="dashboardEvents.thisWeek.length === 0" class="timeline-empty">
            Немає запланованих подій
          </div>
          <div v-for="event in dashboardEvents.thisWeek" :key="event.employee_id + event.type + event.date" class="timeline-event">
            <span class="timeline-date">{{ formatEventDate(event.date) }}</span>
            <span class="timeline-days-badge">{{ daysFromNowLabel(event.date) }}</span>
            <span class="timeline-emoji">{{ timelineEventEmoji(event) }}</span>
            <span class="timeline-name timeline-link" @click="openEmployeeCard(event.employee_id)">{{ event.name }}</span>
            <span class="timeline-desc">{{ timelineEventDesc(event) }}</span>
          </div>
        </div>
        </div>
        <!-- Швидкі звіти по статусах -->
        <div class="report-section">
          <div class="report-buttons">
            <button class="report-btn" :class="{ active: activeReport === 'current' }" @click="toggleReport('current')">
              Хто відсутній зараз
            </button>
            <button class="report-btn" :class="{ active: activeReport === 'month' }" @click="toggleReport('month')">
              Зміни статусів цього місяця
            </button>
          </div>
          <div v-if="activeReport && !reportLoading" class="report-result">
            <div v-if="reportData.length === 0" class="report-empty">
              {{ activeReport === 'current' ? 'Наразі всі працюють' : 'Немає змін статусів цього місяця' }}
            </div>
            <table v-else class="report-table">
              <thead>
                <tr>
                  <th>ПІБ</th>
                  <th>Статус</th>
                  <th>Початок</th>
                  <th>Закінчення</th>
                  <th>Днів</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in reportData" :key="row.employee_id">
                  <td><span class="report-name-link" @click="openEmployeeCard(row.employee_id)">{{ row.name }}</span></td>
                  <td>{{ row.status_type }}</td>
                  <td>{{ formatEventDate(row.status_start_date) }}</td>
                  <td>{{ formatEventDate(row.status_end_date) }}</td>
                  <td>{{ row.days }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="reportLoading" class="report-empty">Завантаження...</div>
        </div>
        <div v-if="lastUpdated" class="dashboard-footer">
          Оновлено: {{ formattedLastUpdated }}
        </div>
      </div>

      <!-- Режим карточек -->
      <div v-else-if="currentView === 'cards'" class="layout">
        <aside class="panel">
          <div class="panel-header">
            <div class="panel-title">Співробітники</div>
            <div class="status-bar">
              <span v-if="loading">Завантаження...</span>
              <span v-else>{{ employees.length }} всього</span>
            </div>
          </div>
          <input
            v-model="searchTerm"
            class="search-input"
            type="search"
            placeholder="Пошук за ПІБ, підрозділом або ID"
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
                ID: {{ employee.employee_id }}
                <span v-if="employee.position"> · {{ employee.position }}</span>
                <span v-if="employee.department"> · {{ employee.department }}</span>
              </div>
              <div class="employee-tags">
                <span class="tag">{{ employee.employment_status || "без статусу" }}</span>
              </div>
            </div>
          </div>
        </aside>

        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">
              {{ isNew ? "Новий співробітник" : "Картка співробітника" }}
            </div>
            <div class="actions">
              <button class="secondary" type="button" @click="startNew">
                Очистити форму
              </button>
              <button
                class="primary"
                type="button"
                :disabled="saving"
                @click="saveEmployee"
              >
                {{ saving ? "Збереження..." : "Зберегти" }}
              </button>
              <button
                v-if="!isNew"
                class="danger"
                type="button"
                :disabled="saving"
                @click="deleteEmployee"
              >
                Видалити
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
                  <!-- employment_status: readonly display + buttons -->
                  <template v-if="field.key === 'employment_status'">
                    <div class="status-field-row">
                      <input
                        :id="field.key"
                        type="text"
                        :value="form[field.key] || '—'"
                        readonly
                        class="status-readonly-input"
                      />
                      <button
                        v-if="!isNew"
                        class="secondary small"
                        type="button"
                        @click="openStatusChangePopup"
                      >
                        Змінити статус
                      </button>
                      <button
                        v-if="!isNew && form.employment_status && form.employment_status !== workingStatus"
                        class="secondary small"
                        type="button"
                        :disabled="saving"
                        @click="resetStatus"
                      >
                        Скинути статус
                      </button>
                    </div>
                  </template>
                  <select
                    v-else-if="field.type === 'select'"
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
              <div class="panel-header">
                <div class="section-title">Документи</div>
                <button
                  v-if="!isNew"
                  class="secondary"
                  type="button"
                  :disabled="openingEmployeeFolder"
                  @click="openEmployeeFolder"
                >
                  {{ openingEmployeeFolder ? "Відкриваємо..." : "Відкрити папку" }}
                </button>
              </div>
              <div v-if="isNew" class="inline-note">
                Спочатку збережіть співробітника, потім завантажте документи.
              </div>
              <table v-else class="documents-table">
                <thead>
                  <tr>
                    <th>Документ</th>
                    <th>Статус</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="doc in documentFields" :key="doc.key">
                    <td>{{ doc.label }}</td>
                    <td>
                      <span v-if="form[doc.key]" class="status-uploaded">✓ Завантажено</span>
                      <span v-else class="status-not-uploaded">✗ Не завантажено</span>
                    </td>
                    <td>
                      <div class="document-actions">
                        <template v-if="form[doc.key]">
                          <button
                            class="secondary small"
                            type="button"
                            @click="openDocument(doc.key)"
                            title="Відкрити документ"
                          >
                            Відкрити
                          </button>
                          <button
                            class="danger small"
                            type="button"
                            @click="deleteDocument(doc)"
                            title="Видалити документ"
                          >
                            Видалити
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
                            Вибрати файл
                          </label>
                          <button
                            v-if="documentFiles[doc.key]"
                            class="primary small"
                            type="button"
                            @click="uploadDocument(doc)"
                          >
                            Завантажити
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
                <div class="section-title">CSV файли</div>
                <button
                  class="secondary"
                  type="button"
                  :disabled="openingDataFolder"
                  @click="openDataFolder"
                >
                  {{ openingDataFolder ? "Відкриваємо..." : "Відкрити папку data" }}
                </button>
              </div>
              <div class="table-list">
                <div v-for="link in csvLinks" :key="link.path" class="file-row">
                  <div>
                    <div class="employee-name">{{ link.label }}</div>
                    <div class="inline-note">Відкриється у браузері, можна зберегти для Excel.</div>
                  </div>
                  <a class="file-link" :href="link.path" target="_blank" rel="noopener">
                    Відкрити
                  </a>
                  <a class="file-link" :href="link.path" download>
                    Завантажити
                  </a>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="panel-header">
                <div class="section-title">Імпорт нових співробітників</div>
                <a class="file-link" href="/data/employees_import_sample.csv" download>
                  Завантажити шаблон
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
                  {{ importing ? "Імпортуємо..." : "Імпортувати" }}
                </button>
                <button
                  class="secondary"
                  type="button"
                  :disabled="!importFile && !importResult"
                  @click="resetImport"
                >
                  Очистити
                </button>
              </div>
              <div class="inline-note">
                CSV: UTF-8, роздільник ;, заголовки як у employees.csv. Прізвище або ім'я
                обов'язкові.
              </div>
              <div v-if="importFile" class="inline-note">Файл: {{ importFile.name }}</div>
              <div v-if="importResult" class="status-bar">
                Додано: {{ importResult.added }} · Пропущено: {{ importResult.skipped }}
              </div>
              <div
                v-if="importResult && importResult.errors && importResult.errors.length"
                class="inline-note"
              >
                Помилки (перші {{ importResult.errors.length }}):
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
                  <div class="employee-name">Рядок {{ error.row }}</div>
                  <div class="inline-note">{{ error.reason }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Режим сводной таблицы -->
      <div v-else-if="currentView === 'table'" class="layout-table">
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

      <!-- Режим логов -->
      <div v-else-if="currentView === 'logs'" class="layout-table">
        <div class="panel table-panel">
          <div class="panel-header">
            <div class="panel-title">Журнал змін</div>
            <div class="actions">
              <button class="secondary" type="button" @click="loadLogs">
                Оновити
              </button>
              <div class="status-bar">
                <span v-if="loading">Завантаження...</span>
                <span v-else>{{ filteredLogs.length }} записів</span>
              </div>
            </div>
          </div>

          <input
            v-model="logsSearchTerm"
            class="search-input"
            type="search"
            placeholder="Пошук за ПІБ, дією, полем або значенням"
          />

          <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>

          <div class="table-container">
            <table class="summary-table logs-table">
              <thead>
                <tr>
                  <th>Дата і час</th>
                  <th>Дія</th>
                  <th>ID</th>
                  <th>Співробітник</th>
                  <th>Поле</th>
                  <th>Старе значення</th>
                  <th>Нове значення</th>
                  <th>Деталі</th>
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
