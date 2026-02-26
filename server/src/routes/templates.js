import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { execFile } from "child_process";
import { FILES_DIR, loadTemplates, saveTemplates, addLog, loadEmployees, addGeneratedDocument, loadFieldsSchema } from "../store.js";
import { extractPlaceholders, generateDocx } from "../docx-generator.js";
import { getOpenCommand, getNextId, validateRequired, validatePath, findById } from "../utils.js";
import { createTemplateUpload } from "../upload-config.js";
import { buildEmployeeName, buildFieldNameToIdMap, getFieldNameByRole, ROLES } from "../field-utils.js";
import { buildQuantityPlaceholders } from "../quantity-placeholders.js";

export function registerTemplateRoutes(app, appConfig) {
  const templateUpload = createTemplateUpload(appConfig);

  // Get all templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await loadTemplates();
      // Return only active templates
      const activeTemplates = templates.filter((t) => t.active !== 'no');
      res.json({ templates: activeTemplates });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get single template
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const templates = await loadTemplates();
      const template = findById(templates, 'template_id', req.params.id);
      if (!template) {
        res.status(404).json({ error: "Шаблон не знайдено" });
        return;
      }
      res.json({ template });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create new template
  app.post("/api/templates", async (req, res) => {
    try {
      const payload = req.body || {};
      const templates = await loadTemplates();

      // Validation
      const nameError = validateRequired(payload.template_name, 'template_name', "Назва шаблону обов'язкова");
      if (nameError) {
        res.status(400).json({ error: nameError });
        return;
      }
      const typeError = validateRequired(payload.template_type, 'template_type', "Тип шаблону обов'язковий");
      if (typeError) {
        res.status(400).json({ error: typeError });
        return;
      }

      const templateId = getNextId(templates, "template_id");

      const newTemplate = {
        template_id: templateId,
        template_name: payload.template_name || '',
        template_type: payload.template_type || '',
        docx_filename: '',
        placeholder_fields: '',
        description: payload.description || '',
        created_date: new Date().toISOString().split('T')[0],
        active: 'yes',
        is_general: payload.is_general === 'yes' ? 'yes' : 'no'
      };

      templates.push(newTemplate);
      await saveTemplates(templates);

      await addLog(
        "CREATE_TEMPLATE",
        templateId,
        payload.template_name,
        "",
        "",
        "",
        `Створено шаблон: ${payload.template_name}`
      );

      res.status(201).json({ template_id: templateId, template: newTemplate });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update template
  app.put("/api/templates/:id", async (req, res) => {
    try {
      const payload = req.body || {};
      const templates = await loadTemplates();
      const index = templates.findIndex((t) => t.template_id === req.params.id);

      if (index === -1) {
        res.status(404).json({ error: "Шаблон не знайдено" });
        return;
      }

      // Validation
      const nameError = validateRequired(payload.template_name, 'template_name', "Назва шаблону обов'язкова");
      if (nameError) {
        res.status(400).json({ error: nameError });
        return;
      }
      const typeError = validateRequired(payload.template_type, 'template_type', "Тип шаблону обов'язковий");
      if (typeError) {
        res.status(400).json({ error: typeError });
        return;
      }

      const oldTemplate = templates[index];

      templates[index] = {
        ...oldTemplate,
        template_name: payload.template_name || oldTemplate.template_name,
        template_type: payload.template_type || oldTemplate.template_type,
        description: payload.description !== undefined ? payload.description : oldTemplate.description,
        is_general: payload.is_general !== undefined ? (payload.is_general === 'yes' ? 'yes' : 'no') : oldTemplate.is_general,
        // Don't allow manual changes to docx_filename, placeholder_fields, active
      };

      await saveTemplates(templates);

      await addLog(
        "UPDATE_TEMPLATE",
        req.params.id,
        payload.template_name,
        "",
        "",
        "",
        `Оновлено шаблон: ${payload.template_name}`
      );

      res.json({ template: templates[index] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete template (soft delete)
  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const templates = await loadTemplates();
      const template = findById(templates, 'template_id', req.params.id);
      const index = templates.findIndex((t) => t.template_id === req.params.id);

      if (index === -1 || !template) {
        res.status(404).json({ error: "Шаблон не знайдено" });
        return;
      }

      // Soft delete: set active='no'
      templates[index].active = 'no';
      await saveTemplates(templates);

      await addLog(
        "DELETE_TEMPLATE",
        req.params.id,
        template.template_name,
        "",
        "",
        "",
        `Видалено шаблон: ${template.template_name}`
      );

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Upload template DOCX file
  app.post("/api/templates/:id/upload", templateUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Файл не надано" });
        return;
      }

      const templates = await loadTemplates();
      const template = findById(templates, 'template_id', req.params.id);

      if (!template) {
        // Clean up uploaded file
        await fsPromises.unlink(req.file.path);
        res.status(404).json({ error: "Шаблон не знайдено" });
        return;
      }

      // Extract placeholders from uploaded DOCX, validate against schema
      const schema = await loadFieldsSchema();
      const { placeholders, unknown } = await extractPlaceholders(req.file.path, schema);

      // Delete old DOCX file if exists
      if (template.docx_filename) {
        const oldFilePath = path.join(FILES_DIR, 'templates', template.docx_filename);
        await fsPromises.unlink(oldFilePath).catch(() => {});
      }

      // Update template record
      template.docx_filename = req.file.filename;
      template.placeholder_fields = placeholders.join(', ');
      await saveTemplates(templates);

      await addLog(
        "UPLOAD_TEMPLATE_FILE",
        req.params.id,
        template.template_name,
        "",
        "",
        "",
        `Завантажено DOCX файл для шаблону: ${template.template_name}, плейсхолдери: ${placeholders.join(', ')}`
      );

      res.json({
        filename: req.file.filename,
        placeholders: placeholders,
        unknown
      });
    } catch (err) {
      console.error(err);
      // Clean up file on error
      if (req.file && req.file.path) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (unlinkErr) {
          console.error('Failed to clean up file:', unlinkErr);
        }
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Open template DOCX file in default application
  app.post("/api/templates/:id/open-file", async (req, res) => {
    try {
      const templates = await loadTemplates();
      const template = templates.find((t) => t.template_id === req.params.id && t.active !== 'no');

      if (!template) {
        res.status(404).json({ error: "Шаблон не знайдено" });
        return;
      }

      if (!template.docx_filename) {
        res.status(400).json({ error: "Шаблон не має завантаженого DOCX файлу" });
        return;
      }

      const filePath = path.join(FILES_DIR, 'templates', template.docx_filename);
      const allowedDir = path.join(FILES_DIR, 'templates');
      const resolvedPath = path.resolve(filePath);

      if (!validatePath(filePath, allowedDir)) {
        res.status(403).json({ error: "Недопустимий шлях до файлу" });
        return;
      }

      if (!fs.existsSync(resolvedPath)) {
        res.status(404).json({ error: "Файл DOCX не найден на диске" });
        return;
      }

      const command = getOpenCommand();
      execFile(command, [resolvedPath], (error) => {
        if (error) {
          console.warn(`Could not open file (expected in headless environments): ${error.message}`);
        }
      });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Re-extract placeholders from template DOCX file
  app.post("/api/templates/:id/reextract", async (req, res) => {
    try {
      const templates = await loadTemplates();
      const template = templates.find((t) => t.template_id === req.params.id && t.active !== 'no');

      if (!template) {
        res.status(404).json({ error: "Шаблон не знайдено" });
        return;
      }

      if (!template.docx_filename) {
        res.status(400).json({ error: "Шаблон не має завантаженого DOCX файлу" });
        return;
      }

      const filePath = path.join(FILES_DIR, 'templates', template.docx_filename);
      const allowedDir = path.join(FILES_DIR, 'templates');
      const resolvedPath = path.resolve(filePath);

      if (!validatePath(filePath, allowedDir)) {
        res.status(403).json({ error: "Недопустимий шлях до файлу" });
        return;
      }

      if (!fs.existsSync(resolvedPath)) {
        res.status(404).json({ error: "Файл DOCX не найден на диске" });
        return;
      }

      const schema = await loadFieldsSchema();
      const { placeholders, unknown } = await extractPlaceholders(resolvedPath, schema);
      template.placeholder_fields = placeholders.join(', ');
      await saveTemplates(templates);

      res.json({ placeholders, unknown });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Generate document from template
  app.post("/api/templates/:id/generate", async (req, res) => {
    try {
      const { employee_id } = req.body;

      // Load template first to check is_general before validating employee_id
      const templates = await loadTemplates();
      const template = findById(templates, 'template_id', req.params.id);

      if (!template) {
        res.status(404).json({ error: "Шаблон не знайдено" });
        return;
      }

      const isGeneral = template.is_general === 'yes';

      // employee_id is required for non-general templates
      if (!employee_id && !isGeneral) {
        res.status(400).json({ error: "employee_id обов'язковий" });
        return;
      }

      // Validate template has DOCX file
      const docxError = validateRequired(template.docx_filename, 'docx_filename', "Шаблон не має завантаженого DOCX файлу");
      if (docxError) {
        res.status(400).json({ error: docxError });
        return;
      }

      // Load employees and schema
      const [employees, schema] = await Promise.all([loadEmployees(), loadFieldsSchema()]);

      // Load employee if employee_id provided
      let employee = null;
      if (employee_id) {
        employee = findById(employees, 'employee_id', employee_id);
        if (!employee) {
          res.status(404).json({ error: "Співробітник не знайдено" });
          return;
        }
      }

      // Build quantity placeholders from all active employees
      const quantities = buildQuantityPlaceholders(schema, employees);

      // Prepare data: quantity placeholders + employee fields (if available)
      // Employee data has higher priority (overrides quantity keys on conflict)
      // Note: special placeholders (current_date, current_datetime) are added by prepareData() in docx-generator.js
      const data = employee
        ? { ...quantities, ...employee }
        : { ...quantities };

      // Generate DOCX filename
      const timestamp = Date.now();
      const sanitizedName = template.template_name.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
      let docxFilename;

      if (employee) {
        // Regular generation with employee: TemplateName_LastName_employeeId_timestamp.docx
        const lastNameField = getFieldNameByRole(schema, ROLES.LAST_NAME) || 'last_name';
        const sanitizedLastName = (employee[lastNameField] || '').replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
        docxFilename = sanitizedLastName
          ? `${sanitizedName}_${sanitizedLastName}_${employee_id}_${timestamp}.docx`
          : `${sanitizedName}_${employee_id}_${timestamp}.docx`;
      } else {
        // General template without employee: TemplateName_timestamp.docx
        docxFilename = `${sanitizedName}_${timestamp}.docx`;
      }

      // Paths with path traversal protection
      const templatePath = path.join(FILES_DIR, 'templates', template.docx_filename);
      const allowedTemplateDir = path.join(FILES_DIR, 'templates');

      if (!validatePath(templatePath, allowedTemplateDir)) {
        res.status(403).json({ error: "Недозволений шлях до шаблону" });
        return;
      }

      const outputPath = path.join(FILES_DIR, 'documents', docxFilename);

      // Check template file exists
      if (!fs.existsSync(templatePath)) {
        res.status(404).json({ error: "DOCX файл шаблону не знайдено на диску" });
        return;
      }

      // Call generateDocx with schema for field_id-based placeholders
      await generateDocx(templatePath, data, outputPath, schema);

      // Build data_snapshot with field_id keys for stability across renames
      const nameToId = buildFieldNameToIdMap(schema);
      const snapshotData = {};
      for (const [key, value] of Object.entries(data)) {
        const fieldId = nameToId.get(key);
        if (fieldId) {
          snapshotData[fieldId] = value;
        }
        // Also keep field_name key for reference
        snapshotData[key] = value;
      }
      // Include mapping for historical reference
      snapshotData._field_mapping = Object.fromEntries(nameToId);

      // Create record in generated_documents.csv atomically with race condition protection
      const newDocId = await addGeneratedDocument({
        template_id: template.template_id,
        employee_id: employee_id || '',
        docx_filename: docxFilename,
        generation_date: new Date().toISOString(),
        generated_by: 'system', // Can be enhanced with user authentication later
        data_snapshot: JSON.stringify(snapshotData)
      });

      // Add audit log
      const employeeName = employee ? buildEmployeeName(employee, schema) : '';
      const logDetail = employee
        ? `Згенеровано документ з шаблону: ${template.template_name}, файл: ${docxFilename}`
        : `Згенеровано загальний документ з шаблону: ${template.template_name}, файл: ${docxFilename}`;
      await addLog(
        "GENERATE_DOCUMENT",
        employee_id || '',
        employeeName,
        "",
        "",
        "",
        logDetail
      );

      // Return response
      res.json({
        document_id: newDocId,
        filename: docxFilename,
        download_url: `/api/documents/${newDocId}/download`
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
