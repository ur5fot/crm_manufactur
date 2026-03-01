import { ref } from "vue";

export function useTableSort() {
  const sortColumn = ref(null);
  const sortDirection = ref(null);

  function toggleSort(columnKey) {
    if (sortColumn.value !== columnKey) {
      sortColumn.value = columnKey;
      sortDirection.value = "asc";
      return;
    }

    if (sortDirection.value === "asc") {
      sortDirection.value = "desc";
    } else if (sortDirection.value === "desc") {
      sortColumn.value = null;
      sortDirection.value = null;
    } else {
      sortDirection.value = "asc";
    }
  }

  function sortData(data, columns) {
    if (!sortColumn.value || !sortDirection.value) {
      return data;
    }

    const col = columns.find((c) => c.key === sortColumn.value);
    const colType = col?.type || "text";
    const key = sortColumn.value;
    const dir = sortDirection.value === "asc" ? 1 : -1;

    return [...data].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      const emptyA = valA == null || String(valA).trim() === "";
      const emptyB = valB == null || String(valB).trim() === "";

      if (emptyA && emptyB) return 0;
      if (emptyA) return 1;
      if (emptyB) return -1;

      if (colType === "number") {
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        const nanA = isNaN(numA);
        const nanB = isNaN(numB);
        if (nanA && nanB) return 0;
        if (nanA) return 1;
        if (nanB) return -1;
        return (numA - numB) * dir;
      }

      if (colType === "date") {
        return String(valA).localeCompare(String(valB)) * dir;
      }

      // text, select, textarea — locale-aware Ukrainian
      return String(valA).localeCompare(String(valB), "uk") * dir;
    });
  }

  return {
    sortColumn,
    sortDirection,
    toggleSort,
    sortData,
  };
}
