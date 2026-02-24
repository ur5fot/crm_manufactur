import path from "path";
import fs from "fs";
import { FILES_DIR } from "../store.js";
import { loadGeneratedDocuments, loadTemplates, loadEmployees, loadFieldsSchema } from "../store.js";
import { validatePagination, validatePath, findById, buildFullName } from "../utils.js";

export function registerDocumentRoutes(app) {
  // Get list of generated documents with filtering and pagination
  app.get("/api/documents", async (req, res) => {
    try {
      const { template_id, employee_id, start_date, end_date, offset = '0', limit = '50' } = req.query;

      // Load all data sources
      const documents = await loadGeneratedDocuments();
      const templates = await loadTemplates();
      const employees = await loadEmployees();
      const schema = await loadFieldsSchema();

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
      let paginationParams;
      try {
        paginationParams = validatePagination(offset, limit);
      } catch (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      const { offset: offsetNum, limit: limitNum } = paginationParams;

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
            ? buildFullName(employee, schema)
            : 'Невідомий співробітник',
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
      const document = findById(documents, 'document_id', req.params.id);

      if (!document) {
        res.status(404).json({ error: "Документ не знайдено" });
        return;
      }

      // SECURITY: Sanitize filename from database before using in path
      // Prevents path traversal if CSV is manually edited with malicious filename
      const sanitizedFilename = document.docx_filename.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ._-]/g, '_');

      // Validate file exists and prevent path traversal
      const filePath = path.join(FILES_DIR, 'documents', sanitizedFilename);
      const allowedDir = path.join(FILES_DIR, 'documents');

      if (!validatePath(filePath, allowedDir)) {
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
}
