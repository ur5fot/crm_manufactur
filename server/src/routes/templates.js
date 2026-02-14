import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { execFile } from "child_process";
import {
  FILES_DIR,
  loadEmployees,
  loadTemplates,
  saveTemplates,
  addGeneratedDocument,
  addLog
} from "../store.js";
import { extractPlaceholders, generateDocx } from "../docx-generator.js";
import { getOpenCommand, getNextId } from "../utils.js";
import { createTemplateUpload } from "../upload-config.js";

export function registerTemplateRoutes(app, appConfig) {
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

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const templates = await loadTemplates();
      const template = templates.find((t) => t.template_id === req.params.id);
      if (!template) {
        res.status(404).json({ error: "Шаблон не найден" });
        return;
      }
      res.json({ template });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const payload = req.body || {};
      const templates = await loadTemplates();

      // Validation
      if (!payload.template_name || !payload.template_name.trim()) {
        res.status(400).json({ error: "Назва шаблону обов'язкова" });
        return;
      }
      if (!payload.template_type || !payload.template_type.trim()) {
        res.status(400).json({ error: "Тип шаблону обов'язковий" });
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
        active: 'yes'
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

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const payload = req.body || {};
      const templates = await loadTemplates();
      const index = templates.findIndex((t) => t.template_id === req.params.id);

      if (index === -1) {
        res.status(404).json({ error: "Шаблон не найден" });
        return;
      }

      // Validation
      if (!payload.template_name || !payload.template_name.trim()) {
        res.status(400).json({ error: "Назва шаблону обов'язкова" });
        return;
      }
      if (!payload.template_type || !payload.template_type.trim()) {
        res.status(400).json({ error: "Тип шаблону обов'язковий" });
        return;
      }

      const oldTemplate = templates[index];

      templates[index] = {
        ...oldTemplate,
        template_name: payload.template_name || oldTemplate.template_name,
        template_type: payload.template_type || oldTemplate.template_type,
        description: payload.description !== undefined ? payload.description : oldTemplate.description,
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

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const templates = await loadTemplates();
      const index = templates.findIndex((t) => t.template_id === req.params.id);

      if (index === -1) {
        res.status(404).json({ error: "Шаблон не найден" });
        return;
      }

      // Soft delete: set active='no'
      templates[index].active = 'no';
      await saveTemplates(templates);

      await addLog(
        "DELETE_TEMPLATE",
        req.params.id,
        templates[index].template_name,
        "",
        "",
        "",
        `Видалено шаблон: ${templates[index].template_name}`
      );

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  const templateUpload = createTemplateUpload(appConfig);

  app.post("/api/templates/:id/upload", templateUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Файл не надано" });
        return;
      }

      const templates = await loadTemplates();
      const template = templates.find((t) => t.template_id === req.params.id);

      if (!template) {
        // Clean up uploaded file
        await fsPromises.unlink(req.file.path);
        res.status(404).json({ error: "Шаблон не найден" });
        return;
      }

      // Extract placeholders from uploaded DOCX
      const placeholders = await extractPlaceholders(req.file.path);

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
        placeholders: placeholders
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
        res.status(404).json({ error: "Шаблон не найден" });
        return;
      }

      if (!template.docx_filename) {
        res.status(400).json({ error: "Шаблон не имеет загруженного DOCX файла" });
        return;
      }

      const filePath = path.join(FILES_DIR, 'templates', template.docx_filename);
      const resolvedPath = path.resolve(filePath);
      const allowedDir = path.resolve(path.join(FILES_DIR, 'templates'));

      if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
        res.status(403).json({ error: "Недопустимый путь к файлу" });
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
        res.status(404).json({ error: "Шаблон не найден" });
        return;
      }

      if (!template.docx_filename) {
        res.status(400).json({ error: "Шаблон не имеет загруженного DOCX файла" });
        return;
      }

      const filePath = path.join(FILES_DIR, 'templates', template.docx_filename);
      const resolvedPath = path.resolve(filePath);
      const allowedDir = path.resolve(path.join(FILES_DIR, 'templates'));

      if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
        res.status(403).json({ error: "Недопустимый путь к файлу" });
        return;
      }

      if (!fs.existsSync(resolvedPath)) {
        res.status(404).json({ error: "Файл DOCX не найден на диске" });
        return;
      }

      const placeholders = await extractPlaceholders(resolvedPath);
      template.placeholder_fields = placeholders.join(', ');
      await saveTemplates(templates);

      res.json({ placeholders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Generate document from template
  app.post("/api/templates/:id/generate", async (req, res) => {
    try {
      const { employee_id } = req.body;

      if (!employee_id) {
        res.status(400).json({ error: "employee_id обов'язковий" });
        return;
      }

      // Load template
      const templates = await loadTemplates();
      const template = templates.find((t) => t.template_id === req.params.id);

      if (!template) {
        res.status(404).json({ error: "Шаблон не знайдено" });
        return;
      }

      // Validate template has DOCX file
      if (!template.docx_filename) {
        res.status(400).json({ error: "Шаблон не має завантаженого DOCX файлу" });
        return;
      }

      // Load employee data
      const employees = await loadEmployees();
      const employee = employees.find((e) => e.employee_id === employee_id);

      if (!employee) {
        res.status(404).json({ error: "Співробітник не знайдено" });
        return;
      }

      // Prepare data with employee fields + special placeholders
      const now = new Date();
      const currentDate = now.toLocaleDateString('uk-UA'); // DD.MM.YYYY format
      const currentDateTime = now.toLocaleString('uk-UA'); // DD.MM.YYYY HH:mm:ss format

      const data = {
        ...employee,
        current_date: currentDate,
        current_datetime: currentDateTime
      };

      // Generate DOCX filename
      const timestamp = Date.now();
      const sanitizedName = template.template_name.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
      const sanitizedLastName = (employee.last_name || '').replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
      const docxFilename = sanitizedLastName
        ? `${sanitizedName}_${sanitizedLastName}_${employee_id}_${timestamp}.docx`
        : `${sanitizedName}_${employee_id}_${timestamp}.docx`;

      // Paths with path traversal protection
      const templatePath = path.join(FILES_DIR, 'templates', template.docx_filename);
      const resolvedTemplatePath = path.resolve(templatePath);
      const allowedTemplateDir = path.resolve(FILES_DIR, 'templates');

      if (!resolvedTemplatePath.startsWith(allowedTemplateDir + path.sep)) {
        res.status(403).json({ error: "Недозволений шлях до шаблону" });
        return;
      }

      const outputPath = path.join(FILES_DIR, 'documents', docxFilename);

      // Check template file exists
      if (!fs.existsSync(templatePath)) {
        res.status(404).json({ error: "DOCX файл шаблону не знайдено на диску" });
        return;
      }

      // Call generateDocx
      await generateDocx(templatePath, data, outputPath);

      // Create record in generated_documents.csv atomically with race condition protection
      const newDocId = await addGeneratedDocument({
        template_id: template.template_id,
        employee_id: employee_id,
        docx_filename: docxFilename,
        generation_date: new Date().toISOString(),
        generated_by: 'system', // Can be enhanced with user authentication later
        data_snapshot: JSON.stringify(data)
      });

      // Add audit log
      await addLog(
        "GENERATE_DOCUMENT",
        employee_id,
        `${employee.last_name || ''} ${employee.first_name || ''}`.trim(),
        "",
        "",
        "",
        `Згенеровано документ з шаблону: ${template.template_name}, файл: ${docxFilename}`
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
