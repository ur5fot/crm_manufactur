import { ref, computed } from "vue";

const statusColors = [
  'var(--color-status-active)',
  'var(--color-status-warning)',
  'var(--color-status-vacation)',
  'var(--color-status-warning)',
];

export function useDashboardStats(employees, employmentOptions) {
  const expandedCard = ref(null);

  const dashboardStats = computed(() => {
    const emps = employees.value;
    const total = emps.length;
    const options = employmentOptions.value;

    const statusCounts = options.map(opt => ({
      label: opt,
      count: emps.filter(e => e.employment_status === opt).length
    }));

    const counted = statusCounts.reduce((sum, s) => sum + s.count, 0);
    return { total, statusCounts, other: total - counted };
  });

  const expandedEmployees = computed(() => {
    const key = expandedCard.value;
    if (!key) return [];
    const emps = employees.value;
    if (key === 'total') return emps;
    if (key === 'other') {
      const options = employmentOptions.value;
      return emps.filter(e => !options.includes(e.employment_status));
    }
    return emps.filter(e => e.employment_status === key);
  });

  function statusCardColor(idx) {
    return statusColors[idx] || 'var(--color-status-inactive)';
  }

  function toggleStatCard(cardKey) {
    expandedCard.value = expandedCard.value === cardKey ? null : cardKey;
  }

  return {
    expandedCard,
    dashboardStats,
    expandedEmployees,
    statusCardColor,
    toggleStatCard,
  };
}
