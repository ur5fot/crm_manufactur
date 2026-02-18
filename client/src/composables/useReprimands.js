import { ref, reactive } from "vue";
import { api } from "../api";

export const REPRIMAND_TYPE_OPTIONS = [
  'Догана',
  'Сувора догана',
  'Зауваження',
  'Попередження',
  'Подяка',
  'Грамота',
  'Премія',
  'Нагорода'
];

export function useReprimands() {
  const showReprimandsPopup = ref(false);
  const reprimandsLoading = ref(false);
  const reprimands = ref([]);
  const showReprimandForm = ref(false);
  const editingReprimandId = ref(null);
  const reprimandSaving = ref(false);
  const reprimandError = ref('');
  const loadedForEmployeeId = ref(null);

  const reprimandForm = reactive({
    record_date: '',
    record_type: '',
    order_number: '',
    note: ''
  });

  async function openReprimandsPopup(employeeId) {
    if (!employeeId) return;
    showReprimandsPopup.value = true;
    showReprimandForm.value = false;
    editingReprimandId.value = null;
    reprimandError.value = '';
    // Skip reload if data is already loaded for this employee (pre-loaded by watch)
    if (loadedForEmployeeId.value !== employeeId) {
      await loadReprimands(employeeId);
    }
  }

  function closeReprimandsPopup() {
    showReprimandsPopup.value = false;
    showReprimandForm.value = false;
    editingReprimandId.value = null;
    reprimandError.value = '';
  }

  async function loadReprimands(employeeId) {
    if (!employeeId) return;
    reprimandsLoading.value = true;
    try {
      const data = await api.getEmployeeReprimands(employeeId);
      reprimands.value = data.reprimands || [];
      loadedForEmployeeId.value = employeeId;
    } catch (error) {
      reprimands.value = [];
      loadedForEmployeeId.value = null;
      console.error('Failed to load reprimands:', error);
    } finally {
      reprimandsLoading.value = false;
    }
  }

  function openAddForm() {
    editingReprimandId.value = null;
    reprimandForm.record_date = '';
    reprimandForm.record_type = '';
    reprimandForm.order_number = '';
    reprimandForm.note = '';
    reprimandError.value = '';
    showReprimandForm.value = true;
  }

  function openEditForm(record) {
    editingReprimandId.value = record.record_id;
    reprimandForm.record_date = record.record_date || '';
    reprimandForm.record_type = record.record_type || '';
    reprimandForm.order_number = record.order_number || '';
    reprimandForm.note = record.note || '';
    reprimandError.value = '';
    showReprimandForm.value = true;
  }

  function closeReprimandForm() {
    showReprimandForm.value = false;
    editingReprimandId.value = null;
    reprimandError.value = '';
  }

  async function submitReprimand(employeeId) {
    if (!employeeId) return;
    if (!reprimandForm.record_date || !reprimandForm.record_type) {
      reprimandError.value = 'Дата та тип запису є обов\'язковими';
      return;
    }

    reprimandSaving.value = true;
    reprimandError.value = '';
    try {
      const data = {
        record_date: reprimandForm.record_date,
        record_type: reprimandForm.record_type,
        order_number: reprimandForm.order_number,
        note: reprimandForm.note
      };

      if (editingReprimandId.value) {
        await api.updateEmployeeReprimand(employeeId, editingReprimandId.value, data);
      } else {
        await api.addEmployeeReprimand(employeeId, data);
      }

      await loadReprimands(employeeId);
      closeReprimandForm();
    } catch (error) {
      reprimandError.value = error.message;
    } finally {
      reprimandSaving.value = false;
    }
  }

  async function deleteReprimandEntry(employeeId, recordId) {
    if (!employeeId || !recordId) return;
    reprimandSaving.value = true;
    reprimandError.value = '';
    try {
      await api.deleteEmployeeReprimand(employeeId, recordId);
      await loadReprimands(employeeId);
    } catch (error) {
      reprimandError.value = error.message;
    } finally {
      reprimandSaving.value = false;
    }
  }

  function formatReprimandDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }

  return {
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
    openAddForm,
    openEditForm,
    closeReprimandForm,
    submitReprimand,
    deleteReprimandEntry,
    formatReprimandDate
  };
}
