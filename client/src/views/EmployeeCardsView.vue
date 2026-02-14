<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "../api";
import { useFieldsSchema } from "../composables/useFieldsSchema";
import { useEmployeeForm } from "../composables/useEmployeeForm";

const { allFieldsSchema, fieldGroups, dictionaries, documentFields, loadFieldsSchema } = useFieldsSchema();
const {
  form,
  isFormDirty,
  showUnsavedChangesPopup,
  pendingNavigation,
  isNew,
  changedFields,
  emptyEmployee,
  resetForm,
  updateFormSnapshot,
  closeUnsavedChangesPopup,
  cancelNavigation
} = useEmployeeForm();

const router = useRouter();
const route = useRoute();

const employees = ref([]);
const selectedId = ref("");
const searchTerm = ref("");
const isCreatingNew = ref(false);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const openingDataFolder = ref(false);
const openingEmployeeFolder = ref(false);

// Employment status options from schema
const employmentOptions = computed(() => {
  const field = allFieldsSchema.value.find(f => f.key === 'employment_status');
  return field?.options || [];
});

const workingStatus = computed(() => employmentOptions.value[0] || '');

// Templates management
const templates = ref([]);
const showTemplateDialog = ref(false);
const templateDialogMode = ref('create');
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

// Status change popup
const showStatusChangePopup = ref(false);
const statusChangeForm = reactive({
  status: '',
  startDate: '',
  endDate: ''
});

const statusChangeOptions = computed(() => {
  return employmentOptions.value.slice(1);
});

// Document upload popup
const showDocUploadPopup = ref(false);
const docUploadForm = reactive({
  fieldKey: '',
  fieldLabel: '',
  file: null,
  issueDate: '',
  expiryDate: ''
});
const docUploadSaving = ref(false);

// Document edit dates popup
const showDocEditDatesPopup = ref(false);
const docEditDatesForm = reactive({
  fieldKey: '',
  fieldLabel: '',
  issueDate: '',
  expiryDate: ''
});
const docEditDatesSaving = ref(false);

// Clear confirm popup
const showClearConfirmPopup = ref(false);

const filteredEmployees = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  let result = employees.value;
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

