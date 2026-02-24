import { ref, computed } from "vue";
import { api } from "../api";
import { useFieldsSchema } from "./useFieldsSchema";

export function useFieldSchemaEditor() {
  const { resetSchema } = useFieldsSchema();
  const fields = ref([]);
  const originalFields = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref("");
  const successMessage = ref("");
  const migrationResult = ref(null);

  // Preview state
  const showPreviewModal = ref(false);
  const previewLoading = ref(false);
  const previewData = ref(null);

  async function loadSchema() {
    loading.value = true;
    errorMessage.value = "";
    try {
      const data = await api.getFieldsSchemaDetails();
      fields.value = data.fields.map(f => ({ ...f }));
      originalFields.value = data.fields.map(f => ({ ...f }));
    } catch (err) {
      errorMessage.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  const isDirty = computed(() => {
    if (fields.value.length !== originalFields.value.length) return true;
    for (let i = 0; i < fields.value.length; i++) {
      const f = fields.value[i];
      const o = originalFields.value[i];
      if (
        f.field_name !== o.field_name ||
        f.field_label !== o.field_label ||
        f.field_order !== o.field_order ||
        f.field_options !== o.field_options ||
        f.field_group !== o.field_group ||
        f.show_in_table !== o.show_in_table ||
        f.editable_in_table !== o.editable_in_table
      ) {
        return true;
      }
    }
    return false;
  });

  const renamedFields = computed(() => {
    const renames = [];
    for (let i = 0; i < fields.value.length; i++) {
      const f = fields.value[i];
      const o = originalFields.value.find(orig => orig.field_id === f.field_id);
      if (o && f.field_name !== o.field_name) {
        renames.push({
          field_id: f.field_id,
          old_name: o.field_name,
          new_name: f.field_name,
          impact: f.impact
        });
      }
    }
    return renames;
  });

  function cancelEdits() {
    fields.value = originalFields.value.map(f => ({ ...f }));
    errorMessage.value = "";
    successMessage.value = "";
    migrationResult.value = null;
  }

  async function previewChanges() {
    previewLoading.value = true;
    previewData.value = null;
    errorMessage.value = "";

    try {
      // Collect previews for all renames
      const previews = [];
      for (const rename of renamedFields.value) {
        const data = await api.getFieldsSchemaRenamePreview(rename.field_id, rename.new_name);
        previews.push({
          ...rename,
          renames: data.renames,
          previewImpact: data.impact
        });
      }
      previewData.value = previews;
      showPreviewModal.value = true;
    } catch (err) {
      errorMessage.value = err.message;
    } finally {
      previewLoading.value = false;
    }
  }

  async function applyChanges() {
    saving.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    migrationResult.value = null;

    try {
      const result = await api.updateFieldsSchema(fields.value);
      migrationResult.value = result.migration;
      originalFields.value = result.fields.map(f => ({
        ...f,
        impact: fields.value.find(ff => ff.field_id === f.field_id)?.impact || { employees: 0, templates: 0, logs: 0 }
      }));
      fields.value = originalFields.value.map(f => ({ ...f }));
      showPreviewModal.value = false;

      const renameCount = result.migration?.renameCount || 0;
      successMessage.value = renameCount > 0
        ? `Схему оновлено. Перейменувань: ${renameCount}`
        : "Схему оновлено.";

      // Invalidate the shared fields schema cache so other views reload fresh data
      resetSchema();

      // Reload to get fresh impact stats
      await loadSchema();
    } catch (err) {
      errorMessage.value = err.message;
    } finally {
      saving.value = false;
    }
  }

  function addField() {
    const timestamp = Date.now();
    const newFieldName = `new_field_${timestamp}`;
    fields.value.push({
      field_id: `f_${newFieldName}`,
      field_order: String(fields.value.length),
      field_name: newFieldName,
      field_label: "Нове поле",
      field_type: "text",
      field_options: "",
      field_group: "",
      show_in_table: "no",
      editable_in_table: "no",
      role: "",
      impact: { employees: 0, templates: 0, logs: 0 }
    });
  }

  function removeField(index) {
    const field = fields.value[index];
    if (field.role) {
      errorMessage.value = `Не можна видалити поле з роллю: ${field.role}`;
      return;
    }
    fields.value.splice(index, 1);
  }

  return {
    fields,
    originalFields,
    loading,
    saving,
    errorMessage,
    successMessage,
    migrationResult,
    isDirty,
    renamedFields,
    showPreviewModal,
    previewLoading,
    previewData,
    loadSchema,
    cancelEdits,
    previewChanges,
    applyChanges,
    addField,
    removeField
  };
}
