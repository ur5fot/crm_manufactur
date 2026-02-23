import { ref, computed } from "vue";

const statusColors = [
  'var(--color-status-active)',
  'var(--color-status-warning)',
  'var(--color-status-vacation)',
  'var(--color-status-warning)',
];

export function useDashboardStats(employees, employmentOptions, allFieldsSchema) {
  const expandedCard = ref(null);

  // Helper to resolve status field key from schema
  function statusFieldKey() {
    if (allFieldsSchema && allFieldsSchema.value) {
      const f = allFieldsSchema.value.find(f => f.role === 'STATUS');
      if (f) return f.key;
    }
    return 'employment_status';
  }

  const dashboardStats = computed(() => {
    const emps = employees.value;
    const total = emps.length;
    const options = employmentOptions.value;
    const sk = statusFieldKey();

    const statusCounts = options.map(opt => ({
      label: opt,
      count: emps.filter(e => e[sk] === opt).length
    }));

    const counted = statusCounts.reduce((sum, s) => sum + s.count, 0);
    return { total, statusCounts, other: total - counted };
  });

  const expandedEmployees = computed(() => {
    const key = expandedCard.value;
    if (!key) return [];
    const emps = employees.value;
    if (key === 'total') return emps;
    const sk = statusFieldKey();
    if (key === 'other') {
      const options = employmentOptions.value;
      return emps.filter(e => !options.includes(e[sk]));
    }
    return emps.filter(e => e[sk] === key);
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
