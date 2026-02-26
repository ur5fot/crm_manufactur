import { ref, reactive } from "vue";
import { api } from "../api";

export function useTemplatesManagement() {
  const templates = ref([]);
  const loading = ref(false);
  const showTemplateDialog = ref(false);
  const templateDialogMode = ref('create'); // 'create' or 'edit'
  const templateForm = reactive({
    template_id: '',
    template_name: '',
    template_type: '',
    description: '',
    placeholder_fields: '',
    docx_filename: '',
    is_general: 'no'
  });

  async function loadTemplates() {
    loading.value = true;
    try {
      const data = await api.getTemplates();
      templates.value = data.templates || [];
    } catch (error) {
      console.error('Failed to load templates:', error);
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
      docx_filename: '',
      is_general: 'no'
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
      docx_filename: template.docx_filename || '',
      is_general: template.is_general || 'no'
    });
    showTemplateDialog.value = true;
  }

  async function saveTemplate() {
    try {
      const payload = {
        template_name: templateForm.template_name,
        template_type: templateForm.template_type,
        description: templateForm.description || '',
        is_general: templateForm.is_general
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
      docx_filename: '',
      is_general: 'no'
    });
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
      alert('Помилка відкриття файлу: ' + error.message);
    }
  }

  async function reextractTemplatePlaceholders() {
    try {
      const result = await api.reextractPlaceholders(templateForm.template_id);
      templateForm.placeholder_fields = result.placeholders.join(', ');
      alert(`Плейсхолдери оновлено: ${result.placeholders.join(', ') || '(немає)'}`);
      await loadTemplates();
    } catch (error) {
      alert('Помилка оновлення плейсхолдерів: ' + error.message);
    }
  }

  return {
    templates,
    loading,
    showTemplateDialog,
    templateDialogMode,
    templateForm,
    loadTemplates,
    openCreateTemplateDialog,
    editTemplate,
    saveTemplate,
    closeTemplateDialog,
    deleteTemplate,
    openTemplateDocx,
    reextractTemplatePlaceholders,
  };
}
