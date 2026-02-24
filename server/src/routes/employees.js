import path from "path";
import fsPromises from "fs/promises";
import {
  FILES_DIR,
  REMOTE_DIR,
  loadEmployees,
  withEmployeeLock,
  addLog,
  addLogs,
  formatFieldNameWithLabel,
  getEmployeeColumnsSync,
  getDocumentFieldsSync,
  addStatusHistoryEntry,
  loadStatusHistory,
  loadReprimands,
  addReprimand,
  updateReprimand,
  deleteReprimand,
  getStatusEventsForEmployee,
  loadStatusEvents,
  addStatusEvent,
  updateStatusEvent,
  deleteStatusEvent,
  syncStatusEventsForEmployee,
  loadFieldsSchema,
  archiveEmployee,
  archiveStatusHistoryForEmployee,
  archiveReprimandsForEmployee,
  archiveStatusEventsForEmployee
} from "../store.js";
import { mergeRow } from "../csv.js";
import {
  getNextId,
  normalizeEmployeeInput,
  validateRequired,
  validatePath,
  findById,
} from "../utils.js";
import { ROLES, getFieldByRole, getFieldNameByRole, buildStatusFields, buildEmployeeName } from "../field-utils.js";

/**
 * Date validation logic - validates format and correctness of date fields
 */
function validateDateField(dateValue, dateField) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const trimmedValue = String(dateValue || "").trim();

  if (!trimmedValue) {
    return null; // Empty is valid
  }

  if (!dateRegex.test(trimmedValue)) {
    return `Невірний формат дати для поля ${dateField} (очікується YYYY-MM-DD)`;
  }

  if (isNaN(Date.parse(trimmedValue))) {
    return `Невірна дата для поля ${dateField} (неіснуюча дата)`;
  }

  // Validate calendar date: check that parsed date matches input (prevents Feb 30, Apr 31, etc.)
  // Use UTC methods to avoid timezone issues with YYYY-MM-DD dates
  const parsed = new Date(trimmedValue + 'T00:00:00Z');
  const roundtrip = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
  if (roundtrip !== trimmedValue) {
    return `Невірна календарна дата для поля ${dateField}: ${trimmedValue}`;
  }

  return null; // Valid
}

/**
 * Validate status event input fields (status, start_date, end_date).
 * Returns an error string if validation fails, or null if input is valid.
 * Used by both POST and PUT status event routes.
 */
async function validateStatusEventInput(status, start_date, end_date) {
  if (!status || !String(status).trim()) {
    return "Статус обов'язковий";
  }
  const fieldsSchema = await loadFieldsSchema();
  const statusFieldDef = getFieldByRole(fieldsSchema, ROLES.STATUS);
  if (statusFieldDef && statusFieldDef.field_options) {
    const allowedOptions = statusFieldDef.field_options.split('|').map(s => s.trim()).filter(Boolean);
    if (!allowedOptions.includes(String(status).trim())) {
      return `Недійсний статус. Допустимі значення: ${allowedOptions.join(', ')}`;
    }
  }
  if (!start_date || !String(start_date).trim()) {
    return "Дата початку обов'язкова";
  }
  const startDateError = validateDateField(String(start_date).trim(), 'start_date');
  if (startDateError) {
    return startDateError;
  }
  if (end_date && String(end_date).trim()) {
    const endDateError = validateDateField(String(end_date).trim(), 'end_date');
    if (endDateError) {
      return endDateError;
    }
    if (String(end_date).trim() < String(start_date).trim()) {
      return "Дата закінчення не може бути раніше дати початку";
    }
  }
  return null;
}

/**
 * Detect which fields changed between current and next employee objects
 */
function detectChangedFields(current, next, employeeIdFieldName) {
  const changedFields = [];
  getEmployeeColumnsSync().forEach((field) => {
    if (field !== employeeIdFieldName && current[field] !== next[field]) {
      changedFields.push(field);
    }
  });
  return changedFields;
}

/**
 * Register employee CRUD routes
 */
