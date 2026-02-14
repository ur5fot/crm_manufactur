import { computed, reactive, ref, watch } from "vue";
import { useFieldsSchema } from "./useFieldsSchema";

// Fallback field list matching DEFAULT_EMPLOYEE_COLUMNS in schema.js
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

export function useEmployeeForm() {
  const { allFieldsSchema } = useFieldsSchema();

  function emptyEmployee() {
    const base = {};
    if (allFieldsSchema.value.length > 0) {
      for (const field of allFieldsSchema.value) {
        base[field.key] = "";
        if (field.type === 'file') {
          base[`${field.key}_issue_date`] = "";
          base[`${field.key}_expiry_date`] = "";
        }
      }
    } else {
      for (const field of employeeFields) {
        base[field] = "";
      }
    }
    return base;
  }

  const form = reactive(emptyEmployee());

  // Unsaved changes tracking
  const isFormDirty = ref(false);
  const savedFormSnapshot = ref(null);
  const showUnsavedChangesPopup = ref(false);
  const pendingNavigation = ref(null);

  // Watch form changes to track unsaved changes
  watch(form, () => {
    if (!savedFormSnapshot.value) return;
    const hasChanges = Object.keys(form).some(key => {
      return form[key] !== savedFormSnapshot.value[key];
    });
    isFormDirty.value = hasChanges;
  }, { deep: true });

  function updateFormSnapshot() {
    savedFormSnapshot.value = { ...form };
  }

  function resetForm() {
    for (const key of Object.keys(form)) {
      delete form[key];
    }
    Object.assign(form, emptyEmployee());
    updateFormSnapshot();
    isFormDirty.value = false;
  }

  // Field labels mapping
  const fieldLabels = computed(() => {
    const map = {};
    allFieldsSchema.value.forEach(f => {
      map[f.key] = f.label;
    });
    return map;
  });

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

  const isNew = computed(() => !form.employee_id);

  // Unsaved changes popup handlers
  function closeUnsavedChangesPopup() {
    showUnsavedChangesPopup.value = false;
    pendingNavigation.value = null;
  }

  function cancelNavigation() {
    closeUnsavedChangesPopup();
  }

  return {
    form,
    isFormDirty,
    savedFormSnapshot,
    showUnsavedChangesPopup,
    pendingNavigation,
    isNew,
    changedFields,
    fieldLabels,
    emptyEmployee,
    resetForm,
    updateFormSnapshot,
    closeUnsavedChangesPopup,
    cancelNavigation,
    employeeFields
  };
}
