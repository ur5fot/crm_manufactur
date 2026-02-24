import { ref } from "vue";
import { api } from "../api";

export function useTemplateUpload() {
  const showUploadTemplateModal = ref(false);
  const uploadTemplateId = ref('');
  const uploadTemplateName = ref('');
  const selectedTemplateFile = ref(null);

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

  async function uploadTemplateDocx(loadTemplates) {
    if (!selectedTemplateFile.value) {
      alert('Будь ласка, оберіть файл DOCX');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedTemplateFile.value);

      const result = await api.uploadTemplateFile(uploadTemplateId.value, formData);

      let msg = `✓ Файл завантажено успішно!\n\nВиявлені плейсхолдери:\n${result.placeholders.join(', ') || '(немає)'}`;
      if (result.unknown?.length > 0) {
        msg += `\n\n⚠ Невідомі плейсхолдери (не відповідають жодному полю схеми):\n${result.unknown.join(', ')}`;
      }
      alert(msg);

      closeUploadTemplateModal();
      await loadTemplates();
    } catch (error) {
      alert('Помилка завантаження файлу: ' + error.message);
    }
  }

  return {
    showUploadTemplateModal,
    uploadTemplateId,
    uploadTemplateName,
    selectedTemplateFile,
    uploadTemplateFile,
    closeUploadTemplateModal,
    onTemplateFileSelected,
    uploadTemplateDocx,
  };
}
