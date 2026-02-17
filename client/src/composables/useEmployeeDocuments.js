import { ref, reactive } from "vue";
import { api } from "../api";

export function useEmployeeDocuments(form, employees, errorMessage) {
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

  // Opening employee folder
  const openingEmployeeFolder = ref(false);

  // Utility functions
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

  async function submitDocUpload(loadEmployees, selectEmployee) {
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
      await loadEmployees();
      await selectEmployee(form.employee_id);
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

  async function submitDocEditDates(loadEmployees, selectEmployee) {
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
      await loadEmployees();
      await selectEmployee(form.employee_id);
      closeDocEditDatesPopup();
    } catch (error) {
      errorMessage.value = error.message;
    } finally {
      docEditDatesSaving.value = false;
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

  async function deleteDocument(doc, loadEmployees) {
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

  // Clear confirm popup
  function openClearConfirmPopup() {
    showClearConfirmPopup.value = true;
  }

  function closeClearConfirmPopup() {
    showClearConfirmPopup.value = false;
  }

  function confirmClearForm(startNew) {
    closeClearConfirmPopup();
    startNew();
  }

  return {
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
  };
}
