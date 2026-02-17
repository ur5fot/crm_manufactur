<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "../api";
import { useFieldsSchema } from "../composables/useFieldsSchema";
import { useEmployeeForm } from "../composables/useEmployeeForm";
import { useEmployeePhoto } from "../composables/useEmployeePhoto";
import { useEmployeeDocuments } from "../composables/useEmployeeDocuments";
import { useStatusManagement } from "../composables/useStatusManagement";
import { useDocumentGeneration } from "../composables/useDocumentGeneration";
import { useReprimands, REPRIMAND_TYPE_OPTIONS } from "../composables/useReprimands";
import { displayName } from "../utils/employee";

const router = useRouter();
const route = useRoute();

// Fallback employee fields
const employeeFields = [
  "photo", "employee_id", "last_name", "first_name", "middle_name", "birth_date",
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
  savedFormSnapshot,
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
const cardFieldSearchTerm = ref("");

// Photo composable
const {
  photoUploading,
  photoError,
  photoInputRef,
  photoVersion,
  photoUrl,
  sidebarPhotoUrl,
  triggerPhotoUpload,
  handlePhotoUpload,
  deletePhoto,
} = useEmployeePhoto(form, savedFormSnapshot, selectedId);

// Documents composable
const {
  showDocUploadPopup,
  docUploadForm,
  docUploadSaving,
  showDocEditDatesPopup,
  docEditDatesForm,
  docEditDatesSaving,
  showClearConfirmPopup,
  openingEmployeeFolder,
  fileUrl,
  formatDocDate,
  isDocExpiringSoon,
  isDocExpired,
  openDocUploadPopup,
  closeDocUploadPopup,
  onDocUploadFileChange,
  submitDocUpload,
  openDocEditDatesPopup,
  closeDocEditDatesPopup,
  submitDocEditDates,
  openDocument,
  deleteDocument,
  openEmployeeFolder,
  openClearConfirmPopup,
  closeClearConfirmPopup,
  confirmClearForm,
} = useEmployeeDocuments(form, employees, errorMessage);

// Status management composable
const {
  employmentOptions,
  workingStatus,
  statusChangeOptions,
  showStatusChangePopup,
  statusChangeForm,
  showStatusHistoryPopup,
  statusHistoryLoading,
  statusHistory,
  openStatusChangePopup,
  closeStatusChangePopup,
  applyStatusChange,
  resetStatus,
  openStatusHistoryPopup,
  closeStatusHistoryPopup,
  formatHistoryTimestamp,
  formatHistoryDate,
} = useStatusManagement(allFieldsSchema, form, employees, saving, errorMessage);

// Document generation composable
const {
  templates,
  loadTemplates,
  generateDocumentForEmployee,
} = useDocumentGeneration(form);

// Reprimands composable
const {
  showReprimandsPopup,
  reprimandsLoading,
  reprimands,
  showReprimandForm,
  editingReprimandId,
  reprimandSaving,
  reprimandError,
  reprimandForm,
  openReprimandsPopup,
  closeReprimandsPopup,
  loadReprimands,
  openAddForm: openReprimandAddForm,
  openEditForm: openReprimandEditForm,
  closeReprimandForm,
  submitReprimand,
  deleteReprimandEntry,
  formatReprimandDate,
} = useReprimands();

// Load reprimands count when selected employee changes
watch(selectedId, async (newId) => {
  if (newId) {
    await loadReprimands(newId);
  } else {
    reprimands.value = [];
  }
}, { immediate: true });

// Filtered employees for cards
const filteredEmployeesForCards = computed(() => {
  const query = cardSearchTerm.value.trim().toLowerCase();
  if (!query) return employees.value;

  return employees.value.filter((employee) => {
    for (const field of allFieldsSchema.value) {
      if (field.type === 'file' || field.type === 'photo') continue;
      const val = employee[field.key];
      if (val && String(val).toLowerCase().includes(query)) return true;
    }
    const name = displayName(employee);
    if (name.toLowerCase().includes(query)) return true;
    if (employee.employee_id && String(employee.employee_id).toLowerCase().includes(query)) return true;
    return false;
  });
});

// Filtered field groups for current employee card
const filteredFieldGroups = computed(() => {
  const query = cardFieldSearchTerm.value.trim().toLowerCase();
  if (!query) return fieldGroups.value;

  // Filter groups and fields based on label and value match
  return fieldGroups.value.map(group => {
    const filteredFields = group.fields.filter(field => {
      // Match against field label
      if (field.label.toLowerCase().includes(query)) return true;

      // Match against field value (form is reactive, not a ref)
      const val = form[field.key];
      if (val && String(val).toLowerCase().includes(query)) return true;

      return false;
    });

    return {
      ...group,
      fields: filteredFields
    };
  }).filter(group => group.fields.length > 0); // Only include groups with matching fields
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
    } else if (showStatusHistoryPopup.value) {
      closeStatusHistoryPopup();
    } else if (showStatusChangePopup.value) {
      closeStatusChangePopup();
    } else if (showReprimandsPopup.value) {
      closeReprimandsPopup();
    }
  }
}

