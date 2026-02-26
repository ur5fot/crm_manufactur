import { ref } from "vue";
import { api } from "../api";

export function useDocumentGeneration(form) {
  const templates = ref([]);

  async function loadTemplates() {
    try {
      const data = await api.getTemplates();
      templates.value = (data.templates || []).filter(t => t.is_general !== 'yes');
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

      const result = await api.generateDocument(template.template_id, employeeId, {});

      const downloadUrl = api.downloadDocument(result.document_id);
      window.open(downloadUrl, '_blank');

      alert(`✓ Документ "${template.template_name}" успішно згенеровано та завантажено`);
    } catch (error) {
      alert('Помилка генерування документа: ' + error.message);
    }
  }

  return {
    templates,
    loadTemplates,
    generateDocumentForEmployee,
  };
}
