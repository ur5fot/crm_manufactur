const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const api = {
  getEmployees() {
    return request("/employees");
  },
  getEmployee(id) {
    return request(`/employees/${id}`);
  },
  createEmployee(payload) {
    return request("/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  },
  updateEmployee(id, payload) {
    return request(`/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  },
  deleteEmployee(id) {
    return request(`/employees/${id}`, { method: "DELETE" });
  },
  uploadEmployeeFile(id, formData) {
    return request(`/employees/${id}/files`, {
      method: "POST",
      body: formData
    });
  },
  deleteEmployeeFile(id, fieldName) {
    return request(`/employees/${id}/files/${fieldName}`, {
      method: "DELETE"
    });
  },
  openDataFolder() {
    return request("/open-data-folder", { method: "POST" });
  },
  openEmployeeFolder(id) {
    return request(`/employees/${id}/open-folder`, { method: "POST" });
  },
  importEmployees(formData) {
    return request("/employees/import", {
      method: "POST",
      body: formData
    });
  },
  getLogs() {
    return request("/logs");
  },
  getFieldsSchema() {
    return request("/fields-schema");
  },
  getDashboardStats() {
    return request("/dashboard/stats");
  },
  getDashboardEvents() {
    return request("/dashboard/events");
  },
  getDocumentExpiry() {
    return request("/document-expiry");
  },
  getDocumentOverdue() {
    return request("/document-overdue");
  },
  getBirthdayEvents() {
    return request("/birthday-events");
  },
  getRetirementEvents() {
    return request("/retirement-events");
  },
  getStatusReport(type) {
    return request(`/reports/statuses?type=${type}`);
  },
  getCustomReport(filters, columns) {
    const queryParams = new URLSearchParams();
    if (filters && filters.length > 0) {
      queryParams.set('filters', JSON.stringify(filters));
    }
    if (columns && columns.length > 0) {
      queryParams.set('columns', JSON.stringify(columns));
    }
    const params = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return request(`/reports/custom${params}`);
  },
  async exportCSV(filters, searchTerm = '') {
    const queryParams = new URLSearchParams();
    if (filters && Object.keys(filters).length > 0) {
      queryParams.set('filters', JSON.stringify(filters));
    }
    if (searchTerm && searchTerm.trim()) {
      queryParams.set('search', searchTerm.trim());
    }
    const params = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await fetch(`${BASE_URL}/export${params}`);
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
