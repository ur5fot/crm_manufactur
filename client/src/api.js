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
  }
};
