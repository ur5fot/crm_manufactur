import { ref, computed } from "vue";
import { api } from "../api";

export function useDashboardReport(errorMessage) {
  const activeReport = ref(null);
  const currentData = ref([]);
  const monthData = ref([]);
  const reportLoading = ref(false);
  const currentLoaded = ref(false);
  const monthLoaded = ref(false);

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
      currentLoaded.value = true;
      monthLoaded.value = true;
    } catch (e) { console.error('Failed to load report counts:', e); }
  }

  async function toggleReport(type) {
    if (activeReport.value === type) {
      activeReport.value = null;
      return;
    }
    activeReport.value = type;
    // Data may already be loaded by loadCounts(); only fetch if not yet loaded
    if (type === 'current' && !currentLoaded.value) {
      reportLoading.value = true;
      try {
        const data = await api.getStatusReport(type);
        currentData.value = data;
        currentLoaded.value = true;
        errorMessage.value = '';
      } catch (e) {
        currentData.value = [];
        errorMessage.value = 'Помилка завантаження звіту';
      } finally {
        reportLoading.value = false;
      }
    } else if (type === 'month' && !monthLoaded.value) {
      reportLoading.value = true;
      try {
        const data = await api.getStatusReport(type);
        monthData.value = data;
        monthLoaded.value = true;
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
