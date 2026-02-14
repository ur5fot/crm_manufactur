<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "./api";
import LogsView from "./views/LogsView.vue";
import ImportView from "./views/ImportView.vue";
import DocumentHistoryView from "./views/DocumentHistoryView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import ReportsView from "./views/ReportsView.vue";
import DashboardView from "./views/DashboardView.vue";
import TableView from "./views/TableView.vue";
import { useFieldsSchema } from "./composables/useFieldsSchema";

const { allFieldsSchema, fieldGroups, dictionaries, documentFields, getFieldType, loadFieldsSchema } = useFieldsSchema();

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

// CSV links removed - data directory not publicly accessible for security reasons

const employees = ref([]);
const selectedId = ref("");
const searchTerm = ref("");
const isCreatingNew = ref(false); // Flag to prevent auto-load when creating new employee
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const openingDataFolder = ref(false);
const openingEmployeeFolder = ref(false);

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

watch(() => route.name, async (newRoute, oldRoute) => {
  const newView = currentView.value;
  const oldView = oldRoute === 'dashboard' ? 'dashboard' :
                   oldRoute === 'cards' ? 'cards' :
                   oldRoute === 'table' ? 'table' :
                   oldRoute === 'reports' ? 'reports' :
                   oldRoute === 'templates' ? 'templates' :
                   oldRoute === 'document-history' ? 'document-history' :
                   oldRoute === 'logs' ? 'logs' : 'dashboard';

  if (newView === 'table') {
    loadEmployees();
  }

  if (newView === 'placeholder-reference') {
    loadPlaceholderPreview();
  }

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
// Templates management
const templates = ref([]);
const showTemplateDialog = ref(false);
const templateDialogMode = ref('create'); // 'create' or 'edit'
const templateForm = reactive({
  template_id: '',
  template_name: '',
  template_type: '',
  description: '',
  placeholder_fields: '',
  docx_filename: ''
});

// Template upload modal
const showUploadTemplateModal = ref(false);
const uploadTemplateId = ref('');
const uploadTemplateName = ref('');
const selectedTemplateFile = ref(null);

// Placeholder reference page
const placeholderRefData = ref(null);
const placeholderRefLoading = ref(false);
const placeholderRefError = ref('');
const placeholderRefSearch = ref('');


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

  return result;
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

// Templates management functions
async function loadTemplates() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await api.getTemplates();
    templates.value = data.templates || [];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

function openCreateTemplateDialog() {
  templateDialogMode.value = 'create';
  Object.assign(templateForm, {
    template_id: '',
    template_name: '',
    template_type: '',
    description: '',
    placeholder_fields: '',
    docx_filename: ''
  });
  showTemplateDialog.value = true;
}

function editTemplate(template) {
  templateDialogMode.value = 'edit';
  Object.assign(templateForm, {
    template_id: template.template_id,
    template_name: template.template_name,
    template_type: template.template_type,
    description: template.description || '',
    placeholder_fields: template.placeholder_fields || '',
    docx_filename: template.docx_filename || ''
  });
  showTemplateDialog.value = true;
}

async function saveTemplate() {
  try {
    const payload = {
      template_name: templateForm.template_name,
      template_type: templateForm.template_type,
      description: templateForm.description || ''
    };

    if (templateDialogMode.value === 'create') {
      await api.createTemplate(payload);
      alert('✓ Шаблон створено успішно');
    } else {
      await api.updateTemplate(templateForm.template_id, payload);
      alert('✓ Шаблон оновлено успішно');
    }

    closeTemplateDialog();
    await loadTemplates();
  } catch (error) {
    alert('Помилка збереження: ' + error.message);
  }
}

function closeTemplateDialog() {
  showTemplateDialog.value = false;
  Object.assign(templateForm, {
    template_id: '',
    template_name: '',
    template_type: '',
    description: '',
    placeholder_fields: '',
    docx_filename: ''
  });
}

function uploadTemplateFile(template) {
  uploadTemplateId.value = template.template_id;
  uploadTemplateName.value = template.template_name;
  selectedTemplateFile.value = null;
  showUploadTemplateModal.value = true;
}

function closeUploadTemplateModal() {
  showUploadTemplateModal.value = false;
  uploadTemplateId.value = '';
  uploadTemplateName.value = '';
  selectedTemplateFile.value = null;
}

function onTemplateFileSelected(event) {
  const file = event.target.files?.[0];
  if (file) {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Помилка: файл повинен мати розширення .docx');
      event.target.value = '';
      return;
    }
    selectedTemplateFile.value = file;
  }
}

async function uploadTemplateDocx() {
  if (!selectedTemplateFile.value) {
    alert('Будь ласка, оберіть файл DOCX');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', selectedTemplateFile.value);

    const result = await api.uploadTemplateFile(uploadTemplateId.value, formData);

    alert(`✓ Файл завантажено успішно!\n\nВиявлені плейсхолдери:\n${result.placeholders.join(', ') || '(немає)'}`);

    closeUploadTemplateModal();
    await loadTemplates();
  } catch (error) {
    alert('Помилка завантаження файлу: ' + error.message);
  }
}

async function deleteTemplate(template) {
  const confirmed = confirm(`Видалити шаблон "${template.template_name}"?\n\nЦя дія не видаляє файл DOCX, а лише позначає шаблон як неактивний.`);

  if (!confirmed) {
    return;
  }

  try {
    await api.deleteTemplate(template.template_id);
    alert('Шаблон успішно видалено');
    await loadTemplates();
  } catch (error) {
    alert('Помилка видалення шаблону: ' + error.message);
  }
}

async function openTemplateDocx(template) {
  try {
    await api.openTemplateFile(template.template_id);
  } catch (error) {
    alert('Ошибка открытия файла: ' + error.message);
  }
}

async function reextractTemplatePlaceholders() {
  try {
    const result = await api.reextractPlaceholders(templateForm.template_id);
    templateForm.placeholder_fields = result.placeholders.join(', ');
    alert(`Плейсхолдеры обновлены: ${result.placeholders.join(', ') || '(нет)'}`);
    await loadTemplates();
  } catch (error) {
    alert('Ошибка обновления плейсхолдеров: ' + error.message);
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
async function loadPlaceholderPreview() {
  placeholderRefLoading.value = true;
  placeholderRefError.value = '';
  try {
    const employeeId = route.params.employeeId || undefined;
    placeholderRefData.value = await api.getPlaceholderPreview(employeeId);
  } catch (error) {
    placeholderRefError.value = error.message;
    placeholderRefData.value = null;
  } finally {
    placeholderRefLoading.value = false;
  }
}

const filteredPlaceholders = computed(() => {
  if (!placeholderRefData.value) return [];
  const items = placeholderRefData.value.placeholders || [];
  if (!placeholderRefSearch.value) return items;
  const term = placeholderRefSearch.value.toLowerCase();
  return items.filter(p =>
    p.placeholder.toLowerCase().includes(term) ||
    p.label.toLowerCase().includes(term) ||
    p.value.toLowerCase().includes(term)
  );
});

function copyPlaceholder(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function openEmployeeCard(employeeId) {
  isCreatingNew.value = false;
  router.push({ name: 'cards', params: { id: employeeId } });
  // selectEmployee will be called by route.params.id watcher
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

onMounted(async () => {
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

  if (route.name === 'placeholder-reference') {
    await loadPlaceholderPreview();
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div class="app">
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

    <!-- Попап завантаження документа -->
    <div v-if="showDocUploadPopup" class="vacation-notification-overlay" @click="closeDocUploadPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>{{ docUploadForm.fieldLabel }}</h3>
          <button class="close-btn" @click="closeDocUploadPopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div class="status-change-form">
            <div class="field">
              <label>Файл (PDF або зображення)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png,image/gif,image/webp"
                @change="onDocUploadFileChange"
              />
            </div>
            <div class="field">
              <label>Дата видачі</label>
              <input type="date" v-model="docUploadForm.issueDate" />
            </div>
            <div class="field">
              <label>Дата закінчення</label>
              <input type="date" v-model="docUploadForm.expiryDate" />
            </div>
          </div>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="closeDocUploadPopup">Скасувати</button>
          <button
            class="primary"
            type="button"
            :disabled="!docUploadForm.file || docUploadSaving"
            @click="submitDocUpload"
          >
            {{ docUploadSaving ? 'Завантаження...' : 'Завантажити' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Попап редагування дат документа -->
    <div v-if="showDocEditDatesPopup" class="vacation-notification-overlay" @click="closeDocEditDatesPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>{{ docEditDatesForm.fieldLabel }} — дати</h3>
          <button class="close-btn" @click="closeDocEditDatesPopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div class="status-change-form">
            <div class="field">
              <label>Дата видачі</label>
              <input type="date" v-model="docEditDatesForm.issueDate" />
            </div>
            <div class="field">
              <label>Дата закінчення</label>
              <input type="date" v-model="docEditDatesForm.expiryDate" />
            </div>
          </div>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="closeDocEditDatesPopup">Скасувати</button>
          <button
            class="primary"
            type="button"
            :disabled="docEditDatesSaving"
            @click="submitDocEditDates"
          >
            {{ docEditDatesSaving ? 'Збереження...' : 'Зберегти' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Попап підтвердження очищення форми -->
    <div v-if="showClearConfirmPopup" class="vacation-notification-overlay" @click="closeClearConfirmPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>Підтвердження очищення</h3>
          <button class="close-btn" @click="closeClearConfirmPopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <p style="margin: 0; padding: 16px 0;">Ви впевнені, що хочете очистити форму? Всі незбережені дані будуть втрачені.</p>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="closeClearConfirmPopup">Скасувати</button>
          <button class="primary" type="button" @click="confirmClearForm">Так, очистити</button>
        </div>
      </div>
    </div>

    <!-- Unsaved changes warning popup -->
    <div v-if="showUnsavedChangesPopup" class="vacation-notification-overlay" @click="cancelNavigation">
      <div class="vacation-notification-modal" @click.stop style="max-width: 600px;">
        <div class="vacation-notification-header">
          <h3>Незбережені зміни</h3>
          <button class="close-btn" @click="cancelNavigation">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <p style="margin: 0 0 12px 0;">У вас є незбережені зміни в наступних полях:</p>
          <ul style="margin: 0 0 16px 20px; padding: 0;">
            <li v-for="field in changedFields" :key="field" style="margin: 4px 0;">{{ field }}</li>
          </ul>
          <p style="margin: 0; font-weight: 500;">Зберегти перед виходом?</p>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="cancelNavigation">Скасувати</button>
          <button class="secondary" type="button" @click="continueWithoutSaving">Продовжити без збереження</button>
          <button class="primary" type="button" @click="saveAndContinue" :disabled="saving">
            {{ saving ? 'Збереження...' : 'Зберегти і продовжити' }}
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
        </div>
      </header>

      <!-- Режим Dashboard -->
      <DashboardView v-if="currentView === 'dashboard'" />

      <!-- Режим карточек -->
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
                  <button class="secondary small" type="button" @click="openCreateTemplateDialog">➕ Новий шаблон</button>
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
                <a href="#" @click.prevent="openCreateTemplateDialog">Створити шаблон</a>
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
                  <div class="template-card-actions">
                    <button class="icon-btn" title="Редагувати" @click="editTemplate(template)">✎</button>
                    <button class="icon-btn" title="Відкрити DOCX" @click="openTemplateDocx(template)" :disabled="!template.docx_filename">📄</button>
                    <button class="icon-btn" title="Завантажити DOCX" @click="uploadTemplateFile(template)">📁</button>
                    <button class="icon-btn" title="Видалити" @click="deleteTemplate(template)">🗑</button>
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

      <!-- Режим сводної таблиці -->
      <TableView v-else-if="currentView === 'table'" />

      <!-- Режим звітів -->
      <ReportsView v-else-if="currentView === 'reports'" />

      <!-- Режим імпорту -->
      <ImportView v-else-if="currentView === 'import'" />

      <!-- Режим шаблонів -->
      <TemplatesView v-else-if="currentView === 'templates'" />

      <!-- Режим історії документів -->
      <DocumentHistoryView v-else-if="currentView === 'document-history'" />

      <!-- Довідник плейсхолдерів -->
      <div v-else-if="currentView === 'placeholder-reference'" class="layout-table">
        <div class="panel table-panel">
          <div class="view-header">
            <div class="panel-title">Довідник плейсхолдерів</div>
            <button class="secondary" type="button" @click="router.back()">← Назад</button>
          </div>

          <div v-if="placeholderRefLoading" class="loading-message">Завантаження...</div>
          <div v-else-if="placeholderRefError" class="error-message">{{ placeholderRefError }}</div>
          <template v-else-if="placeholderRefData">
            <div class="placeholder-ref-info">
              Дані співробітника: <strong>{{ placeholderRefData.employee_name }}</strong>
            </div>

            <div class="filter-row" style="margin-bottom: 12px;">
              <input
                type="text"
                class="form-control"
                v-model="placeholderRefSearch"
                placeholder="Пошук плейсхолдера..."
              />
            </div>

            <table class="table table-striped">
              <thead>
                <tr>
                  <th>Плейсхолдер</th>
                  <th>Опис</th>
                  <th>Приклад значення</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in ['fields', 'declension', 'declension_fields', 'special', 'case_variants']" :key="group">
                  <tr v-if="filteredPlaceholders.some(p => p.group === group)" class="placeholder-group-header">
                    <td colspan="3">
                      {{ group === 'fields' ? 'Поля співробітника' : group === 'declension' ? 'Відмінювання імен' : group === 'declension_fields' ? 'Відмінювання посади та звання' : group === 'case_variants' ? 'Варіанти регістру' : 'Спеціальні' }}
                    </td>
                  </tr>
                  <tr
                    v-for="item in filteredPlaceholders.filter(p => p.group === group)"
                    :key="item.placeholder"
                  >
                    <td
                      class="placeholder-cell"
                      @click="copyPlaceholder(item.placeholder)"
                      :title="'Натисніть, щоб скопіювати ' + item.placeholder"
                    >{{ item.placeholder }}</td>
                    <td>{{ item.label }}</td>
                    <td>{{ item.value }}</td>
                  </tr>
                </template>
              </tbody>
            </table>

            <div v-if="filteredPlaceholders.length === 0" class="empty-state">
              Нічого не знайдено за запитом "{{ placeholderRefSearch }}"
            </div>
          </template>
        </div>
      </div>

      <!-- Режим логов -->
      <LogsView v-else-if="currentView === 'logs'" />
    </div>

    <!-- Template Create/Edit Dialog -->
    <div v-if="showTemplateDialog" class="vacation-notification-overlay" @click="closeTemplateDialog">
      <div class="vacation-notification-modal" @click.stop style="max-width: 600px;">
        <div class="vacation-notification-header">
          <h3>{{ templateDialogMode === 'create' ? 'Новий шаблон' : 'Редагувати шаблон' }}</h3>
          <button class="close-btn" @click="closeTemplateDialog">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div class="form-group">
            <label for="template-name">Назва шаблону <span style="color: red;">*</span></label>
            <input
              id="template-name"
              v-model="templateForm.template_name"
              type="text"
              required
              placeholder="Наприклад: Заявка на відпустку"
            />
          </div>

          <div class="form-group">
            <label for="template-type">Тип документа <span style="color: red;">*</span></label>
            <select id="template-type" v-model="templateForm.template_type" required>
              <option value="">Оберіть тип</option>
              <option value="Заявка">Заявка</option>
              <option value="Службова записка">Службова записка</option>
              <option value="Доповідь/Звіт">Доповідь/Звіт</option>
              <option value="Інше">Інше</option>
            </select>
          </div>

          <div class="form-group">
            <label for="template-description">Опис</label>
            <textarea
              id="template-description"
              v-model="templateForm.description"
              rows="3"
              placeholder="Опис шаблону та його призначення"
            ></textarea>
          </div>

          <div v-if="templateForm.placeholder_fields || templateForm.docx_filename" class="form-group">
            <label>Плейсхолдери (автоматично з DOCX)</label>
            <input
              v-model="templateForm.placeholder_fields"
              type="text"
              readonly
              style="background-color: #f5f5f5; cursor: not-allowed;"
            />
            <button
              v-if="templateDialogMode === 'edit' && templateForm.docx_filename"
              class="secondary small"
              type="button"
              style="margin-top: 6px;"
              @click="reextractTemplatePlaceholders"
            >
              Обновить плейсхолдеры
            </button>
          </div>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="closeTemplateDialog">Скасувати</button>
          <button
            class="primary"
            type="button"
            @click="saveTemplate"
            :disabled="!templateForm.template_name || !templateForm.template_type"
          >
            {{ templateDialogMode === 'create' ? 'Створити' : 'Зберегти' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Template Upload DOCX Dialog -->
    <div v-if="showUploadTemplateModal" class="vacation-notification-overlay" @click="closeUploadTemplateModal">
      <div class="vacation-notification-modal" @click.stop style="max-width: 550px;">
        <div class="vacation-notification-header">
          <h3>Завантаження DOCX шаблону</h3>
          <button class="close-btn" @click="closeUploadTemplateModal">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <p style="margin-bottom: 15px;">
            <strong>{{ uploadTemplateName }}</strong>
          </p>

          <div class="help-box" style="background-color: #f0f8ff; border-left: 4px solid #0066cc; padding: 15px; margin-bottom: 20px;">
            <h4 style="margin-top: 0; margin-bottom: 10px; color: #0066cc;">📋 Інструкція зі створення шаблону</h4>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Створіть DOCX файл у Microsoft Word або LibreOffice</li>
              <li>Використовуйте плейсхолдери у форматі <code>{{'{'}}field_name{{'}'}}</code></li>
              <li>Доступні поля співробітника: <code>{{'{'}}last_name{{'}'}}</code>, <code>{{'{'}}first_name{{'}'}}</code>, <code>{{'{'}}position{{'}'}}</code>, та ін.</li>
              <li>Спеціальні плейсхолдери: <code>{{'{'}}current_date{{'}'}}</code>, <code>{{'{'}}current_datetime{{'}'}}</code></li>
              <li>
                Відмінювання ПІБ — додайте суфікс падежу до <code>last_name</code>, <code>first_name</code>, <code>middle_name</code>, <code>full_name</code>:
                <br/>
                <code style="font-size: 0.85em;">_genitive</code> (родовий: Іванова),
                <code style="font-size: 0.85em;">_dative</code> (давальний: Іванову),
                <code style="font-size: 0.85em;">_accusative</code> (знахідний),
                <code style="font-size: 0.85em;">_vocative</code> (кличний),
                <code style="font-size: 0.85em;">_locative</code> (місцевий),
                <code style="font-size: 0.85em;">_ablative</code> (орудний)
              </li>
              <li>Приклад: "Надати <code>{{'{'}}full_name_dative{{'}'}}</code> відпустку" → "Надати Іванову Петру Миколайовичу відпустку"</li>
            </ul>
          </div>

          <div class="form-group">
            <label for="template-file-input">Оберіть DOCX файл <span style="color: red;">*</span></label>
            <input
              id="template-file-input"
              type="file"
              accept=".docx"
              @change="onTemplateFileSelected"
            />
            <p v-if="selectedTemplateFile" style="margin-top: 10px; color: #28a745;">
              ✓ Обрано: {{ selectedTemplateFile.name }}
            </p>
          </div>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="closeUploadTemplateModal">Скасувати</button>
          <button
            class="primary"
            type="button"
            @click="uploadTemplateDocx"
            :disabled="!selectedTemplateFile"
          >
            Завантажити
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
