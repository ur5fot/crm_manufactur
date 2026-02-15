<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "./api";
import DashboardView from "./views/DashboardView.vue";
import TableView from "./views/TableView.vue";
import PlaceholderReferenceView from "./views/PlaceholderReferenceView.vue";
import LogsView from "./views/LogsView.vue";
import ImportView from "./views/ImportView.vue";
import DocumentHistoryView from "./views/DocumentHistoryView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import ReportsView from "./views/ReportsView.vue";

const router = useRouter();
const route = useRoute();

// Fallback список полей — должен соответствовать DEFAULT_EMPLOYEE_COLUMNS в schema.js
const employeeFields = [
  "employee_id",
  "last_name",
  "first_name",
  "middle_name",
  "birth_date",
  "employment_status",
  "additional_status",
  "gender",
  "blood_group",
  "department",
  "grade",
  "position",
  "specialty",
  "work_state",
  "work_type",
  "fit_status",
  "order_ref",
  "location",
  "residence_place",
  "registration_place",
  "email",
  "phone",
  "phone_note",
  "education",
  "salary_grid",
  "salary_amount",
  "bank_name",
  "bank_card_number",
  "bank_iban",
  "tax_id",
  "personal_matter_file",
  "personal_matter_file_issue_date",
  "personal_matter_file_expiry_date",
  "medical_commission_file",
  "medical_commission_file_issue_date",
  "medical_commission_file_expiry_date",
  "veterans_certificate_file",
  "veterans_certificate_file_issue_date",
  "veterans_certificate_file_expiry_date",
  "driver_license_file",
  "driver_license_file_issue_date",
  "driver_license_file_expiry_date",
  "id_certificate_file",
  "id_certificate_file_issue_date",
  "id_certificate_file_expiry_date",
  "foreign_passport_number",
  "foreign_passport_file",
  "foreign_passport_file_issue_date",
  "foreign_passport_file_expiry_date",
  "criminal_record_file",
  "criminal_record_file_issue_date",
  "criminal_record_file_expiry_date",
  "military_id_file",
  "military_id_file_issue_date",
  "military_id_file_expiry_date",
  "medical_certificate_file",
  "medical_certificate_file_issue_date",
  "medical_certificate_file_expiry_date",
  "insurance_file",
  "insurance_file_issue_date",
  "insurance_file_expiry_date",
  "education_diploma_file",
  "education_diploma_file_issue_date",
  "education_diploma_file_expiry_date",
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

// Get field type by field name
const getFieldType = (fieldName) => {
  const field = allFieldsSchema.value.find(f => f.key === fieldName);
  return field?.type || 'text';
};

// CSV links removed - data directory not publicly accessible for security reasons

const employees = ref([]);
const selectedId = ref("");
const searchTerm = ref("");
const cardSearchTerm = ref("");
const globalSearchTerm = ref("");
const globalSearchResults = ref({ employees: [], templates: [], documents: [] });
const showGlobalSearchResults = ref(false);
const globalSearchLoading = ref(false);
const isCreatingNew = ref(false); // Flag to prevent auto-load when creating new employee
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const openingDataFolder = ref(false);
const openingEmployeeFolder = ref(false);

// Theme management
const currentTheme = ref(localStorage.getItem('theme') || 'light');
const dictionaries = ref({});

// App config
const appConfig = ref({
  max_report_preview_rows: 100
});

// Compute current view based on route
const currentView = computed(() => {
  const name = route.name;
  if (name === 'dashboard') return 'dashboard';
  if (name === 'cards') return 'cards';
  if (name === 'table') return 'table';
  if (name === 'reports') return 'reports';
  if (name === 'import') return 'import';
  if (name === 'templates') return 'templates';
  if (name === 'document-history') return 'document-history';
  if (name === 'placeholder-reference') return 'placeholder-reference';
  if (name === 'logs') return 'logs';
  return 'dashboard';
});

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'cards', label: 'Картки' },
  { key: 'table', label: 'Таблиця' },
  { key: 'reports', label: 'Звіти' },
  { key: 'import', label: 'Імпорт' },
  { key: 'templates', label: 'Шаблони' },
  { key: 'document-history', label: 'Історія документів' },
  { key: 'logs', label: 'Логи' },
];

