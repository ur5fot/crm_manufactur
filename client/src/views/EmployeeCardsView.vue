<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "../api";
import { useFieldsSchema } from "../composables/useFieldsSchema";
import { useEmployeeForm } from "../composables/useEmployeeForm";

const router = useRouter();
const route = useRoute();

// Fallback employee fields
const employeeFields = [
  "employee_id", "last_name", "first_name", "middle_name", "birth_date",
  "employment_status", "additional_status", "gender", "blood_group", "department",
  "grade", "position", "specialty", "work_state", "work_type", "fit_status",
  "order_ref", "location", "residence_place", "registration_place", "email",
  "phone", "phone_note", "education", "salary_grid", "salary_amount",
  "bank_name", "bank_card_number", "bank_iban", "tax_id",
  "personal_matter_file", "personal_matter_file_issue_date", "personal_matter_file_expiry_date",
  "medical_commission_file", "medical_commission_file_issue_date", "medical_commission_file_expiry_date",
  "veterans_certificate_file", "veterans_certificate_file_issue_date", "veterans_certificate_file_expiry_date",
  "driver_license_file", "driver_license_file_issue_date", "driver_license_file_expiry_date",
  "id_certificate_file", "id_certificate_file_issue_date", "id_certificate_file_expiry_date",
  "foreign_passport_number", "foreign_passport_file", "foreign_passport_file_issue_date", "foreign_passport_file_expiry_date",
  "criminal_record_file", "criminal_record_file_issue_date", "criminal_record_file_expiry_date",
  "military_id_file", "military_id_file_issue_date", "military_id_file_expiry_date",
  "medical_certificate_file", "medical_certificate_file_issue_date", "medical_certificate_file_expiry_date",
  "insurance_file", "insurance_file_issue_date", "insurance_file_expiry_date",
  "education_diploma_file", "education_diploma_file_issue_date", "education_diploma_file_expiry_date",
  "status_start_date", "status_end_date", "notes"
];

// Load fields schema
const { allFieldsSchema, fieldGroups, loadFieldsSchema } = useFieldsSchema();

// Field labels computed from schema
const fieldLabels = computed(() => {
  const map = {};
  allFieldsSchema.value.forEach(f => {
    map[f.key] = f.label;
  });
  return map;
});

// Document fields from schema
const documentFields = computed(() => {
  return allFieldsSchema.value
    .filter(field => field.type === 'file')
    .map(field => ({
      key: field.key,
      label: field.label
    }));
});

// Dictionaries for select fields
const dictionaries = ref({});

// Use employee form composable
const {
  form,
  selectedId,
  saving,
  errorMessage,
  isCreatingNew,
  isFormDirty,
  showUnsavedChangesPopup,
  pendingNavigation,
  changedFields,
  isNew,
  resetForm,
  updateFormSnapshot,
  selectEmployee,
  startNew,
  closeUnsavedChangesPopup,
  saveAndContinue: saveAndContinueBase,
  continueWithoutSaving: continueWithoutSavingBase,
  cancelNavigation
} = useEmployeeForm(allFieldsSchema, employeeFields, fieldLabels);

// Employee list
const employees = ref([]);
const loading = ref(false);
const cardSearchTerm = ref("");
const openingEmployeeFolder = ref(false);

// Templates for document generation
const templates = ref([]);

// Employment status options
const employmentOptions = computed(() => {
  const field = allFieldsSchema.value.find(f => f.key === 'employment_status');
  return field?.options || [];
});

const workingStatus = computed(() => employmentOptions.value[0] || '');
const statusChangeOptions = computed(() => employmentOptions.value.slice(1));

