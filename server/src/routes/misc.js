import { DATA_DIR } from "../store.js";
import { loadFieldsSchema, loadEmployees, loadTemplates, loadGeneratedDocuments } from "../store.js";
import { openFolder, MIN_SEARCH_LENGTH, MAX_SEARCH_LENGTH, MAX_EMPLOYEE_RESULTS, MAX_TEMPLATE_RESULTS, MAX_DOCUMENT_RESULTS, findById, buildFullName } from "../utils.js";
import { generateDeclinedNames, generateDeclinedGradePosition } from "../declension.js";

export function registerMiscRoutes(app) {
  app.post("/api/open-data-folder", async (req, res) => {
    try {
      await openFolder(DATA_DIR);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Не удалось открыть папку data" });
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
        label: field.field_label,
        type: field.field_type,
        options: field.field_options ? field.field_options.split('|') : [],
        group: field.field_group,
        showInTable: field.show_in_table === 'yes',
        editableInTable: field.editable_in_table === 'yes'
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

      const activeEmployees = employees.filter(e => e.active !== 'no');
      const activeTemplates = templates.filter(t => t.active !== 'no');

      const textFieldKeys = schema.filter(f => f.field_type !== 'file').map(f => f.field_name);

      const matchedEmployees = activeEmployees.filter(emp => {
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

      const employeeMap = new Map(activeEmployees.map(e => [e.employee_id, e]));
      const templateMap = new Map(activeTemplates.map(t => [t.template_id, t]));

      const matchedDocuments = documents.filter(doc => {
        if (doc.docx_filename && doc.docx_filename.toLowerCase().includes(query)) return true;
        const emp = employeeMap.get(doc.employee_id);
        if (emp) {
          const name = buildFullName(emp);
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
          employee_name: emp ? buildFullName(emp) : "",
          template_name: tmpl ? tmpl.template_name : ""
        };
      });

      matchedDocuments.sort((a, b) => (b.generation_date || "").localeCompare(a.generation_date || ""));

      res.json({
        employees: matchedEmployees.slice(0, MAX_EMPLOYEE_RESULTS).map(e => ({
          employee_id: e.employee_id,
          last_name: e.last_name,
          first_name: e.first_name,
          middle_name: e.middle_name,
          employment_status: e.employment_status,
          department: e.department
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
      const activeEmployees = employees.filter(e => e.active !== 'no');

      let employee;
      if (req.params.employeeId) {
        employee = findById(activeEmployees, 'employee_id', req.params.employeeId);
        if (!employee) {
          res.status(404).json({ error: "Співробітник не знайдено" });
          return;
        }
      } else {
        employee = activeEmployees[0];
        if (!employee) {
          res.status(404).json({ error: "Немає активних співробітників" });
          return;
        }
      }

      const placeholders = [];

      // Fields from schema
      for (const field of schema) {
        placeholders.push({
          placeholder: `{${field.field_name}}`,
          label: field.field_label || field.field_name,
          value: employee[field.field_name] || '',
          group: 'fields'
        });
      }

      // Declension placeholders
      const declined = await generateDeclinedNames(employee);
      const caseLabels = {
        genitive: 'родовий',
        dative: 'давальний',
        accusative: 'знахідний',
        vocative: 'кличний',
        locative: 'місцевий',
        ablative: 'орудний'
      };
      const nameFields = {
        last_name: 'Прізвище',
        first_name: "Ім'я",
        middle_name: 'По батькові',
        full_name: 'Повне ПІБ'
      };
      for (const [suffix, caseLabel] of Object.entries(caseLabels)) {
        for (const [field, fieldLabel] of Object.entries(nameFields)) {
          const key = `${field}_${suffix}`;
          placeholders.push({
            placeholder: `{${key}}`,
            label: `${fieldLabel} (${caseLabel})`,
            value: declined[key] || '',
            group: 'declension'
          });
        }
      }

      // Grade/position declension placeholders
      const declinedGradePosition = await generateDeclinedGradePosition(employee);
      const gradePositionFields = {
        grade: 'Посада',
        position: 'Звання'
      };
      for (const [suffix, caseLabel] of Object.entries(caseLabels)) {
        for (const [field, fieldLabel] of Object.entries(gradePositionFields)) {
          const key = `${field}_${suffix}`;
          placeholders.push({
            placeholder: `{${key}}`,
            label: `${fieldLabel} (${caseLabel})`,
            value: declinedGradePosition[key] || '',
            group: 'declension_fields'
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

      // Case variant placeholders (_upper and _cap for all text placeholders)
      for (const p of [...placeholders]) {
        const val = typeof p.value === 'string' ? p.value : '';
        placeholders.push({
          placeholder: p.placeholder.replace('}', '_upper}'),
          label: `${p.label} (ВЕЛИКІ)`,
          value: val.length > 0 ? val.toUpperCase() : '',
          group: 'case_variants'
        });
        placeholders.push({
          placeholder: p.placeholder.replace('}', '_cap}'),
          label: `${p.label} (З великої)`,
          value: val.length > 0 ? val.charAt(0).toUpperCase() + val.slice(1) : '',
          group: 'case_variants'
        });
      }

      const employeeName = buildFullName(employee);

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