function switchView(view) {
  if (view === 'dashboard') {
    router.push({ name: 'dashboard' });
  } else if (view === 'cards') {
    router.push(selectedId.value ? { name: 'cards', params: { id: selectedId.value } } : { name: 'cards' });
  } else if (view === 'table') {
    router.push({ name: 'table' });
  } else if (view === 'reports') {
    router.push({ name: 'reports' });
  } else if (view === 'import') {
    router.push({ name: 'import' });
  } else if (view === 'templates') {
    router.push({ name: 'templates' });
  } else if (view === 'document-history') {
    router.push({ name: 'document-history' });
  } else if (view === 'logs') {
    router.push({ name: 'logs' });
  }
}

function refreshManually() {
  loadEmployees();
}

// Theme toggle function
function toggleTheme() {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
  currentTheme.value = newTheme;
  localStorage.setItem('theme', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
}

watch(() => route.name, async (newRoute, oldRoute) => {
  const newView = currentView.value;
  const oldView = oldRoute === 'dashboard' ? 'dashboard' :
                   oldRoute === 'cards' ? 'cards' :
                   oldRoute === 'table' ? 'table' :
                   oldRoute === 'reports' ? 'reports' :
                   oldRoute === 'templates' ? 'templates' :
                   oldRoute === 'document-history' ? 'document-history' :
                   oldRoute === 'logs' ? 'logs' : 'dashboard';

  if (newView === 'cards') {
    // Load templates for document generation section
    loadTemplates();

    // Auto-load first employee when navigating to cards view without ID
    // (but not if user explicitly wants to create new employee)
    if (!route.params.id && !isCreatingNew.value) {
      await loadEmployeesIfNeeded();
      if (employees.value.length > 0 && !form.employee_id) {
        openEmployeeCard(employees.value[0].employee_id);
      }
    }
  }

  // Reset the creating new flag when navigating away from cards
  if (oldView === 'cards' && newView !== 'cards') {
    isCreatingNew.value = false;
  }
});

// Watch route.params.id to handle URL changes within cards view
watch(() => route.params.id, (newId) => {
  if (route.name === 'cards' && newId && newId !== selectedId.value) {
    // Check for unsaved changes before switching employees
    if (isFormDirty.value) {
      pendingNavigation.value = { name: 'cards', params: { id: newId } };
      showUnsavedChangesPopup.value = true;
    } else {
      selectEmployee(newId);
    }
  }
});

// Helper function to ensure employees are loaded
async function loadEmployeesIfNeeded() {
  if (employees.value.length === 0) {
    await loadEmployees();
  }
}

// Templates (for employee cards document generation section)
const templates = ref([]);



// Динамические значения статусов из fields_schema (по позиции в field_options)
// Конвенция: options[0] = рабочий, options[1] = уволен, options[2] = отпуск, options[3] = больничный
const employmentOptions = computed(() => {
  const field = allFieldsSchema.value.find(f => f.key === 'employment_status');
  return field?.options || [];
});

const workingStatus = computed(() => employmentOptions.value[0] || '');

// Маппинг технических названий полей на человекопонятные — динамически из fields_schema
const fieldLabels = computed(() => {
  const map = {};
  allFieldsSchema.value.forEach(f => {
    map[f.key] = f.label;
  });
  return map;
});



// Custom reports functions

const form = reactive(emptyEmployee());

// Unsaved changes tracking
const isFormDirty = ref(false);
const savedFormSnapshot = ref(null); // Snapshot of form when last saved/loaded
const showUnsavedChangesPopup = ref(false);
const pendingNavigation = ref(null); // Store pending route for navigation after user confirms

// Watch form changes to track unsaved changes (must come after form declaration)
watch(form, () => {
  if (!savedFormSnapshot.value) return; // No baseline to compare against

  // Compare current form with saved snapshot
  const hasChanges = Object.keys(form).some(key => {
    return form[key] !== savedFormSnapshot.value[key];
  });

  isFormDirty.value = hasChanges;
}, { deep: true });

// Dictionaries теперь формируются динамически из fields_schema.csv


const filteredEmployeesForCards = computed(() => {
  const query = cardSearchTerm.value.trim().toLowerCase();
  if (!query) return employees.value;

  return employees.value.filter((employee) => {
    for (const field of allFieldsSchema.value) {
      if (field.type === 'file') continue;
      const val = employee[field.key];
      if (val && String(val).toLowerCase().includes(query)) return true;
    }
    const name = displayName(employee);
    if (name.toLowerCase().includes(query)) return true;
    if (employee.employee_id && String(employee.employee_id).toLowerCase().includes(query)) return true;
    return false;
  });
});

// Global search
let globalSearchTimeout;

async function performGlobalSearch(query) {
  if (!query || query.trim().length < 2) {
    globalSearchResults.value = { employees: [], templates: [], documents: [] };
    showGlobalSearchResults.value = false;
    return;
  }
  globalSearchLoading.value = true;
  try {
    const result = await api.globalSearch(query);
    // Only apply results if the search term hasn't changed while waiting
    if (globalSearchTerm.value === query) {
      globalSearchResults.value = result;
      showGlobalSearchResults.value = true;
    }
  } catch (err) {
    console.error('Global search failed:', err);
    if (globalSearchTerm.value === query) {
      globalSearchResults.value = { employees: [], templates: [], documents: [] };
    }
  } finally {
    if (globalSearchTerm.value === query) {
      globalSearchLoading.value = false;
    }
  }
}

watch(() => globalSearchTerm.value, (newTerm) => {
  clearTimeout(globalSearchTimeout);
  if (!newTerm || newTerm.trim().length < 2) {
    globalSearchResults.value = { employees: [], templates: [], documents: [] };
    showGlobalSearchResults.value = false;
    return;
  }
  globalSearchTimeout = setTimeout(() => {
    performGlobalSearch(newTerm);
  }, 300);
});

function onGlobalSearchFocus() {
  if (globalSearchTerm.value.trim().length >= 2 && globalSearchHasResults.value) {
    showGlobalSearchResults.value = true;
  }
}

function closeGlobalSearch() {
  showGlobalSearchResults.value = false;
}

function selectGlobalSearchEmployee(employeeId) {
  closeGlobalSearch();
  globalSearchTerm.value = "";
  openEmployeeCard(employeeId);
}

function selectGlobalSearchTemplate() {
  closeGlobalSearch();
  globalSearchTerm.value = "";
  router.push({ name: 'templates' });
}

function selectGlobalSearchDocument(doc) {
  closeGlobalSearch();
  globalSearchTerm.value = "";
  const downloadUrl = api.downloadDocument(doc.document_id);
  window.open(downloadUrl, '_blank');
}

const globalSearchHasResults = computed(() => {
  const r = globalSearchResults.value;
  return r.employees.length > 0 || r.templates.length > 0 || r.documents.length > 0;
});

const isNew = computed(() => !form.employee_id);

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
    await reloadEmployeePreservingDirty(form.employee_id);
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
    await reloadEmployeePreservingDirty(form.employee_id);
    closeStatusChangePopup();
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

// Попап завантаження документа
const showDocUploadPopup = ref(false);
const docUploadForm = reactive({
  fieldKey: '',
  fieldLabel: '',
  file: null,
  issueDate: '',
  expiryDate: ''
});
const docUploadSaving = ref(false);

// Попап редагування дат документа (без перезавантаження файлу)
const showDocEditDatesPopup = ref(false);
const docEditDatesForm = reactive({
  fieldKey: '',
  fieldLabel: '',
  issueDate: '',
  expiryDate: ''
});
const docEditDatesSaving = ref(false);

function openDocUploadPopup(doc) {
  docUploadForm.fieldKey = doc.key;
  docUploadForm.fieldLabel = doc.label;
  docUploadForm.file = null;
  // Якщо документ вже завантажений — підставляємо існуючі дати
  const issueDateField = `${doc.key}_issue_date`;
  const expiryDateField = `${doc.key}_expiry_date`;
  docUploadForm.issueDate = form[issueDateField] || '';
  docUploadForm.expiryDate = form[expiryDateField] || '';
  showDocUploadPopup.value = true;
}

function closeDocUploadPopup() {
  showDocUploadPopup.value = false;
}

function onDocUploadFileChange(event) {
  docUploadForm.file = event.target.files?.[0] || null;
}

async function submitDocUpload() {
  if (!form.employee_id || !docUploadForm.file || !docUploadForm.fieldKey) return;
  if (docUploadSaving.value) return;
  if (docUploadForm.issueDate && docUploadForm.expiryDate && docUploadForm.expiryDate < docUploadForm.issueDate) {
    errorMessage.value = 'Дата закінчення не може бути раніше дати видачі';
    return;
  }

  docUploadSaving.value = true;
  errorMessage.value = '';
  try {
    const formData = new FormData();
    formData.append('file', docUploadForm.file);
    formData.append('file_field', docUploadForm.fieldKey);
    if (docUploadForm.issueDate) {
      formData.append('issue_date', docUploadForm.issueDate);
    }
    if (docUploadForm.expiryDate) {
      formData.append('expiry_date', docUploadForm.expiryDate);
    }
    const response = await api.uploadEmployeeFile(form.employee_id, formData);
    form[docUploadForm.fieldKey] = response?.path || '';
    // Оновлюємо дати в формі
    const issueDateField = `${docUploadForm.fieldKey}_issue_date`;
    const expiryDateField = `${docUploadForm.fieldKey}_expiry_date`;
    form[issueDateField] = docUploadForm.issueDate || '';
    form[expiryDateField] = docUploadForm.expiryDate || '';
    closeDocUploadPopup();
    await reloadEmployeePreservingDirty(form.employee_id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    docUploadSaving.value = false;
  }
}

function openDocEditDatesPopup(doc) {
  const issueDateField = `${doc.key}_issue_date`;
  const expiryDateField = `${doc.key}_expiry_date`;
  docEditDatesForm.fieldKey = doc.key;
  docEditDatesForm.fieldLabel = doc.label;
  docEditDatesForm.issueDate = form[issueDateField] || '';
  docEditDatesForm.expiryDate = form[expiryDateField] || '';
  showDocEditDatesPopup.value = true;
}

function closeDocEditDatesPopup() {
  showDocEditDatesPopup.value = false;
}

async function submitDocEditDates() {
  if (!form.employee_id || !docEditDatesForm.fieldKey) return;
  if (docEditDatesSaving.value) return;
  if (docEditDatesForm.issueDate && docEditDatesForm.expiryDate && docEditDatesForm.expiryDate < docEditDatesForm.issueDate) {
    errorMessage.value = 'Дата закінчення не може бути раніше дати видачі';
    return;
  }

  docEditDatesSaving.value = true;
  errorMessage.value = '';
  try {
    const issueDateField = `${docEditDatesForm.fieldKey}_issue_date`;
    const expiryDateField = `${docEditDatesForm.fieldKey}_expiry_date`;
    const currentEmployee = employees.value.find(e => e.employee_id === form.employee_id);
    if (!currentEmployee) {
      errorMessage.value = 'Співробітника не знайдено. Оновіть сторінку.';
      docEditDatesSaving.value = false;
      return;
    }
    const payload = {
      ...currentEmployee,
      [issueDateField]: docEditDatesForm.issueDate || '',
      [expiryDateField]: docEditDatesForm.expiryDate || ''
    };
    await api.updateEmployee(form.employee_id, payload);
    await reloadEmployeePreservingDirty(form.employee_id);
    closeDocEditDatesPopup();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    docEditDatesSaving.value = false;
  }
}

// Попап підтвердження очищення форми
const showClearConfirmPopup = ref(false);

function openClearConfirmPopup() {
  showClearConfirmPopup.value = true;
}

function closeClearConfirmPopup() {
  showClearConfirmPopup.value = false;
}

function confirmClearForm() {
  closeClearConfirmPopup();
  startNew();
}

// Unsaved changes popup handlers
function closeUnsavedChangesPopup() {
  showUnsavedChangesPopup.value = false;
  pendingNavigation.value = null;
}

async function saveAndContinue() {
  if (saving.value) return;

  // Save the employee first
  await saveEmployee();

  // If save was successful (no error), proceed with navigation
  if (!errorMessage.value && pendingNavigation.value) {
    isFormDirty.value = false; // Force clean state
    const target = pendingNavigation.value;
    closeUnsavedChangesPopup();
    router.push(target);
  }
}

function continueWithoutSaving() {
  if (pendingNavigation.value) {
    isFormDirty.value = false; // Force clean state to allow navigation
    const target = pendingNavigation.value;
    closeUnsavedChangesPopup();
    router.push(target);
  }
}

function cancelNavigation() {
  closeUnsavedChangesPopup();
}

function formatDocDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function isDocExpiringSoon(doc) {
  const expiryDateField = `${doc.key}_expiry_date`;
  const expiryDate = form[expiryDateField];
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  const diffDays = Math.round((expiry - today) / 86400000);
  return diffDays >= 0 && diffDays <= 7;
}

function isDocExpired(doc) {
  const expiryDateField = `${doc.key}_expiry_date`;
  const expiryDate = form[expiryDateField];
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  return expiry < today;
}

function emptyEmployee() {
  const base = {};
  // Используем динамический список полей из schema
  if (allFieldsSchema.value.length > 0) {
    for (const field of allFieldsSchema.value) {
      base[field.key] = "";
      // Для file-полей добавляем companion date columns
      if (field.type === 'file') {
        base[`${field.key}_issue_date`] = "";
        base[`${field.key}_expiry_date`] = "";
      }
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

  // Reset dirty tracking
  updateFormSnapshot();
  isFormDirty.value = false;
}

// Helper function to update the form snapshot
function updateFormSnapshot() {
  savedFormSnapshot.value = { ...form };
}

// Compute changed fields for display in unsaved changes dialog
const changedFields = computed(() => {
  if (!savedFormSnapshot.value || !isFormDirty.value) return [];

  const changes = [];
  Object.keys(form).forEach(key => {
    if (form[key] !== savedFormSnapshot.value[key]) {
      const label = fieldLabels.value[key] || key;
      changes.push(label);
    }
  });

  return changes;
});

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


async function loadEmployees(silent = false) {
  if (!silent) loading.value = true;
  if (!silent) errorMessage.value = "";
  try {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
  } catch (error) {
    if (!silent) errorMessage.value = error.message;
  } finally {
    if (!silent) loading.value = false;
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

    // Create snapshot after loading employee
    updateFormSnapshot();
    isFormDirty.value = false;
  } catch (error) {
    errorMessage.value = error.message;
  }
}

// Helper to check and preserve unsaved changes when reloading
async function reloadEmployeePreservingDirty(employeeId) {
  // After operations like status change or document upload,
  // we need to reload to get fresh data, but only reload if no other fields are dirty
  await loadEmployees();

  // Re-select to refresh form data
  await selectEmployee(employeeId);
}

function startNew() {
  // Check for unsaved changes before clearing form
  if (isFormDirty.value) {
    openClearConfirmPopup();
    return;
  }

  selectedId.value = "";
  resetForm();
  isCreatingNew.value = true;
  // Stay on cards view, but ensure URL doesn't have an ID
  if (route.name === 'cards' && route.params.id) {
    router.push({ name: 'cards' });
  }
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

    // Reset dirty flag after successful save
    updateFormSnapshot();
    isFormDirty.value = false;
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

function openDocument(fieldKey) {
  const filePath = form[fieldKey];
  if (!filePath) {
    return;
  }
  // SECURITY: Validate file path starts with expected prefix to prevent XSS
  if (!filePath.startsWith('files/')) {
    console.error('Invalid file path (must start with "files/"):', filePath);
    return;
  }
  const url = `${import.meta.env.VITE_API_URL || ""}/${filePath}`;
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
    form[`${doc.key}_issue_date`] = "";
    form[`${doc.key}_expiry_date`] = "";
    await loadEmployees();
  } catch (error) {
    errorMessage.value = error.message;
  }
}


// Templates (for employee cards document generation section)
async function loadTemplates() {
  try {
    const data = await api.getTemplates();
    templates.value = data.templates || [];
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

async function generateDocumentForEmployee(template) {
  try {
    const employeeId = form.employee_id;

    if (!employeeId) {
      alert('Помилка: не знайдено ID співробітника. Спочатку збережіть співробітника.');
      return;
    }

    if (!template.docx_filename) {
      alert('Помилка: для цього шаблону не завантажено файл DOCX');
      return;
    }

    // Generate document with employee data
    const result = await api.generateDocument(template.template_id, employeeId, {});

    // Auto-download the document
    const downloadUrl = api.downloadDocument(result.document_id);
    window.open(downloadUrl, '_blank');

    alert(`✓ Документ "${template.template_name}" успішно згенеровано та завантажено`);
  } catch (error) {
    alert('Помилка генерування документа: ' + error.message);
  }
}

// Placeholder reference

async function loadFieldsSchema() {
  try {
    const data = await api.getFieldsSchema();

    // Формируем группы полей для карточек (исключаем группу "Документи" - для неї окрема таблиця)
    const groups = data.groups || {};
    fieldGroups.value = Object.keys(groups)
      .filter(groupName => groupName && groupName !== 'Документи')
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


function openEmployeeCard(employeeId) {
  isCreatingNew.value = false;
  router.push({ name: 'cards', params: { id: employeeId } });
  // selectEmployee will be called by route.params.id watcher
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
    if (showUnsavedChangesPopup.value) {
      cancelNavigation();
    } else if (showClearConfirmPopup.value) {
      closeClearConfirmPopup();
    } else if (showDocUploadPopup.value) {
      closeDocUploadPopup();
    } else if (showDocEditDatesPopup.value) {
      closeDocEditDatesPopup();
    } else if (showStatusChangePopup.value) {
      closeStatusChangePopup();
    }
  }
}

// Watch for filter field changes and reset condition when field type changes
onMounted(async () => {
  // Apply theme on load
  document.documentElement.setAttribute('data-theme', currentTheme.value);

  document.addEventListener('keydown', handleGlobalKeydown);

  // Setup navigation guard for unsaved changes
  router.beforeEach((to, from, next) => {
    // Check if leaving cards view with unsaved changes
    if (from.name === 'cards' && to.name !== 'cards' && isFormDirty.value) {
      // Store pending navigation and show confirmation dialog
      pendingNavigation.value = to;
      showUnsavedChangesPopup.value = true;
      next(false); // Cancel navigation - we'll manually navigate after user confirms
    } else {
      next(); // Allow navigation
    }
  });

  // Setup beforeunload handler for browser refresh/close
  window.addEventListener('beforeunload', (e) => {
    if (isFormDirty.value && route.name === 'cards') {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
    }
  });

  // Load config
  try {
    const config = await api.getConfig();
    appConfig.value = config;
  } catch (error) {
    console.error('Failed to load config:', error);
  }

  await loadFieldsSchema();
  await loadEmployees();

  // Restore view state from route params
  if (route.name === 'cards') {
    if (route.params.id) {
      selectEmployee(route.params.id);
    } else if (employees.value.length > 0) {
      // Auto-load first employee if navigating to cards without ID
      openEmployeeCard(employees.value[0].employee_id);
    }
  }

  // Load dashboard events if on dashboard
  if (route.name === 'dashboard' || !route.name) {
    await loadDashboardEvents();
    await loadOverdueDocuments();
    startDashboardRefresh();
  }

});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  clearTimeout(globalSearchTimeout);
});
</script>

<template>
  <div class="app">
    <div class="page">
      <header class="topbar">
        <div class="brand">
          <div class="brand-title">CRM на CSV</div>
          <div class="brand-sub">Vue + Node, локальні CSV файли</div>
        </div>
        <div class="global-search-wrapper">
          <input
            v-model="globalSearchTerm"
            class="global-search-input"
            type="search"
            placeholder="Глобальний пошук..."
            @focus="onGlobalSearchFocus"
            @blur="closeGlobalSearch"
          />
          <div v-if="globalSearchLoading" class="global-search-spinner">...</div>
          <div
            v-if="showGlobalSearchResults && globalSearchHasResults"
            class="global-search-dropdown"
          >
            <div v-if="globalSearchResults.employees.length > 0" class="global-search-group">
              <div class="global-search-group-header">
                Співробітники ({{ globalSearchResults.total?.employees || globalSearchResults.employees.length }})
              </div>
              <div
                v-for="emp in globalSearchResults.employees"
                :key="'emp-' + emp.employee_id"
                class="global-search-item"
                @mousedown.prevent="selectGlobalSearchEmployee(emp.employee_id)"
              >
                <span class="global-search-item-name">{{ displayName(emp) }}</span>
                <span class="global-search-item-meta">ID: {{ emp.employee_id }}</span>
              </div>
            </div>
            <div v-if="globalSearchResults.templates.length > 0" class="global-search-group">
              <div class="global-search-group-header">
                Шаблони ({{ globalSearchResults.total?.templates || globalSearchResults.templates.length }})
              </div>
              <div
                v-for="tmpl in globalSearchResults.templates"
                :key="'tmpl-' + tmpl.template_id"
                class="global-search-item"
                @mousedown.prevent="selectGlobalSearchTemplate(tmpl.template_id)"
              >
                <span class="global-search-item-name">{{ tmpl.template_name }}</span>
                <span class="global-search-item-meta">{{ tmpl.template_type || '' }}</span>
              </div>
            </div>
            <div v-if="globalSearchResults.documents.length > 0" class="global-search-group">
              <div class="global-search-group-header">
                Документи ({{ globalSearchResults.total?.documents || globalSearchResults.documents.length }})
              </div>
              <div
                v-for="doc in globalSearchResults.documents"
                :key="'doc-' + doc.document_id"
                class="global-search-item"
                @mousedown.prevent="selectGlobalSearchDocument(doc)"
              >
                <span class="global-search-item-name">{{ doc.docx_filename || 'Без назви' }}</span>
                <span class="global-search-item-meta">{{ doc.employee_name || '' }}</span>
              </div>
            </div>
          </div>
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
          <button
            class="tab-icon-btn refresh-btn"
            type="button"
            @click="refreshManually"
            title="Оновити дані"
          >
            🔄
          </button>
          <button
            class="tab-icon-btn theme-toggle-btn"
            type="button"
            @click="toggleTheme"
            :title="currentTheme === 'light' ? 'Перемкнути на темну тему' : 'Перемкнути на світлу тему'"
          >
            {{ currentTheme === 'light' ? '🌙' : '☀️' }}
          </button>
        </div>
      </header>

      <DashboardView v-if="currentView === 'dashboard'" />

      <div v-else-if="currentView === 'cards'" class="layout">
        <aside class="panel">
          <div class="panel-header">
            <div class="panel-title-group">
              <div class="panel-title">Співробітники</div>
              <button
                class="tab-icon-btn"
                type="button"
                @click="startNew"
                title="Новий працівник"
              >
                ➕
              </button>
            </div>
            <div class="status-bar">
              <span v-if="loading">Завантаження...</span>
              <span v-else-if="cardSearchTerm.trim()">{{ filteredEmployeesForCards.length }} з {{ employees.length }}</span>
              <span v-else>{{ employees.length }} всього</span>
            </div>
          </div>
          <div class="card-search-wrapper">
            <input
              v-model="cardSearchTerm"
              class="search-input"
              type="search"
              placeholder="Пошук за будь-яким полем"
            />
            <button
              v-if="cardSearchTerm"
              class="card-search-clear"
              type="button"
              @click="cardSearchTerm = ''"
              title="Очистити пошук"
            >&times;</button>
          </div>
          <div class="employee-list">
            <div
              v-for="(employee, index) in filteredEmployeesForCards"
              :key="employee.employee_id"
              class="employee-card"
              :class="{ active: employee.employee_id === selectedId }"
              :style="{ animationDelay: `${index * 0.04}s` }"
              @click="openEmployeeCard(employee.employee_id)"
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
              <button
                class="primary"
                type="button"
                :disabled="saving"
                @click="saveEmployee"
              >
                {{ saving ? "Збереження..." : "Зберегти" }}
              </button>
              <div class="destructive-actions">
                <button
                  class="icon-btn clear-btn"
                  type="button"
                  @click="openClearConfirmPopup"
                  title="Очистити форму"
                >
                  ✖️
                </button>
                <button
                  v-if="!isNew"
                  class="icon-btn delete-btn"
                  type="button"
                  :disabled="saving"
                  @click="deleteEmployee"
                  title="Видалити співробітника"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>

          <div class="detail-grid">
            <div v-for="group in fieldGroups" :key="group.title" class="section">
              <div class="section-title">{{ group.title }}</div>
              <div class="form-grid">
                <template v-for="field in group.fields" :key="field.key">
                <div class="field">
                  <label :for="field.key">{{ field.label }}<span v-if="field.key === 'first_name' || field.key === 'last_name' || field.key === 'gender'" style="color: red;"> *</span></label>
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
                    :required="field.key === 'gender'"
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
                <div v-if="field.key === 'last_name'" class="field" style="display: flex; align-items: center; padding-top: 1.4em;">
                  <label style="display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; white-space: nowrap;">
                    <input type="checkbox" v-model="form.indeclinable_name" true-value="yes" false-value="" style="width: auto;" />
                    Прізвище не склоняється
                  </label>
                </div>
                <div v-if="field.key === 'first_name'" class="field" style="display: flex; align-items: center; padding-top: 1.4em;">
                  <label style="display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; white-space: nowrap;">
                    <input type="checkbox" v-model="form.indeclinable_first_name" true-value="yes" false-value="" style="width: auto;" />
                    Ім'я не склоняється
                  </label>
                </div>
                </template>
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
                    <th>Дата видачі</th>
                    <th>Дата закінчення</th>
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
                      <span v-if="form[doc.key + '_issue_date']">{{ formatDocDate(form[doc.key + '_issue_date']) }}</span>
                      <span v-else class="doc-date-empty">—</span>
                    </td>
                    <td>
                      <span
                        v-if="form[doc.key + '_expiry_date']"
                        :class="{ 'doc-date-expiring': isDocExpiringSoon(doc), 'doc-date-expired': isDocExpired(doc) }"
                      >{{ formatDocDate(form[doc.key + '_expiry_date']) }}</span>
                      <span v-else class="doc-date-empty">—</span>
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
                            class="secondary small"
                            type="button"
                            @click="openDocUploadPopup(doc)"
                            title="Замінити документ"
                          >
                            Замінити
                          </button>
                          <button
                            class="secondary small"
                            type="button"
                            @click="openDocEditDatesPopup(doc)"
                            title="Редагувати дати"
                          >
                            Дати
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
                          <button
                            class="primary small"
                            type="button"
                            @click="openDocUploadPopup(doc)"
                          >
                            Завантажити
                          </button>
                        </template>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="panel-header">
                <div class="section-title">Генерування документів</div>
                <div class="button-group">
                  <button class="secondary small" type="button" @click="router.push({ name: 'templates' })">➕ Керувати шаблонами</button>
                  <button class="secondary small" type="button"
                    @click="router.push({ name: 'placeholder-reference', params: { employeeId: selectedId } })">
                    Плейсхолдери
                  </button>
                </div>
              </div>
              <div v-if="isNew" class="inline-note">
                Спочатку збережіть співробітника, потім згенеруйте документи.
              </div>
              <div v-else-if="templates.length === 0" class="empty-state">
                Немає доступних шаблонів документів.
                <a href="#" @click.prevent="router.push({ name: 'templates' })">Створити шаблон</a>
              </div>
              <div v-else class="document-generation-grid">
                <div
                  v-for="template in templates"
                  :key="template.template_id"
                  class="template-card"
                  :class="{ disabled: !template.docx_filename }"
                >
                  <div class="template-card-icon">📄</div>
                  <div class="template-card-content">
                    <div class="template-card-title">{{ template.template_name }}</div>
                    <div class="template-card-description">{{ template.description || 'Без опису' }}</div>
                    <div v-if="!template.docx_filename" class="warning-text">
                      ⚠ Файл DOCX не завантажено
                    </div>
                  </div>
                  <button
                    class="primary small"
                    type="button"
                    :disabled="!template.docx_filename"
                    @click="generateDocumentForEmployee(template)"
                  >
                    Згенерувати
                  </button>
                </div>
              </div>
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
          </div>
        </section>
      </div>

      <!-- Table View -->
      <TableView v-else-if="currentView === 'table'" />

      <!-- Reports View -->
      <ReportsView v-else-if="currentView === 'reports'" />

      <!-- Режим імпорту -->
      <ImportView v-else-if="currentView === 'import'" />

      <!-- Templates View -->
      <TemplatesView v-else-if="currentView === 'templates'" />

      <!-- Document History View -->
      <DocumentHistoryView v-else-if="currentView === 'document-history'" />

      <!-- Placeholder Reference View -->
      <PlaceholderReferenceView v-else-if="currentView === 'placeholder-reference'" />

      <!-- Logs View -->
      <LogsView v-else-if="currentView === 'logs'" />

    </div>
  </div>
</template>
