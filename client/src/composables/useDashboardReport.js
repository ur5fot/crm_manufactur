import { ref, computed } from "vue";
import { api } from "../api";

export function useDashboardReport(errorMessage) {
  const activeReport = ref(null);
  const currentData = ref([]);
  const monthData = ref([]);
  const reportLoading = ref(false);

  const reportData = computed(() =>
    activeReport.value === 'current' ? currentData.value :
    activeReport.value === 'month' ? monthData.value :
    []
  );

  const absentEmployeesCount = computed(() => currentData.value.length);

  const statusChangesThisMonthCount = computed(() => monthData.value.length);

  async function loadCounts() {
    try {
      const [cur, mon] = await Promise.all([
        api.getStatusReport('current'),
        api.getStatusReport('month'),
      ]);
      currentData.value = cur;
      monthData.value = mon;
    } catch (e) { console.error('Failed to load report counts:', e); }
  }

  async function toggleReport(type) {
    if (activeReport.value === type) {
      activeReport.value = null;
      return;
    }
    activeReport.value = type;
    // Data may already be loaded by loadCounts(); fetch if not yet loaded
    if (type === 'current' && currentData.value.length === 0) {
      reportLoading.value = true;
      try {
        const data = await api.getStatusReport(type);
        currentData.value = data;
        errorMessage.value = '';
      } catch (e) {
        currentData.value = [];
        errorMessage.value = 'Помилка завантаження звіту';
      } finally {
        reportLoading.value = false;
      }
    } else if (type === 'month' && monthData.value.length === 0) {
      reportLoading.value = true;
      try {
        const data = await api.getStatusReport(type);
        monthData.value = data;
        errorMessage.value = '';
      } catch (e) {
        monthData.value = [];
        errorMessage.value = 'Помилка завантаження звіту';
      } finally {
        reportLoading.value = false;
      }
    }
  }

  return {
    activeReport,
    reportData,
    reportLoading,
    absentEmployeesCount,
    statusChangesThisMonthCount,
    toggleReport,
    loadCounts,
  };
}
