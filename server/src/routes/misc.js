import {
  DATA_DIR,
  loadFieldsSchema,
  loadEmployees
} from "../store.js";
import { generateDeclinedNames, generateDeclinedGradePosition } from "../declension.js";
import { openFolder } from "../utils.js";

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

      if (!groups[field.field_group]) {
        groups[field.field_group] = [];
      }
      groups[field.field_group].push(fieldData);

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

  // Placeholder preview (reference page)
  app.get("/api/placeholder-preview/:employeeId?", async (req, res) => {
    try {
      const schema = await loadFieldsSchema();
      const employees = await loadEmployees();
      const activeEmployees = employees.filter(e => e.active !== 'no');

      let employee;
      if (req.params.employeeId) {
        employee = activeEmployees.find(e => e.employee_id === req.params.employeeId);
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

      const employeeName = [employee.last_name, employee.first_name, employee.middle_name]
        .filter(Boolean).join(' ');

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
