import { reactive, ref, computed, watch } from "vue";
import { api } from "../api";

export function useEmployeeForm(allFieldsSchema, employeeFields, fieldLabels) {
  // Form state
  const form = reactive(emptyEmployee(allFieldsSchema, employeeFields));
  const selectedId = ref("");
  const saving = ref(false);
  const errorMessage = ref("");
  const isCreatingNew = ref(false);

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

  // Compute changed fields for display
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

  function emptyEmployee(schema, fallbackFields) {
    const base = {};
    if (schema.value && schema.value.length > 0) {
      for (const field of schema.value) {
        base[field.key] = "";
        if (field.type === 'file') {
          base[`${field.key}_issue_date`] = "";
          base[`${field.key}_expiry_date`] = "";
        }
      }
    } else {
      for (const field of fallbackFields) {
        base[field] = "";
      }
    }
    return base;
  }

  function resetForm() {
    for (const key of Object.keys(form)) {
      delete form[key];
    }
    Object.assign(form, emptyEmployee(allFieldsSchema, employeeFields));
    updateFormSnapshot();
    isFormDirty.value = false;
  }

  function updateFormSnapshot() {
    savedFormSnapshot.value = { ...form };
  }

  async function selectEmployee(id) {
    if (!id) return;
    selectedId.value = id;
    errorMessage.value = "";
    try {
      const data = await api.getEmployee(id);
      Object.assign(form, emptyEmployee(allFieldsSchema, employeeFields), data.employee || {});
      updateFormSnapshot();
      isFormDirty.value = false;
    } catch (error) {
      errorMessage.value = error.message;
    }
  }

  function startNew() {
    selectedId.value = "";
    resetForm();
    isCreatingNew.value = true;
  }

  // Unsaved changes popup handlers
  function closeUnsavedChangesPopup() {
    showUnsavedChangesPopup.value = false;
    pendingNavigation.value = null;
  }

  async function saveAndContinue(saveEmployeeFn, router) {
    if (saving.value) return;

    await saveEmployeeFn();

    if (!errorMessage.value && pendingNavigation.value) {
      isFormDirty.value = false;
      const target = pendingNavigation.value;
      closeUnsavedChangesPopup();
      router.push(target);
    }
  }

  function continueWithoutSaving(router) {
    if (pendingNavigation.value) {
      isFormDirty.value = false;
      const target = pendingNavigation.value;
      closeUnsavedChangesPopup();
      router.push(target);
    }
  }

  function cancelNavigation() {
    closeUnsavedChangesPopup();
  }

  return {
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
    saveAndContinue,
    continueWithoutSaving,
    cancelNavigation
  };
}
