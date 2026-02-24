import {
  loadFieldsSchema,
  saveFieldsSchema,
  loadEmployees,
  loadTemplates,
  loadLogs,
  DATA_DIR,
  initializeEmployeeColumns,
  acquireEmployeeLock,
  acquireTemplatesLock,
} from "../store.js";
import { runAutoMigration } from "../auto-migrate.js";
import { resetEmployeeColumnsCache } from "../schema.js";
import { addLog } from "../store.js";

export function registerFieldSchemaRoutes(app) {
  /**
   * GET /api/fields-schema/details
   * Returns full schema with impact stats per field.
   */
  app.get("/api/fields-schema/details", async (_req, res) => {
    try {
      const [schema, employees, templates, logs] = await Promise.all([
        loadFieldsSchema(),
        loadEmployees(),
        loadTemplates(),
        loadLogs(),
      ]);

      const activeEmployees = employees.filter(e => e.active !== "no");
      const activeTemplates = templates.filter(t => t.active !== "no");

      const fields = schema.map(field => {
        // Count employees with non-empty value for this field
        const employeeCount = activeEmployees.filter(e => {
          const val = e[field.field_name];
          return val && val.trim() !== "";
        }).length;

        // Count templates using this placeholder (check both field_name and field_id)
        const templateCount = activeTemplates.filter(t => {
          if (!t.placeholder_fields) return false;
          const placeholders = t.placeholder_fields.split(",").map(p => p.trim());
          return placeholders.includes(field.field_name) ||
            (field.field_id && placeholders.includes(field.field_id));
        }).length;

        // Count log entries referencing this field (logs store formatted labels like "Label (field_name)")
        const logCount = logs.filter(l => {
          if (!l.field_name) return false;
          return l.field_name === field.field_name || l.field_name.includes(`(${field.field_name})`);
        }).length;

        return {
          field_id: field.field_id || "",
          field_order: field.field_order || "",
          field_name: field.field_name || "",
          field_label: field.field_label || "",
          field_type: field.field_type || "",
          field_options: field.field_options || "",
          field_group: field.field_group || "",
          show_in_table: field.show_in_table || "",
          editable_in_table: field.editable_in_table || "",
          role: field.role || "",
          impact: {
            employees: employeeCount,
            templates: templateCount,
            logs: logCount,
          },
        };
      });

      res.json({ fields });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/fields-schema/rename-preview
   * Preview the impact of renaming a field.
   */
  app.get("/api/fields-schema/rename-preview", async (req, res) => {
    try {
      const { field_id, new_field_name } = req.query;
      if (!field_id || !new_field_name) {
        return res.status(400).json({ error: "field_id and new_field_name required" });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(new_field_name)) {
        return res.status(400).json({ error: "field_name must contain only letters, digits, and underscores" });
      }

      const schema = await loadFieldsSchema();
      const field = schema.find(f => f.field_id === field_id);
      if (!field) {
        return res.status(404).json({ error: "Field not found" });
      }

      const oldName = field.field_name;
      if (oldName === new_field_name) {
        return res.json({ renames: [], impact: { employees: 0, templates: 0, logs: 0 } });
      }

      // Check for duplicate name
      const duplicate = schema.find(f => f.field_name === new_field_name && f.field_id !== field_id);
      if (duplicate) {
        return res.status(400).json({ error: `Поле з назвою '${new_field_name}' вже існує` });
      }

      const [employees, templates, logs] = await Promise.all([
        loadEmployees(),
        loadTemplates(),
        loadLogs(),
      ]);

      const activeEmployees = employees.filter(e => e.active !== "no");
      const activeTemplates = templates.filter(t => t.active !== "no");

      const employeeRows = activeEmployees.filter(e => {
        const val = e[oldName];
        return val && val.trim() !== "";
      }).length;

      const templateCount = activeTemplates.filter(t => {
        if (!t.placeholder_fields) return false;
        const placeholders = t.placeholder_fields.split(",").map(p => p.trim());
        return placeholders.includes(oldName) ||
          (field.field_id && placeholders.includes(field.field_id));
      }).length;

      const logCount = logs.filter(l => {
        if (!l.field_name) return false;
        return l.field_name === oldName || l.field_name.includes(`(${oldName})`);
      }).length;

      // Build rename list (including _issue_date / _expiry_date for file fields)
      const renames = [{ old: oldName, new: new_field_name }];
      if (field.field_type === "file") {
        renames.push(
          { old: `${oldName}_issue_date`, new: `${new_field_name}_issue_date` },
          { old: `${oldName}_expiry_date`, new: `${new_field_name}_expiry_date` },
        );
      }

      res.json({
        renames,
        impact: {
          employees: employeeRows,
          templates: templateCount,
          logs: logCount,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/fields-schema
   * Update the field schema (rename fields, change labels, reorder).
   * field_id is immutable. Triggers auto-migration for renames.
   */
  app.put("/api/fields-schema", async (req, res) => {
    try {
      const { fields } = req.body;
      if (!Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ error: "fields array required" });
      }

      // Validate
      const names = new Set();
      const ids = new Set();
      for (const field of fields) {
        if (!field.field_id) {
          return res.status(400).json({ error: "field_id is required for each field" });
        }
        if (!/^f_[a-zA-Z0-9_]+$/.test(field.field_id)) {
          return res.status(400).json({ error: `field_id must start with 'f_' and contain only letters, digits, and underscores: ${field.field_id}` });
        }
        if (ids.has(field.field_id)) {
          return res.status(400).json({ error: `Duplicate field_id: ${field.field_id}` });
        }
        ids.add(field.field_id);
        if (!field.field_name || !field.field_name.trim()) {
          return res.status(400).json({ error: `field_name is required (field_id: ${field.field_id})` });
        }
        // field_name must contain only letters, digits, and underscores (valid for CSV headers and DOCX placeholders)
        if (!/^[a-zA-Z0-9_]+$/.test(field.field_name)) {
          return res.status(400).json({ error: `field_name must contain only letters, digits, and underscores (field_id: ${field.field_id})` });
        }
        if (names.has(field.field_name)) {
          return res.status(400).json({ error: `Duplicate field_name: ${field.field_name}` });
        }
        names.add(field.field_name);
      }

      // Load current schema to validate role fields not deleted
      // and EMPLOYEE_ID field_name not renamed (it's a FK in fixed-schema CSVs)
      const currentSchema = await loadFieldsSchema();
      const roleFields = currentSchema.filter(f => f.role && f.role.trim() !== "");
      for (const rf of roleFields) {
        const stillPresent = fields.find(f => f.field_id === rf.field_id);
        if (!stillPresent) {
          return res.status(400).json({ error: `Cannot delete role field: ${rf.field_name} (role: ${rf.role})` });
        }
        // employee_id is used as a foreign key in status_history, reprimands,
        // status_events, generated_documents, and logs CSVs with fixed schemas.
        // Renaming it would break all cross-file joins.
        if (rf.role === "EMPLOYEE_ID" && stillPresent.field_name !== rf.field_name) {
          return res.status(400).json({ error: `Cannot rename employee_id field (used as foreign key in related CSV files)` });
        }
        // photo field has dedicated API endpoints and hardcoded frontend references.
        // Renaming it would break photo upload/display/delete functionality.
        if (rf.role === "PHOTO" && stillPresent.field_name !== rf.field_name) {
          return res.status(400).json({ error: `Cannot rename photo field (used by dedicated photo API endpoints)` });
        }
      }

      // Build updated schema rows preserving field_id and role
      const currentMap = new Map(currentSchema.map(f => [f.field_id, f]));
      const updatedSchema = fields.map(field => {
        const current = currentMap.get(field.field_id) || {};
        return {
          field_id: field.field_id,
          field_order: field.field_order ?? current.field_order ?? "",
          field_name: field.field_name,
          field_label: field.field_label ?? current.field_label ?? "",
          field_type: current.field_type || field.field_type || "text",
          field_options: field.field_options ?? current.field_options ?? "",
          show_in_table: field.show_in_table ?? current.show_in_table ?? "no",
          field_group: field.field_group ?? current.field_group ?? "",
          editable_in_table: field.editable_in_table ?? current.editable_in_table ?? "no",
          role: current.role || "",
        };
      });

      // Save schema
      await saveFieldsSchema(updatedSchema);

      // Derive employee columns from the updated schema for migration.
      // This avoids resetting the global cache before migration completes,
      // preventing a race where concurrent reads see new column names but CSV files still have old ones.
      const sortedForCols = [...updatedSchema]
        .sort((a, b) => parseInt(a.field_order || 0, 10) - parseInt(b.field_order || 0, 10))
        .filter(f => f.field_name && f.field_name.trim() !== "");
      const newEmployeeColumns = [];
      for (const field of sortedForCols) {
        newEmployeeColumns.push(field.field_name);
        if (field.field_type === "file") {
          newEmployeeColumns.push(`${field.field_name}_issue_date`);
          newEmployeeColumns.push(`${field.field_name}_expiry_date`);
        }
      }

      // Run auto-migration and update cache atomically inside locks.
      // During migration, the global cache retains OLD column names → concurrent reads consistent.
      // After migration renames CSV columns, cache is updated to match → consistent.
      // skipTemplateSync: user's schema is authoritative (prevents re-adding deleted fields from template).
      const migrationResult = await acquireEmployeeLock(() =>
        acquireTemplatesLock(async () => {
          const result = await runAutoMigration(DATA_DIR, newEmployeeColumns);
          resetEmployeeColumnsCache();
          await initializeEmployeeColumns({ skipTemplateSync: true });
          return result;
        })
      );

      // Log the changes
      const renameCount = Object.keys(migrationResult.renames).length;
      if (renameCount > 0) {
        const renameList = Object.entries(migrationResult.renames)
          .map(([old, newName]) => `${old} → ${newName}`)
          .join(", ");
        await addLog("UPDATE", "", "", "", "", "", `Schema update: ${renameCount} renames (${renameList})`);
      } else {
        await addLog("UPDATE", "", "", "", "", "", "Schema update: labels/order changed");
      }

      res.json({
        fields: updatedSchema,
        migration: {
          renames: migrationResult.renames,
          renameCount,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
