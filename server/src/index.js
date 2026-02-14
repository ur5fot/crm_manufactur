import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import {
  ensureDataDirs,
  DATA_DIR,
  FILES_DIR,
  loadEmployees,
  loadLogs,
  loadFieldsSchema,
  initializeEmployeeColumns,
  loadConfig,
  loadTemplates,
  loadGeneratedDocuments
} from "./store.js";
import { generateDeclinedNames, generateDeclinedGradePosition } from "./declension.js";
import { openFolder } from "./utils.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerEmployeeRoutes } from "./routes/employees.js";
import { registerEmployeeFileRoutes } from "./routes/employee-files.js";
import { registerTemplateRoutes } from "./routes/templates.js";

const app = express();
const port = process.env.PORT || 3000;

await ensureDataDirs();
await initializeEmployeeColumns();

// Load configuration with fallback
let appConfig;
try {
  appConfig = await loadConfig();
  console.log(`Max file upload size: ${appConfig.max_file_upload_mb || 10}MB`);
} catch (err) {
  console.error('Failed to load config.csv, using default values:', err.message);
  appConfig = {
    max_file_upload_mb: 10,
    retirement_age_years: 60,
    max_log_entries: 1000,
    max_report_preview_rows: 100
  };
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/files", express.static(FILES_DIR));
// SECURITY: DATA_DIR static serving removed - sensitive CSV files should not be publicly accessible
// app.use("/data", express.static(DATA_DIR));

registerDashboardRoutes(app);
registerReportRoutes(app);
registerEmployeeRoutes(app);
registerEmployeeFileRoutes(app, appConfig);
registerTemplateRoutes(app, appConfig);

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

app.get("/api/logs", async (req, res) => {
  try {
    const logs = await loadLogs();
    // Сортировка по убыванию (новые сначала)
    logs.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;
    });
    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/open-data-folder", async (req, res) => {
  try {
    await openFolder(DATA_DIR);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Не удалось открыть папку data" });
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

// Get list of generated documents with filtering and pagination
app.get("/api/documents", async (req, res) => {
  try {
    const { template_id, employee_id, start_date, end_date, offset = '0', limit = '50' } = req.query;

    // Load all data sources
    const documents = await loadGeneratedDocuments();
    const templates = await loadTemplates();
    const employees = await loadEmployees();

    // Create lookup maps for joins
    const templateMap = new Map(templates.map(t => [t.template_id, t]));
    const employeeMap = new Map(employees.map(e => [e.employee_id, e]));

    // Filter documents
    let filtered = documents.filter(doc => {
      // Filter by template_id
      if (template_id && doc.template_id !== template_id) {
        return false;
      }

      // Filter by employee_id
      if (employee_id && doc.employee_id !== employee_id) {
        return false;
      }

      // Filter by date range
      if (start_date || end_date) {
        const docDate = new Date(doc.generation_date);

        if (start_date) {
          const startDateObj = new Date(start_date);
          if (docDate < startDateObj) {
            return false;
          }
        }

        if (end_date) {
          const endDateObj = new Date(end_date);
          // End date should include the whole day
          endDateObj.setHours(23, 59, 59, 999);
          if (docDate > endDateObj) {
            return false;
          }
        }
      }

      return true;
    });

    // Sort by generation_date DESC (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.generation_date);
      const dateB = new Date(b.generation_date);
      return dateB - dateA;
    });

    // Get total count before pagination
    const total = filtered.length;

    // Apply pagination with validation to prevent DoS
    const offsetNum = parseInt(offset, 10) || 0;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 1000);

    if (offsetNum < 0 || isNaN(offsetNum)) {
      res.status(400).json({ error: 'Invalid offset parameter' });
      return;
    }

    const paginated = filtered.slice(offsetNum, offsetNum + limitNum);

    // Join with templates and employees to enrich data
    const enriched = paginated.map(doc => {
      const template = templateMap.get(doc.template_id);
      const employee = employeeMap.get(doc.employee_id);

      return {
        document_id: doc.document_id,
        template_id: doc.template_id,
        template_name: template ? template.template_name : 'Unknown Template',
        employee_id: doc.employee_id,
        employee_name: employee
          ? `${employee.last_name || ''} ${employee.first_name || ''} ${employee.middle_name || ''}`.trim()
          : 'Unknown Employee',
        docx_filename: doc.docx_filename,
        generation_date: doc.generation_date,
        generated_by: doc.generated_by
      };
    });

    res.json({
      documents: enriched,
      total,
      offset: offsetNum,
      limit: limitNum
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Download generated document
app.get("/api/documents/:id/download", async (req, res) => {
  try {
    // Load document from generated_documents.csv
    const documents = await loadGeneratedDocuments();
    const document = documents.find((d) => d.document_id === req.params.id);

    if (!document) {
      res.status(404).json({ error: "Документ не знайдено" });
      return;
    }

    // SECURITY: Sanitize filename from database before using in path
    // Prevents path traversal if CSV is manually edited with malicious filename
    const sanitizedFilename = document.docx_filename.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ._-]/g, '_');

    // Validate file exists and prevent path traversal
    const filePath = path.join(FILES_DIR, 'documents', sanitizedFilename);
    const resolvedPath = path.resolve(filePath);
    const allowedDir = path.resolve(FILES_DIR, 'documents');

    if (!resolvedPath.startsWith(allowedDir + path.sep)) {
      res.status(403).json({ error: "Недозволений шлях до файлу" });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Файл документу не знайдено на диску" });
      return;
    }

    // Send file with proper headers (sanitize filename for security)
    const safeFilename = path.basename(document.docx_filename);
    res.download(filePath, safeFilename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Помилка завантаження файлу" });
        }
      }
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.listen(port, () => {
  console.log(`CRM server running on http://localhost:${port}`);
});