// Confirm and delete reprimand
function confirmDeleteReprimand(employeeId, recordId) {
  if (window.confirm('Видалити запис?')) {
    deleteReprimandEntry(employeeId, recordId);
  }
}

// Setup navigation guard
let removeNavigationGuard;
function setupNavigationGuard() {
  removeNavigationGuard = router.beforeEach((to, from, next) => {
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
let beforeUnloadHandler;

function setupBeforeUnload() {
  beforeUnloadHandler = (e) => {
    if (isFormDirty.value && route.name === 'cards') {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);
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
    await selectEmployee(route.params.id);
  } else if (employees.value.length > 0 && !form.employee_id) {
    openEmployeeCard(employees.value[0].employee_id);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  if (removeNavigationGuard) {
    removeNavigationGuard();
  }
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }
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
          <div class="employee-card-photo">
            <img
              v-if="employee.photo"
              :src="sidebarPhotoUrl(employee.photo)"
              alt=""
              class="employee-card-photo-img"
              loading="lazy"
            />
            <div v-else class="employee-card-photo-placeholder">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
          <div class="employee-card-info">
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
      </div>
    </aside>

    <section class="panel">
      <div class="panel-header">
        <div class="panel-header-left">
          <div v-if="!isNew" class="employee-photo-area" @click="triggerPhotoUpload">
            <img
              v-if="form.photo"
              :src="photoUrl"
              alt="Фото"
              class="employee-photo-img"
            />
            <div v-else class="employee-photo-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div class="employee-photo-overlay">
              <span v-if="photoUploading" class="photo-overlay-text">...</span>
              <template v-else>
                <span v-if="form.photo" class="photo-overlay-text">Змінити</span>
                <span v-else class="photo-overlay-text">Додати</span>
              </template>
            </div>
            <button
              v-if="form.photo && !photoUploading"
              class="photo-delete-btn"
              type="button"
              title="Видалити фото"
              @click.stop="deletePhoto(loadEmployees)"
            >&times;</button>
            <input
              ref="photoInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style="display: none;"
              @change="handlePhotoUpload($event, loadEmployees)"
            />
          </div>
          <div class="panel-title">
            {{ isNew ? "Новий співробітник" : "Картка співробітника" }}
          </div>
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

      <div v-if="photoError" class="alert">{{ photoError }}</div>
      <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>

      <!-- Field search within current card -->
      <div class="card-field-search-wrapper">
        <input
          v-model="cardFieldSearchTerm"
          class="search-input"
          type="search"
          placeholder="Пошук по полях картки..."
        />
        <button
          v-if="cardFieldSearchTerm"
          class="card-search-clear"
          @click="cardFieldSearchTerm = ''"
          title="Очистити пошук"
        >
          ✕
        </button>
      </div>

      <div class="detail-grid">
        <div v-for="group in filteredFieldGroups" :key="group.title" class="section">
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
                    @click="resetStatus(loadEmployees, selectEmployee)"
                  >
                    Скинути статус
                  </button>
                  <button
                    v-if="!isNew"
                    class="status-history-btn"
                    type="button"
                    title="Історія змін статусу"
                    @click="openStatusHistoryPopup"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </button>
                  <button
                    v-if="!isNew"
                    class="secondary small"
                    type="button"
                    title="Догани та відзнаки"
                    @click="openReprimandsPopup(selectedId)"
                  >
                    📋 Догани та відзнаки{{ reprimands.length > 0 ? ` (${reprimands.length})` : '' }}
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
                        @click="deleteDocument(doc, loadEmployees)"
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
        <div class="vacation-notification-header">
          <h3>⚠️ Незбережені зміни</h3>
          <button class="close-btn" @click="cancelNavigation">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <p>У вас є незбережені зміни у формі. Що бажаєте зробити?</p>
          <div v-if="changedFields.length > 0" class="changed-fields-list">
            <div class="changed-fields-label">Змінені поля:</div>
            <ul>
              <li v-for="(field, idx) in changedFields" :key="idx">{{ field }}</li>
            </ul>
          </div>
        </div>
        <div class="vacation-notification-footer">
          <button class="primary" @click="saveAndContinue">Зберегти та продовжити</button>
          <button class="secondary" @click="continueWithoutSaving">Продовжити без збереження</button>
          <button class="secondary" @click="cancelNavigation">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Status Change Popup -->
    <div v-if="showStatusChangePopup" class="vacation-notification-overlay" @click="closeStatusChangePopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>Зміна статусу працевлаштування</h3>
          <button class="close-btn" @click="closeStatusChangePopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
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
        <div class="vacation-notification-footer">
          <button class="primary" @click="applyStatusChange(loadEmployees, selectEmployee)">Застосувати</button>
          <button class="secondary" @click="closeStatusChangePopup">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Doc Upload Popup -->
    <div v-if="showDocUploadPopup" class="vacation-notification-overlay" @click="closeDocUploadPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>Завантаження документа: {{ docUploadForm.fieldLabel }}</h3>
          <button class="close-btn" @click="closeDocUploadPopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
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
        <div class="vacation-notification-footer">
          <button class="primary" @click="submitDocUpload(loadEmployees, selectEmployee)" :disabled="docUploadSaving">
            {{ docUploadSaving ? 'Завантаження...' : 'Завантажити' }}
          </button>
          <button class="secondary" @click="closeDocUploadPopup">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Doc Edit Dates Popup -->
    <div v-if="showDocEditDatesPopup" class="vacation-notification-overlay" @click="closeDocEditDatesPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>Редагування дат: {{ docEditDatesForm.fieldLabel }}</h3>
          <button class="close-btn" @click="closeDocEditDatesPopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div class="form-group">
            <label>Дата видачі:</label>
            <input type="date" v-model="docEditDatesForm.issueDate" />
          </div>
          <div class="form-group">
            <label>Дата закінчення:</label>
            <input type="date" v-model="docEditDatesForm.expiryDate" />
          </div>
        </div>
        <div class="vacation-notification-footer">
          <button class="primary" @click="submitDocEditDates(loadEmployees, selectEmployee)" :disabled="docEditDatesSaving">
            {{ docEditDatesSaving ? 'Збереження...' : 'Зберегти' }}
          </button>
          <button class="secondary" @click="closeDocEditDatesPopup">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Clear Confirm Popup -->
    <div v-if="showClearConfirmPopup" class="vacation-notification-overlay" @click="closeClearConfirmPopup">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>⚠️ Підтвердження</h3>
          <button class="close-btn" @click="closeClearConfirmPopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <p>Ви впевнені, що хочете очистити форму? Всі незбережені зміни будуть втрачені.</p>
        </div>
        <div class="vacation-notification-footer">
          <button class="danger" @click="confirmClearForm(startNew)">Так, очистити</button>
          <button class="secondary" @click="closeClearConfirmPopup">Скасувати</button>
        </div>
      </div>
    </div>

    <!-- Status History Popup -->
    <div v-if="showStatusHistoryPopup" class="vacation-notification-overlay" @click="closeStatusHistoryPopup">
      <div class="vacation-notification-modal status-history-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>Історія змін статусу</h3>
          <button class="close-btn" @click="closeStatusHistoryPopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div v-if="statusHistoryLoading" class="status-history-loading">Завантаження...</div>
          <div v-else-if="statusHistory.length === 0" class="status-history-empty">
            Історія змін статусу відсутня.
          </div>
          <div v-else class="status-history-list">
            <table class="status-history-table">
              <thead>
                <tr>
                  <th>Дата/час</th>
                  <th>Попередній статус</th>
                  <th>Новий статус</th>
                  <th>Період</th>
                  <th>Змінено</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in statusHistory" :key="entry.history_id">
                  <td>{{ formatHistoryTimestamp(entry.changed_at) }}</td>
                  <td>{{ entry.old_status || '—' }}</td>
                  <td>{{ entry.new_status || '—' }}</td>
                  <td>
                    <template v-if="entry.new_start_date || entry.new_end_date">
                      {{ formatHistoryDate(entry.new_start_date) }}
                      <template v-if="entry.new_end_date"> — {{ formatHistoryDate(entry.new_end_date) }}</template>
                    </template>
                    <template v-else>—</template>
                  </td>
                  <td>{{ entry.changed_by || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="vacation-notification-footer">
          <button class="secondary" @click="closeStatusHistoryPopup">Закрити</button>
        </div>
      </div>
    </div>

    <!-- Reprimands Popup -->
    <div v-if="showReprimandsPopup" class="vacation-notification-overlay" @click="closeReprimandsPopup">
      <div class="vacation-notification-modal status-history-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>📋 Догани та відзнаки</h3>
          <button class="close-btn" @click="closeReprimandsPopup">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div v-if="reprimandsLoading" class="status-history-loading">Завантаження...</div>
          <template v-else>
            <div v-if="reprimandError && !showReprimandForm" class="alert">{{ reprimandError }}</div>
            <div v-if="reprimands.length === 0 && !showReprimandForm" class="status-history-empty">
              Записи відсутні.
            </div>
            <div v-else-if="reprimands.length > 0 && !showReprimandForm" class="status-history-list">
              <table class="status-history-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Тип</th>
                    <th>№ наказу</th>
                    <th>Примітка</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in reprimands" :key="record.record_id">
                    <td>{{ formatReprimandDate(record.record_date) }}</td>
                    <td>{{ record.record_type || '—' }}</td>
                    <td>{{ record.order_number || '—' }}</td>
                    <td>{{ record.note || '—' }}</td>
                    <td>
                      <div class="document-actions">
                        <button class="secondary small" type="button" @click="openReprimandEditForm(record)">Редагувати</button>
                        <button
                          class="danger small"
                          type="button"
                          @click="confirmDeleteReprimand(selectedId, record.record_id)"
                        >Видалити</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Add/Edit Form -->
            <div v-if="showReprimandForm" class="reprimand-form">
              <h4>{{ editingReprimandId ? 'Редагування запису' : 'Новий запис' }}</h4>
              <div v-if="reprimandError" class="alert">{{ reprimandError }}</div>
              <div class="form-group">
                <label>Дата *</label>
                <input type="date" v-model="reprimandForm.record_date" required />
              </div>
              <div class="form-group">
                <label>Тип *</label>
                <select v-model="reprimandForm.record_type" required>
                  <option value="">— Виберіть тип —</option>
                  <option v-for="opt in REPRIMAND_TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>№ наказу</label>
                <input type="text" v-model="reprimandForm.order_number" placeholder="Наприклад: №123" />
              </div>
              <div class="form-group">
                <label>Примітка</label>
                <textarea v-model="reprimandForm.note" rows="3" placeholder="За що / підстава"></textarea>
              </div>
            </div>
          </template>
        </div>
        <div class="vacation-notification-footer">
          <template v-if="showReprimandForm">
            <button class="primary" @click="submitReprimand(selectedId)" :disabled="reprimandSaving">
              {{ reprimandSaving ? 'Збереження...' : (editingReprimandId ? 'Зберегти зміни' : 'Додати запис') }}
            </button>
            <button class="secondary" @click="closeReprimandForm">Скасувати</button>
          </template>
          <template v-else>
            <button class="primary" @click="openReprimandAddForm">Додати запис</button>
            <button class="secondary" @click="closeReprimandsPopup">Закрити</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
