import { ref, computed } from "vue";
import { api } from "../api";

export function useDashboardReport(errorMessage) {
  const activeReport = ref(null);
  const reportData = ref([]);
  const reportLoading = ref(false);

  const absentEmployeesCount = computed(() => {
    if (activeReport.value === 'current') {
      return reportData.value.length;
    }
    return 0;
  });

  const statusChangesThisMonthCount = computed(() => {
    if (activeReport.value === 'month') {
      return reportData.value.length;
    }
    return 0;
  });

  async function toggleReport(type) {
    if (activeReport.value === type) {
      activeReport.value = null;
      reportData.value = [];
      return;
    }
    activeReport.value = type;
    reportLoading.value = true;
    try {
      const data = await api.getStatusReport(type);
      reportData.value = data;
      errorMessage.value = '';
    } catch (e) {
      reportData.value = [];
      errorMessage.value = 'Помилка завантаження звіту';
    } finally {
      reportLoading.value = false;
    }
  }

  return {
    activeReport,
    reportData,
    reportLoading,
    absentEmployeesCount,
    statusChangesThisMonthCount,
    toggleReport,
  };
}
