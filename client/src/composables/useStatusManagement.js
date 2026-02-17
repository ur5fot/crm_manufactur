import { ref, computed, reactive } from "vue";
import { api } from "../api";

export function useStatusManagement(allFieldsSchema, form, employees, saving, errorMessage) {
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

  // Status history popup
  const showStatusHistoryPopup = ref(false);
  const statusHistoryLoading = ref(false);
  const statusHistory = ref([]);

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

  async function applyStatusChange(loadEmployees, selectEmployee) {
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
      await loadEmployees();
      await selectEmployee(form.employee_id);
      closeStatusChangePopup();
    } catch (error) {
      errorMessage.value = error.message;
    } finally {
      saving.value = false;
    }
  }

  async function resetStatus(loadEmployees, selectEmployee) {
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
      await loadEmployees();
      await selectEmployee(form.employee_id);
      closeStatusChangePopup();
    } catch (error) {
      errorMessage.value = error.message;
    } finally {
      saving.value = false;
    }
  }

  // Status history functions
  async function openStatusHistoryPopup() {
    if (!form.employee_id) return;
    showStatusHistoryPopup.value = true;
    statusHistoryLoading.value = true;
    try {
      const data = await api.getEmployeeStatusHistory(form.employee_id);
      statusHistory.value = data.history || [];
    } catch (error) {
      statusHistory.value = [];
      console.error('Failed to load status history:', error);
    } finally {
      statusHistoryLoading.value = false;
    }
  }

  function closeStatusHistoryPopup() {
    showStatusHistoryPopup.value = false;
  }

  function formatHistoryTimestamp(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()} ${hh}:${min}`;
  }

  function formatHistoryDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }

  return {
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
  };
}