// Status change popup
const showStatusChangePopup = ref(false);
const statusChangeForm = reactive({
  status: '',
  startDate: '',
  endDate: ''
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

// Filtered employees for cards
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

// Watch route params to handle employee selection
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

// Load employees
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

// Load templates
async function loadTemplates() {
  try {
    const data = await api.getTemplates();
    templates.value = data.templates || [];
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

// Save employee
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

    // Remove status fields for existing employees
    if (!isNew.value) {
      delete payload.employment_status;
      delete payload.status_start_date;
      delete payload.status_end_date;
    }

    // Set default status for new employees
    if (isNew.value && !payload.employment_status && workingStatus.value) {
      payload.employment_status = workingStatus.value;
    }

    // Clean empty document fields for new employees
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

// Delete employee
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

// Status change functions
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

// Document upload functions
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

// Document edit dates functions
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

// Helper to reload employee preserving dirty state
async function reloadEmployeePreservingDirty(employeeId) {
  await loadEmployees();
  await selectEmployee(employeeId);
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

// Template generation
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

// Clear confirm popup
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

// Open employee card
function openEmployeeCard(employeeId) {
  isCreatingNew.value = false;
  router.push({ name: 'cards', params: { id: employeeId } });
}

// Unsaved changes handlers
function saveAndContinue() {
  saveAndContinueBase(saveEmployee, router);
}

function continueWithoutSaving() {
  continueWithoutSavingBase(router);
}

// Global keydown handler
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

// Setup navigation guard
function setupNavigationGuard() {
  router.beforeEach((to, from, next) => {
    if (from.name === 'cards' && to.name !== 'cards' && isFormDirty.value) {
      pendingNavigation.value = to;
      showUnsavedChangesPopup.value = true;
      next(false);
    } else {
      next();
    }
  });
}

// Setup beforeunload handler
function setupBeforeUnload() {
  window.addEventListener('beforeunload', (e) => {
    if (isFormDirty.value && route.name === 'cards') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

onMounted(async () => {
  document.addEventListener('keydown', handleGlobalKeydown);
  setupNavigationGuard();
  setupBeforeUnload();

  // Load schema first
  await loadFieldsSchema();

  // Load data
  await loadEmployees();
  await loadTemplates();

  // Form dictionaries from schema
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

  // Load employee if ID in route
  if (route.params.id) {
    selectEmployee(route.params.id);
  } else if (employees.value.length > 0 && !form.employee_id) {
    openEmployeeCard(employees.value[0].employee_id);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
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
      </div>
    </section>

    <!-- Unsaved Changes Popup -->
    <div v-if="showUnsavedChangesPopup" class="vacation-notification-overlay" @click="cancelNavigation">
      <div class="vacation-notification-modal" @click.stop>
        <div class="card-header">
          <h3>⚠️ Незбережені зміни</h3>
          <button class="close-btn" @click="cancelNavigation">&times;</button>
        </div>
        <div class="card-content">
          <p>У вас є незбережені зміни у формі. Що бажаєте зробити?</p>
          <div v-if="changedFields.length > 0" class="changed-fields-list">
            <div class="changed-fields-label">Змінені поля:</div>
            <ul>
              <li v-for="(field, idx) in changedFields" :key="idx">{{ field }}</li>
            </ul>
          </div>
        </div>
        <div class="button-group">
          <button class="primary" @click="saveAndContinue">Зберегти та продовжити</button>
          <button class="secondary" @click="continueWithoutSaving">Продовжити без збереження</button>
          <button class="secondary" @click="cancelNavigation">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Status Change Popup -->
    <div v-if="showStatusChangePopup" class="vacation-notification-overlay" @click="closeStatusChangePopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="card-header">
          <h3>Зміна статусу працевлаштування</h3>
          <button class="close-btn" @click="closeStatusChangePopup">&times;</button>
        </div>
        <div class="card-content">
          <div class="form-group">
            <label>Новий статус:</label>
            <select v-model="statusChangeForm.status" required>
              <option value="">— Виберіть статус —</option>
              <option v-for="opt in statusChangeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Дата початку:</label>
            <input type="date" v-model="statusChangeForm.startDate" required />
          </div>
          <div class="form-group">
            <label>Дата закінчення (опціонально):</label>
            <input type="date" v-model="statusChangeForm.endDate" />
          </div>
        </div>
        <div class="button-group">
          <button class="primary" @click="applyStatusChange">Застосувати</button>
          <button class="secondary" @click="closeStatusChangePopup">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Doc Upload Popup -->
    <div v-if="showDocUploadPopup" class="vacation-notification-overlay" @click="closeDocUploadPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="card-header">
          <h3>Завантаження документа: {{ docUploadForm.fieldLabel }}</h3>
          <button class="close-btn" @click="closeDocUploadPopup">&times;</button>
        </div>
        <div class="card-content">
          <div class="form-group">
            <label>Файл:</label>
            <input type="file" @change="onDocUploadFileChange" required />
          </div>
          <div class="form-group">
            <label>Дата видачі:</label>
            <input type="date" v-model="docUploadForm.issueDate" />
          </div>
          <div class="form-group">
            <label>Дата закінчення:</label>
            <input type="date" v-model="docUploadForm.expiryDate" />
          </div>
        </div>
        <div class="button-group">
          <button class="primary" @click="submitDocUpload" :disabled="docUploadSaving">
            {{ docUploadSaving ? 'Завантаження...' : 'Завантажити' }}
          </button>
          <button class="secondary" @click="closeDocUploadPopup">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Doc Edit Dates Popup -->
    <div v-if="showDocEditDatesPopup" class="vacation-notification-overlay" @click="closeDocEditDatesPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="card-header">
          <h3>Редагування дат: {{ docEditDatesForm.fieldLabel }}</h3>
          <button class="close-btn" @click="closeDocEditDatesPopup">&times;</button>
        </div>
        <div class="card-content">
          <div class="form-group">
            <label>Дата видачі:</label>
            <input type="date" v-model="docEditDatesForm.issueDate" />
          </div>
          <div class="form-group">
            <label>Дата закінчення:</label>
            <input type="date" v-model="docEditDatesForm.expiryDate" />
          </div>
        </div>
        <div class="button-group">
          <button class="primary" @click="submitDocEditDates" :disabled="docEditDatesSaving">
            {{ docEditDatesSaving ? 'Збереження...' : 'Зберегти' }}
          </button>
          <button class="secondary" @click="closeDocEditDatesPopup">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Clear Confirm Popup -->
    <div v-if="showClearConfirmPopup" class="vacation-notification-overlay" @click="closeClearConfirmPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="card-header">
          <h3>⚠️ Підтвердження</h3>
          <button class="close-btn" @click="closeClearConfirmPopup">&times;</button>
        </div>
        <div class="card-content">
          <p>Ви впевнені, що хочете очистити форму? Всі незбережені зміни будуть втрачені.</p>
        </div>
        <div class="button-group">
          <button class="danger" @click="confirmClearForm">Так, очистити</button>
          <button class="secondary" @click="closeClearConfirmPopup">Скасувати</button>
        </div>
      </div>
    </div>
  </div>
</template>