// Helper functions
function displayName(employee) {
  const parts = [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Без імені";
}

function fileUrl(path) {
  if (!path) return "";
  if (path.startsWith("files/")) return `/${path}`;
  return path;
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

// Data loading
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

async function loadEmployeesIfNeeded() {
  if (employees.value.length === 0) {
    await loadEmployees();
  }
}

async function selectEmployee(id) {
  if (!id) return;
  selectedId.value = id;
  errorMessage.value = "";
  try {
    const data = await api.getEmployee(id);
    Object.assign(form, emptyEmployee(), data.employee || {});
    updateFormSnapshot();
    isFormDirty.value = false;
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function reloadEmployeePreservingDirty(employeeId) {
  await loadEmployees();
  await selectEmployee(employeeId);
}

function openEmployeeCard(employeeId) {
  isCreatingNew.value = false;
  router.push({ name: 'cards', params: { id: employeeId } });
}

function startNew() {
  if (isFormDirty.value) {
    openClearConfirmPopup();
    return;
  }
  selectedId.value = "";
  resetForm();
  isCreatingNew.value = true;
  if (route.name === 'cards' && route.params.id) {
    router.push({ name: 'cards' });
  }
}

async function saveEmployee() {
  saving.value = true;
  errorMessage.value = "";
  try {
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

    if (!isNew.value) {
      delete payload.employment_status;
      delete payload.status_start_date;
      delete payload.status_end_date;
    }

    if (isNew.value && !payload.employment_status && workingStatus.value) {
      payload.employment_status = workingStatus.value;
    }

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

    updateFormSnapshot();
    isFormDirty.value = false;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}

async function deleteEmployee() {
  if (!form.employee_id) return;
  const confirmed = window.confirm("Видалити співробітника та всі пов'язані записи?");
  if (!confirmed) return;
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

// Status change
function openStatusChangePopup() {
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

// Document upload
function openDocUploadPopup(doc) {
  docUploadForm.fieldKey = doc.key;
  docUploadForm.fieldLabel = doc.label;
  docUploadForm.file = null;
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

// Document edit dates
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

// Clear confirm popup
function openClearConfirmPopup() {
  showClearConfirmPopup.value = true;
}

function closeClearConfirmPopup() {
  showClearConfirmPopup.value = false;
}

function confirmClearForm() {
  closeClearConfirmPopup();
  // Force clear: bypass dirty check by resetting dirty state first
  isFormDirty.value = false;
  selectedId.value = "";
  resetForm();
  isCreatingNew.value = true;
  if (route.name === 'cards' && route.params.id) {
    router.push({ name: 'cards' });
  }
}

// Unsaved changes popup handlers
async function saveAndContinue() {
  if (saving.value) return;
  await saveEmployee();
  if (!errorMessage.value && pendingNavigation.value) {
    isFormDirty.value = false;
    const target = pendingNavigation.value;
    closeUnsavedChangesPopup();
    router.push(target);
  }
}

function continueWithoutSaving() {
  if (pendingNavigation.value) {
    isFormDirty.value = false;
    const target = pendingNavigation.value;
    closeUnsavedChangesPopup();
    router.push(target);
  }
}

// Document operations
function openDocument(fieldKey) {
  const filePath = form[fieldKey];
  if (!filePath) return;
  if (!filePath.startsWith('files/')) {
    console.error('Invalid file path (must start with "files/"):', filePath);
    return;
  }
  const url = `${import.meta.env.VITE_API_URL || ""}/${filePath}`;
  window.open(url, "_blank");
}

async function deleteDocument(doc) {
  if (!form.employee_id || !form[doc.key]) return;
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

// Folder operations
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

// Templates management functions
async function loadTemplates() {
  try {
    const data = await api.getTemplates();
    templates.value = data.templates || [];
  } catch (error) {
    errorMessage.value = error.message;
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
  if (!confirmed) return;
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
    const result = await api.generateDocument(template.template_id, employeeId, {});
    const downloadUrl = api.downloadDocument(result.document_id);
    window.open(downloadUrl, '_blank');
    alert(`✓ Документ "${template.template_name}" успішно згенеровано та завантажено`);
  } catch (error) {
    alert('Помилка генерування документа: ' + error.message);
  }
}

// Keyboard handler
function handleKeydown(e) {
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

// Watch route.params.id to handle URL changes within cards view
watch(() => route.params.id, (newId) => {
  if (route.name === 'cards' && newId && newId !== selectedId.value) {
    if (isFormDirty.value) {
      pendingNavigation.value = { name: 'cards', params: { id: newId } };
      showUnsavedChangesPopup.value = true;
    } else {
      selectEmployee(newId);
    }
  }
});

// Navigation guard removal function
let removeBeforeEach = null;

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);

  // Setup navigation guard for unsaved changes
  removeBeforeEach = router.beforeEach((to, from, next) => {
    if (from.name === 'cards' && to.name !== 'cards' && isFormDirty.value) {
      pendingNavigation.value = to;
      showUnsavedChangesPopup.value = true;
      next(false);
    } else {
      next();
    }
  });

  // Setup beforeunload handler for browser refresh/close
  window.addEventListener('beforeunload', handleBeforeUnload);

  await loadFieldsSchema();
  await loadEmployees();
  await loadTemplates();

  // Restore view state from route params
  if (route.params.id) {
    selectEmployee(route.params.id);
  } else if (employees.value.length > 0) {
    openEmployeeCard(employees.value[0].employee_id);
  }
});

function handleBeforeUnload(e) {
  if (isFormDirty.value && route.name === 'cards') {
    e.preventDefault();
    e.returnValue = '';
  }
}

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (removeBeforeEach) {
    removeBeforeEach();
  }
});
</script>

<template>
  <!-- Status change popup -->
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

  <!-- Document upload popup -->
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

  <!-- Document edit dates popup -->
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

  <!-- Clear confirm popup -->
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

  <!-- Main cards layout -->
  <div class="layout">
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
        </div>
      </div>
    </section>
  </div>
</template>
