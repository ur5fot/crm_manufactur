import { DATA_DIR } from "../store.js";
import { loadFieldsSchema, loadEmployees, loadTemplates, loadGeneratedDocuments } from "../store.js";
import { openFolder, MIN_SEARCH_LENGTH, MAX_SEARCH_LENGTH, MAX_EMPLOYEE_RESULTS, MAX_TEMPLATE_RESULTS, MAX_DOCUMENT_RESULTS, findById } from "../utils.js";
import { generateDeclinedNames, generateDeclinedGradePosition } from "../declension.js";
import { ROLES, getFieldNameByRole, buildEmployeeName } from "../field-utils.js";
import { buildQuantityPlaceholders } from "../quantity-placeholders.js";

export function registerMiscRoutes(app) {
  app.post("/api/open-data-folder", async (req, res) => {
    try {
      await openFolder(DATA_DIR);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Не вдалося відкрити папку data" });
    }
  });

  app.get("/api/fields-schema", async (_req, res) => {
    let schema;
    try {
      schema = await loadFieldsSchema();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
      return;
    }

    // Группируем поля по группам
    const groups = {};
    const tableFields = [];
    const allFields = [];

    schema.forEach((field) => {
      const fieldData = {
        order: parseInt(field.field_order, 10),
        key: field.field_name,
        fieldId: field.field_id || '',
        label: field.field_label,
        type: field.field_type,
        options: field.field_options ? field.field_options.split('|') : [],
        group: field.field_group,
        showInTable: field.show_in_table === 'yes',
        editableInTable: field.editable_in_table === 'yes',
        role: field.role || ''
      };

      allFields.push(fieldData);

      // Группировка для карточек
      if (!groups[field.field_group]) {
        groups[field.field_group] = [];
      }
      groups[field.field_group].push(fieldData);

      // Поля для сводной таблицы
      if (field.show_in_table === 'yes') {
        tableFields.push(fieldData);
      }
    });

    res.json({
      groups,
      tableFields,
      allFields
    });
  });

  app.get("/api/search", async (req, res) => {
    try {
      const q = req.query.q;
      if (!q || q.trim().length < MIN_SEARCH_LENGTH) {
        res.status(400).json({ error: `Параметр q обов'язковий (мінімум ${MIN_SEARCH_LENGTH} символи)` });
        return;
      }
      if (q.trim().length > MAX_SEARCH_LENGTH) {
        res.status(400).json({ error: `Пошуковий запит занадто довгий (максимум ${MAX_SEARCH_LENGTH} символів)` });
        return;
      }

      const query = q.trim().toLowerCase();

      const [employees, templates, documents, schema] = await Promise.all([
        loadEmployees(),
        loadTemplates(),
        loadGeneratedDocuments(),
        loadFieldsSchema()
      ]);

      const activeTemplates = templates.filter(t => t.active !== 'no');

      const textFieldKeys = schema.filter(f => f.field_type !== 'file' && f.field_type !== 'photo').map(f => f.field_name);

      const matchedEmployees = employees.filter(emp => {
        for (const key of textFieldKeys) {
          const val = emp[key];
          if (val && String(val).toLowerCase().includes(query)) return true;
        }
        return false;
      });

      const matchedTemplates = activeTemplates.filter(t => {
        return (t.template_name && t.template_name.toLowerCase().includes(query)) ||
          (t.description && t.description.toLowerCase().includes(query));
      });

      const employeeMap = new Map(employees.map(e => [e.employee_id, e]));
      const templateMap = new Map(activeTemplates.map(t => [t.template_id, t]));

      const matchedDocuments = documents.filter(doc => {
        if (doc.docx_filename && doc.docx_filename.toLowerCase().includes(query)) return true;
        const emp = employeeMap.get(doc.employee_id);
        if (emp) {
          const name = buildEmployeeName(emp, schema);
          if (name.toLowerCase().includes(query)) return true;
        }
        const tmpl = templateMap.get(doc.template_id);
        if (tmpl && tmpl.template_name && tmpl.template_name.toLowerCase().includes(query)) return true;
        return false;
      }).map(doc => {
        const emp = employeeMap.get(doc.employee_id);
        const tmpl = templateMap.get(doc.template_id);
        return {
          document_id: doc.document_id,
          template_id: doc.template_id,
          employee_id: doc.employee_id,
          docx_filename: doc.docx_filename,
          generation_date: doc.generation_date,
          employee_name: emp ? buildEmployeeName(emp, schema) : "",
          template_name: tmpl ? tmpl.template_name : ""
        };
      });

      matchedDocuments.sort((a, b) => (b.generation_date || "").localeCompare(a.generation_date || ""));

      // Resolve field names from roles for search result response
      const empIdField = getFieldNameByRole(schema, ROLES.EMPLOYEE_ID) || 'employee_id';
      const lastNameField = getFieldNameByRole(schema, ROLES.LAST_NAME) || 'last_name';
      const firstNameField = getFieldNameByRole(schema, ROLES.FIRST_NAME) || 'first_name';
      const middleNameField = getFieldNameByRole(schema, ROLES.MIDDLE_NAME) || 'middle_name';
      const statusField = getFieldNameByRole(schema, ROLES.STATUS) || 'employment_status';

      res.json({
        employees: matchedEmployees.slice(0, MAX_EMPLOYEE_RESULTS).map(e => ({
          employee_id: e[empIdField],
          last_name: e[lastNameField],
          first_name: e[firstNameField],
          middle_name: e[middleNameField],
          employment_status: e[statusField],
        })),
        templates: matchedTemplates.slice(0, MAX_TEMPLATE_RESULTS),
        documents: matchedDocuments.slice(0, MAX_DOCUMENT_RESULTS),
        total: {
          employees: matchedEmployees.length,
          templates: matchedTemplates.length,
          documents: matchedDocuments.length
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Placeholder preview (reference page)
  app.get("/api/placeholder-preview/:employeeId?", async (req, res) => {
    try {
      const schema = await loadFieldsSchema();
      const employees = await loadEmployees();

      let employee;
      if (req.params.employeeId) {
        employee = findById(employees, 'employee_id', req.params.employeeId);
        if (!employee) {
          res.status(404).json({ error: "Співробітник не знайдено" });
          return;
        }
      } else {
        employee = employees[0];
        if (!employee) {
          res.status(404).json({ error: "Немає активних співробітників" });
          return;
        }
      }

      const placeholders = [];

      // Fields from schema (exclude photo — file path, not template data)
      for (const field of schema.filter(f => f.field_type !== 'photo')) {
        // Primary: field_id-based placeholder (when field_id exists)
        if (field.field_id) {
          placeholders.push({
            placeholder: `{${field.field_id}}`,
            label: field.field_label || field.field_name,
            value: employee[field.field_name] || '',
            group: 'fields',
            format: 'primary'
          });
        }
        // Legacy: field_name-based placeholder (backwards compatibility)
        placeholders.push({
          placeholder: `{${field.field_name}}`,
          label: field.field_label || field.field_name,
          value: employee[field.field_name] || '',
          group: 'fields',
          format: field.field_id ? 'legacy' : 'primary'
        });
      }

      // Declension placeholders
      const declined = await generateDeclinedNames(employee, schema);
      const caseLabels = {
        genitive: 'родовий',
        dative: 'давальний',
        accusative: 'знахідний',
        vocative: 'кличний',
        locative: 'місцевий',
        ablative: 'орудний'
      };
      // Build name fields map from schema roles for label display
      const lastNameFieldName = getFieldNameByRole(schema, ROLES.LAST_NAME) || 'last_name';
      const firstNameFieldName = getFieldNameByRole(schema, ROLES.FIRST_NAME) || 'first_name';
      const middleNameFieldName = getFieldNameByRole(schema, ROLES.MIDDLE_NAME) || 'middle_name';
      const lastNameFieldId = schema.find(f => f.field_name === lastNameFieldName)?.field_id || '';
      const firstNameFieldId = schema.find(f => f.field_name === firstNameFieldName)?.field_id || '';
      const middleNameFieldId = schema.find(f => f.field_name === middleNameFieldName)?.field_id || '';
      const lastNameLabel = schema.find(f => f.field_name === lastNameFieldName)?.field_label || 'Прізвище';
      const firstNameLabel = schema.find(f => f.field_name === firstNameFieldName)?.field_label || "Ім'я";
      const middleNameLabel = schema.find(f => f.field_name === middleNameFieldName)?.field_label || 'По батькові';
      // Declension name entries: fieldName, fieldId, label
      const nameEntries = [
        { fieldName: lastNameFieldName, fieldId: lastNameFieldId, label: lastNameLabel },
        { fieldName: firstNameFieldName, fieldId: firstNameFieldId, label: firstNameLabel },
        { fieldName: middleNameFieldName, fieldId: middleNameFieldId, label: middleNameLabel },
        { fieldName: 'full_name', fieldId: 'f_full_name', label: 'Повне ПІБ' }
      ];
      for (const [suffix, caseLabel] of Object.entries(caseLabels)) {
        for (const entry of nameEntries) {
          const legacyKey = `${entry.fieldName}_${suffix}`;
          const val = declined[legacyKey] || '';
          // Primary: field_id-based
          if (entry.fieldId) {
            placeholders.push({
              placeholder: `{${entry.fieldId}_${suffix}}`,
              label: `${entry.label} (${caseLabel})`,
              value: val,
              group: 'declension',
              format: 'primary'
            });
          }
          // Legacy: field_name-based
          placeholders.push({
            placeholder: `{${legacyKey}}`,
            label: `${entry.label} (${caseLabel})`,
            value: val,
            group: 'declension',
            format: entry.fieldId ? 'legacy' : 'primary'
          });
        }
      }

      // Grade/position declension placeholders
      const declinedGradePosition = await generateDeclinedGradePosition(employee, schema);
      const gradeFieldName = getFieldNameByRole(schema, ROLES.GRADE) || 'grade';
      const positionFieldName = getFieldNameByRole(schema, ROLES.POSITION) || 'position';
      const gradeFieldId = schema.find(f => f.field_name === gradeFieldName)?.field_id || '';
      const positionFieldId = schema.find(f => f.field_name === positionFieldName)?.field_id || '';
      const gradeLabel = schema.find(f => f.field_name === gradeFieldName)?.field_label || 'Посада';
      const positionLabel = schema.find(f => f.field_name === positionFieldName)?.field_label || 'Звання';
      const gradePositionEntries = [
        { fieldName: gradeFieldName, fieldId: gradeFieldId, label: gradeLabel },
        { fieldName: positionFieldName, fieldId: positionFieldId, label: positionLabel }
      ];
      for (const [suffix, caseLabel] of Object.entries(caseLabels)) {
        for (const entry of gradePositionEntries) {
          const legacyKey = `${entry.fieldName}_${suffix}`;
          const val = declinedGradePosition[legacyKey] || '';
          // Primary: field_id-based
          if (entry.fieldId) {
            placeholders.push({
              placeholder: `{${entry.fieldId}_${suffix}}`,
              label: `${entry.label} (${caseLabel})`,
              value: val,
              group: 'declension_fields',
              format: 'primary'
            });
          }
          // Legacy: field_name-based
          placeholders.push({
            placeholder: `{${legacyKey}}`,
            label: `${entry.label} (${caseLabel})`,
            value: val,
            group: 'declension_fields',
            format: entry.fieldId ? 'legacy' : 'primary'
          });
        }
      }

      // Special placeholders
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      placeholders.push({
        placeholder: '{current_date}',
        label: 'Поточна дата',
        value: `${day}.${month}.${year}`,
        group: 'special'
      });
      placeholders.push({
        placeholder: '{current_datetime}',
        label: 'Поточна дата і час',
        value: `${day}.${month}.${year} ${hours}:${minutes}`,
        group: 'special'
      });

      // Quantity placeholders for select fields
      const quantities = buildQuantityPlaceholders(schema, employees);
      for (const [key, value] of Object.entries(quantities)) {
        // Parse the key to build a descriptive label
        // Keys are like: f_gender_quantity, f_gender_option1_quantity
        const selectField = schema.find(f => f.field_id && key.startsWith(f.field_id + '_'));
        let label = key;
        if (selectField) {
          const fieldLabel = selectField.field_label || selectField.field_name;
          const suffix = key.slice(selectField.field_id.length + 1); // e.g. "quantity" or "option1_quantity"
          if (suffix === 'quantity') {
            label = `${fieldLabel} — кількість (всі)`;
          } else {
            // Parse optionN_quantity
            const optMatch = suffix.match(/^option(\d+)_quantity$/);
            if (optMatch) {
              const optIndex = parseInt(optMatch[1], 10) - 1;
              const options = selectField.field_options ? selectField.field_options.split('|').filter(Boolean) : [];
              const optionName = options[optIndex] || `опція ${optMatch[1]}`;
              label = `${fieldLabel} — кількість "${optionName}"`;
            }
          }
        }
        placeholders.push({
          placeholder: `{${key}}`,
          label,
          value,
          group: 'quantities'
        });
      }

      // Case variant placeholders (_upper and _cap for all text placeholders)
      // Create variants only for original placeholders, not for the variants themselves
      const originalPlaceholdersCount = placeholders.length;
      for (let i = 0; i < originalPlaceholdersCount; i++) {
        const p = placeholders[i];
        const val = typeof p.value === 'string' ? p.value : '';
        placeholders.push({
          placeholder: p.placeholder.replace('}', '_upper}'),
          label: `${p.label} (ВЕЛИКІ)`,
          value: val.length > 0 ? val.toUpperCase() : '',
          group: 'case_variants',
          format: p.format || 'primary'
        });
        placeholders.push({
          placeholder: p.placeholder.replace('}', '_cap}'),
          label: `${p.label} (З великої)`,
          value: val.length > 0 ? val.charAt(0).toUpperCase() + val.slice(1) : '',
          group: 'case_variants',
          format: p.format || 'primary'
        });
      }

      const employeeName = buildEmployeeName(employee, schema);

      res.json({
        employee_name: employeeName,
        employee_id: employee.employee_id,
        placeholders
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
