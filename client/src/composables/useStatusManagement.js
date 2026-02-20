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

  // Status events list
  const statusEvents = ref([]);
  const statusEventsLoading = ref(false);
  const statusEventError = ref('');

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

  function getTodayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseEventError(error) {
    let errMsg = error.message;
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed.error) errMsg = parsed.error;
    } catch {
      // not JSON, use as-is
    }
    return errMsg;
  }

  async function loadStatusEventsList() {
    if (!form.employee_id) return;
    statusEventsLoading.value = true;
    try {
      const data = await api.getStatusEvents(form.employee_id);
      statusEvents.value = data.events || [];
    } catch (err) {
      console.error('Failed to load status events:', err);
      statusEvents.value = [];
    } finally {
      statusEventsLoading.value = false;
    }
  }

  async function openStatusChangePopup() {
    statusChangeForm.status = '';
    statusChangeForm.startDate = getTodayString();
    statusChangeForm.endDate = '';
    statusEventError.value = '';
    showStatusChangePopup.value = true;
    await loadStatusEventsList();
  }

  function closeStatusChangePopup() {
    showStatusChangePopup.value = false;
  }

  async function applyStatusChange(loadEmployees, selectEmployee) {
    if (!statusChangeForm.status || !statusChangeForm.startDate) return;
    if (!form.employee_id) return;
    if (saving.value) return;
    if (statusChangeForm.endDate && statusChangeForm.endDate < statusChangeForm.startDate) {
      statusEventError.value = 'Дата завершення не може бути раніше дати початку';
      return;
    }

    statusEventError.value = '';
    saving.value = true;
    try {
      await api.addStatusEvent(form.employee_id, {
        status: statusChangeForm.status,
        start_date: statusChangeForm.startDate,
        end_date: statusChangeForm.endDate || ''
      });
      // Reload events list
      await loadStatusEventsList();
      // Reload employee
      await loadEmployees();
      await selectEmployee(form.employee_id);
      // Reset form fields but keep popup open to show updated list
      statusChangeForm.status = '';
      statusChangeForm.startDate = getTodayString();
      statusChangeForm.endDate = '';
    } catch (error) {
      statusEventError.value = parseEventError(error);
    } finally {
      saving.value = false;
    }
  }

  async function deleteStatusEvent(eventId, loadEmployees, selectEmployee) {
    if (!form.employee_id) return;
    statusEventError.value = '';
    try {
      await api.deleteStatusEvent(form.employee_id, eventId);
      // Reload events list
      await loadStatusEventsList();
      // Reload employee
      if (loadEmployees) await loadEmployees();
      if (selectEmployee) await selectEmployee(form.employee_id);
    } catch (error) {
      statusEventError.value = parseEventError(error);
    }
  }

  async function resetStatus(loadEmployees, selectEmployee) {
    if (!form.employee_id) return;
    if (saving.value) return;

    statusEventError.value = '';
    saving.value = true;
    try {
      // Find the currently active event and delete it, or fall back to direct update
      const data = await api.getStatusEvents(form.employee_id);
      const events = data.events || [];
      const today = getTodayString();
      const activeEvent = events.find(e => {
        return e.start_date <= today && (!e.end_date || e.end_date >= today);
      });

      if (activeEvent) {
        await api.deleteStatusEvent(form.employee_id, activeEvent.event_id);
      } else {
        // Fall back: update employee directly
        const currentEmployee = employees.value.find(e => e.employee_id === form.employee_id);
        if (currentEmployee) {
          const payload = {
            ...currentEmployee,
            employment_status: workingStatus.value,
            status_start_date: '',
            status_end_date: ''
          };
          await api.updateEmployee(form.employee_id, payload);
        }
      }

      statusEvents.value = [];
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
    statusEvents,
    statusEventsLoading,
    statusEventError,
    showStatusChangePopup,
    statusChangeForm,
    showStatusHistoryPopup,
    statusHistoryLoading,
    statusHistory,
    openStatusChangePopup,
    closeStatusChangePopup,
    applyStatusChange,
    deleteStatusEvent,
    resetStatus,
    openStatusHistoryPopup,
    closeStatusHistoryPopup,
    formatHistoryTimestamp,
    formatHistoryDate,
  };
}