export function registerEmployeeRoutes(app) {
  // GET all employees
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await loadEmployees();
      res.json({ employees });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET single employee by ID
  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      // Sync status events after verifying employee exists (auto-activate/expire)
      await syncStatusEventsForEmployee(req.params.id);

      // Re-load employee to pick up any sync changes
      const updatedEmployees = await loadEmployees();
      const updatedEmployee = findById(updatedEmployees, 'employee_id', req.params.id);
      res.json({ employee: updatedEmployee || employee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST create new employee
  app.post("/api/employees", async (req, res) => {
    try {
      const payload = req.body || {};

      const baseEmployee = normalizeEmployeeInput(payload);

      // Запрещаем установку файловых полей и фото через create — только через upload endpoint
      const schema = await loadFieldsSchema();
      const photoFieldName = getFieldNameByRole(schema, ROLES.PHOTO);
      const firstNameField = getFieldNameByRole(schema, ROLES.FIRST_NAME);
      const lastNameField = getFieldNameByRole(schema, ROLES.LAST_NAME);

      for (const docField of getDocumentFieldsSync()) {
        baseEmployee[docField] = "";
      }
      if (photoFieldName) baseEmployee[photoFieldName] = "";

      // Валидация обязательных полей
      const firstNameError = validateRequired(firstNameField ? baseEmployee[firstNameField] : '', firstNameField || 'first_name', "Ім'я обов'язкове для заповнення");
      if (firstNameError) {
        res.status(400).json({ error: firstNameError });
        return;
      }
      const lastNameError = validateRequired(lastNameField ? baseEmployee[lastNameField] : '', lastNameField || 'last_name', "Прізвище обов'язкове для заповнення");
      if (lastNameError) {
        res.status(400).json({ error: lastNameError });
        return;
      }

      // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
      let employeeId;
      await withEmployeeLock(async (employees) => {
        employeeId = baseEmployee.employee_id || getNextId(employees, "employee_id");

        if (employees.some((item) => item.employee_id === employeeId)) {
          throw Object.assign(new Error("ID співробітника вже існує"), { statusCode: 409 });
        }

        baseEmployee.employee_id = employeeId;
        employees.push(baseEmployee);
        return employees;
      });

      // Логирование создания
      const employeeName = buildEmployeeName(baseEmployee, schema);
      await addLog("CREATE", employeeId, employeeName, "", "", "", "Створено нового співробітника");

      res.status(201).json({ employee_id: employeeId });
    } catch (err) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update employee
  app.put("/api/employees/:id", async (req, res) => {
    try {
      const payload = req.body || {};

      // Запрещаем изменение файловых полей через PUT — только через upload endpoint
      // Build updates object safely to prevent prototype pollution
      const schema = await loadFieldsSchema();
      const photoFieldName = getFieldNameByRole(schema, ROLES.PHOTO);
      const firstNameField = getFieldNameByRole(schema, ROLES.FIRST_NAME);
      const lastNameField = getFieldNameByRole(schema, ROLES.LAST_NAME);
      const employeeIdFieldName = getFieldNameByRole(schema, ROLES.EMPLOYEE_ID) || 'employee_id';
      const { status: statusFieldName, startDate: startDateFieldName, endDate: endDateFieldName } = buildStatusFields(schema);
      const allowedColumns = getEmployeeColumnsSync().filter(col => !getDocumentFieldsSync().includes(col) && col !== photoFieldName);
      const updates = {};
      for (const col of allowedColumns) {
        if (col in payload && col !== '__proto__' && col !== 'constructor' && col !== 'prototype') {
          updates[col] = payload[col];
        }
      }

      // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
      let current;
      let next;
      let changedFields;
      await withEmployeeLock(async (employees) => {
        const index = employees.findIndex((item) => item.employee_id === req.params.id);

        if (index === -1) {
          throw Object.assign(new Error("Співробітник не знайдено"), { statusCode: 404 });
        }

        current = employees[index];
        next = mergeRow(getEmployeeColumnsSync(), current, updates);
        next.employee_id = req.params.id;

        // Валидация обязательных полей
        const firstNameError = validateRequired(firstNameField ? next[firstNameField] : '', firstNameField || 'first_name', "Ім'я обов'язкове для заповнення");
        if (firstNameError) {
          throw Object.assign(new Error(firstNameError), { statusCode: 400 });
        }
        const lastNameError = validateRequired(lastNameField ? next[lastNameField] : '', lastNameField || 'last_name', "Прізвище обов'язкове для заповнення");
        if (lastNameError) {
          throw Object.assign(new Error(lastNameError), { statusCode: 400 });
        }

        // Валидация дат (формат и корректность)
        // ВАЖНО: Валидируем только поля которые были изменены в этом запросе
        // Это предотвращает ошибки валидации из-за legacy невалидных данных в других полях
        // Use schema field_type='date' for proper detection, plus _date suffix heuristic for auto-generated date columns
        const schemaDateFieldNames = new Set(schema.filter(f => f.field_type === 'date').map(f => f.field_name));
        const dateFields = getEmployeeColumnsSync().filter(col =>
          schemaDateFieldNames.has(col) || col.includes('_date')
        );

        // Находим какие поля были изменены в этом запросе
        const changedDateFields = dateFields.filter(dateField => {
          const currentValue = String(current[dateField] || "").trim();
          const nextValue = String(next[dateField] || "").trim();
          return currentValue !== nextValue;
        });

        for (const dateField of changedDateFields) {
          const error = validateDateField(next[dateField], dateField);
          if (error) {
            throw Object.assign(new Error(error), { statusCode: 400 });
          }
        }

        // Валидация пар issue_date/expiry_date для документів
        for (const docField of getDocumentFieldsSync()) {
          const issueDateField = `${docField}_issue_date`;
          const expiryDateField = `${docField}_expiry_date`;
          const issueDate = String(next[issueDateField] || "").trim();
          const expiryDate = String(next[expiryDateField] || "").trim();

          if (issueDate && expiryDate && expiryDate < issueDate) {
            throw Object.assign(new Error(`Дата закінчення не може бути раніше дати видачі для документа ${docField}`), { statusCode: 400 });
          }
        }

        employees[index] = next;
        changedFields = detectChangedFields(current, next, employeeIdFieldName);

        return employees;
      });

      // Логирование изменений
      const employeeName = buildEmployeeName(next, schema);

      // Логируем все изменения одной batch-операцией для предотвращения race condition
      if (changedFields.length > 0) {
        const logEntries = await Promise.all(changedFields.map(async (field) => {
          const formattedFieldName = await formatFieldNameWithLabel(field);
          return {
            action: "UPDATE",
            employeeId: req.params.id,
            employeeName: employeeName,
            fieldName: formattedFieldName,
            oldValue: current[field] || "",
            newValue: next[field] || "",
            details: `Изменено поле: ${formattedFieldName}`
          };
        }));
        await addLogs(logEntries);
      }

      // Record status history when employment_status changes (best-effort: employee update already committed)
      if (statusFieldName && changedFields.includes(statusFieldName)) {
        try {
          await addStatusHistoryEntry({
            employee_id: req.params.id,
            old_status: current[statusFieldName] || '',
            new_status: next[statusFieldName] || '',
            old_start_date: startDateFieldName ? (current[startDateFieldName] || '') : '',
            old_end_date: endDateFieldName ? (current[endDateFieldName] || '') : '',
            new_start_date: startDateFieldName ? (next[startDateFieldName] || '') : '',
            new_end_date: endDateFieldName ? (next[endDateFieldName] || '') : '',
            changed_by: 'user'
          });
        } catch (historyErr) {
          console.error('Failed to record status history:', historyErr);
        }
      }

      res.json({ employee: next });
    } catch (err) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET status history for employee
  app.get("/api/employees/:id/status-history", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const allHistory = await loadStatusHistory();
      const history = allHistory
        .filter(h => h.employee_id === req.params.id)
        .sort((a, b) => (b.changed_at || '').localeCompare(a.changed_at || ''));

      res.json({ history });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET status events for employee
  app.get("/api/employees/:id/status-events", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const events = await getStatusEventsForEmployee(req.params.id);
      res.json({ events });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST create status event for employee
  app.post("/api/employees/:id/status-events", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const { status, start_date, end_date } = req.body || {};

      const inputError = await validateStatusEventInput(status, start_date, end_date);
      if (inputError) {
        res.status(400).json({ error: inputError });
        return;
      }

      let event;
      try {
        event = await addStatusEvent({
          employee_id: req.params.id,
          status: String(status).trim(),
          start_date: String(start_date).trim(),
          end_date: end_date ? String(end_date).trim() : ''
        });
      } catch (addErr) {
        if (addErr.code === 'OVERLAP') {
          res.status(409).json({ error: addErr.message });
          return;
        }
        throw addErr;
      }

      // Sync to apply if currently active
      await syncStatusEventsForEmployee(req.params.id);

      // Return updated employee
      const updatedEmployees = await loadEmployees();
      const updatedEmployee = findById(updatedEmployees, 'employee_id', req.params.id);

      const evtSchema = await loadFieldsSchema();
      const employeeName = buildEmployeeName(employee, evtSchema);
      await addLog("CREATE", req.params.id, employeeName, "status_event", "", event.event_id, `Додано подію статусу: ${event.status} з ${event.start_date}`);

      res.status(201).json({ event, employee: updatedEmployee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update status event for employee
  app.put("/api/employees/:id/status-events/:eventId", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const { status, start_date, end_date } = req.body || {};

      const putInputError = await validateStatusEventInput(status, start_date, end_date);
      if (putInputError) {
        res.status(400).json({ error: putInputError });
        return;
      }

      // Verify the event exists and belongs to this employee
      const allEvents = await loadStatusEvents();
      const event = allEvents.find(e => e.event_id === req.params.eventId);
      if (!event) {
        res.status(404).json({ error: "Подію не знайдено" });
        return;
      }
      if (event.employee_id !== req.params.id) {
        res.status(403).json({ error: "Подія не належить цьому співробітнику" });
        return;
      }

      let updatedEvent;
      try {
        updatedEvent = await updateStatusEvent(req.params.eventId, {
          status: String(status).trim(),
          start_date: String(start_date).trim(),
          end_date: end_date ? String(end_date).trim() : ''
        });
      } catch (updateErr) {
        if (updateErr.code === 'OVERLAP') {
          res.status(409).json({ error: updateErr.message });
          return;
        }
        if (updateErr.message === 'Event not found') {
          res.status(404).json({ error: "Подію не знайдено" });
          return;
        }
        throw updateErr;
      }

      // Sync to apply any status changes
      await syncStatusEventsForEmployee(req.params.id);

      // Return updated employee
      const updatedEmployees = await loadEmployees();
      const updatedEmployee = findById(updatedEmployees, 'employee_id', req.params.id);

      const putEvtSchema = await loadFieldsSchema();
      const employeeName = buildEmployeeName(employee, putEvtSchema);
      await addLog("UPDATE", req.params.id, employeeName, "status_event", req.params.eventId, req.params.eventId, `Оновлено подію статусу: ${updatedEvent.status} з ${updatedEvent.start_date}`);

      res.json({ event: updatedEvent, employee: updatedEmployee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE status event for employee
  app.delete("/api/employees/:id/status-events/:eventId", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      // Load all events to verify ownership (similar to reprimands pattern)
      const allEvents = await loadStatusEvents();
      const event = allEvents.find(e => e.event_id === req.params.eventId);
      if (!event) {
        res.status(404).json({ error: "Подію не знайдено" });
        return;
      }
      if (event.employee_id !== req.params.id) {
        res.status(403).json({ error: "Подія не належить цьому співробітнику" });
        return;
      }

      await deleteStatusEvent(req.params.eventId);

      // Sync to update employee status after deletion.
      // forceReset: true ensures reset to "Працює" even when the last event was deleted
      await syncStatusEventsForEmployee(req.params.id, { forceReset: true });

      const delEvtSchema = await loadFieldsSchema();
      const employeeName = buildEmployeeName(employee, delEvtSchema);
      await addLog("DELETE", req.params.id, employeeName, "status_event", req.params.eventId, "", `Видалено подію статусу: ${event.status} з ${event.start_date}`);

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET reprimands for employee
  app.get("/api/employees/:id/reprimands", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const allReprimands = await loadReprimands();
      const reprimands = allReprimands
        .filter(r => r.employee_id === req.params.id)
        .sort((a, b) => (b.record_date || '').localeCompare(a.record_date || ''));

      res.json({ reprimands });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST create reprimand for employee
  app.post("/api/employees/:id/reprimands", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const { record_date, record_type, order_number, note } = req.body || {};

      if (!record_date || !String(record_date).trim()) {
        res.status(400).json({ error: "Дата запису обов'язкова" });
        return;
      }
      if (!record_type || !String(record_type).trim()) {
        res.status(400).json({ error: "Тип запису обов'язковий" });
        return;
      }

      const reprimand = await addReprimand({
        employee_id: req.params.id,
        record_date: String(record_date).trim(),
        record_type: String(record_type).trim(),
        order_number: order_number ? String(order_number).trim() : "",
        note: note ? String(note).trim() : ""
      });

      const repSchema = await loadFieldsSchema();
      const employeeName = buildEmployeeName(employee, repSchema);
      await addLog("CREATE", req.params.id, employeeName, "reprimand", "", reprimand.record_id, `Додано запис: ${reprimand.record_type}`);

      res.status(201).json({ reprimand });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update reprimand for employee
  app.put("/api/employees/:id/reprimands/:recordId", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      const { record_date, record_type, order_number, note } = req.body || {};

      if (!record_date || !String(record_date).trim()) {
        res.status(400).json({ error: "Дата запису обов'язкова" });
        return;
      }
      if (!record_type || !String(record_type).trim()) {
        res.status(400).json({ error: "Тип запису обов'язковий" });
        return;
      }

      // Verify ownership before writing
      const allReprimands = await loadReprimands();
      const existingRecord = allReprimands.find(r => r.record_id === req.params.recordId);
      if (!existingRecord) {
        res.status(404).json({ error: "Запис не знайдено" });
        return;
      }
      if (existingRecord.employee_id !== req.params.id) {
        res.status(403).json({ error: "Запис не належить цьому співробітнику" });
        return;
      }

      const updated = await updateReprimand(req.params.recordId, {
        record_date: String(record_date).trim(),
        record_type: String(record_type).trim(),
        order_number: order_number !== undefined ? String(order_number).trim() : "",
        note: note !== undefined ? String(note).trim() : ""
      });

      if (!updated) {
        res.status(404).json({ error: "Запис не знайдено" });
        return;
      }

      const repUpdSchema = await loadFieldsSchema();
      const employeeName = buildEmployeeName(employee, repUpdSchema);
      await addLog("UPDATE", req.params.id, employeeName, "reprimand", req.params.recordId, req.params.recordId, `Оновлено запис: ${updated.record_type}`);

      res.json({ reprimand: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE single reprimand for employee
  app.delete("/api/employees/:id/reprimands/:recordId", async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = findById(employees, 'employee_id', req.params.id);
      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      // Load reprimands to verify ownership before deletion
      const allReprimands = await loadReprimands();
      const record = allReprimands.find(r => r.record_id === req.params.recordId);
      if (!record) {
        res.status(404).json({ error: "Запис не знайдено" });
        return;
      }
      if (record.employee_id !== req.params.id) {
        res.status(403).json({ error: "Запис не належить цьому співробітнику" });
        return;
      }

      const deleted = await deleteReprimand(req.params.recordId);
      if (!deleted) {
        res.status(404).json({ error: "Запис не знайдено" });
        return;
      }

      const repDelSchema = await loadFieldsSchema();
      const employeeName = buildEmployeeName(employee, repDelSchema);
      await addLog("DELETE", req.params.id, employeeName, "reprimand", req.params.recordId, "", `Видалено запис: ${record.record_type}`);

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE employee (archive to remote + physical file move)
  app.delete("/api/employees/:id", async (req, res) => {
    try {
      // Use withEmployeeLock for atomic read-modify-write to prevent lost updates
      let deletedEmployee;
      await withEmployeeLock(async (employees) => {
        deletedEmployee = findById(employees, 'employee_id', req.params.id);
        const nextEmployees = employees.filter((item) => item.employee_id !== req.params.id);

        if (nextEmployees.length === employees.length) {
          throw Object.assign(new Error("Співробітник не знайдено"), { statusCode: 404 });
        }

        return nextEmployees;
      });

      // Archive employee record to employees_remote.csv
      if (deletedEmployee) {
        await archiveEmployee({ ...deletedEmployee, active: 'no' }).catch(err => {
          console.error('Failed to archive employee record:', err);
        });
      }

      // Move employee files directory to remote/employee_{id}/
      const employeeDir = path.join(FILES_DIR, `employee_${req.params.id}`);
      if (validatePath(employeeDir, FILES_DIR)) {
        const remoteEmployeeDir = path.join(REMOTE_DIR, `employee_${req.params.id}`);
        await fsPromises.mkdir(REMOTE_DIR, { recursive: true });
        await fsPromises.rm(remoteEmployeeDir, { recursive: true, force: true }).catch(() => {});
        await fsPromises.rename(employeeDir, remoteEmployeeDir).catch((err) => {
          if (err.code !== 'ENOENT') {
            console.error('Failed to move employee files to remote:', err);
          }
        });
      }

      // Archive status history entries for deleted employee
      await archiveStatusHistoryForEmployee(req.params.id).catch(err => {
        console.error('Failed to archive status history:', err);
      });

      // Archive reprimand records for deleted employee
      await archiveReprimandsForEmployee(req.params.id).catch(err => {
        console.error('Failed to archive reprimands:', err);
      });

      // Archive status events for deleted employee
      await archiveStatusEventsForEmployee(req.params.id).catch(err => {
        console.error('Failed to archive status events:', err);
      });

      // Логирование удаления
      if (deletedEmployee) {
        const delSchema = await loadFieldsSchema();
        const employeeName = buildEmployeeName(deletedEmployee, delSchema);
        await addLog("DELETE", req.params.id, employeeName, "", "", "", "Співробітник видалено (перенесено в архів)");
      }

      res.status(204).end();
    } catch (err) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
