/**
 * Auto-migration: detects field_name renames in fields_schema.csv
 * by comparing against a saved field_mapping.csv snapshot, and propagates
 * column renames across all CSV data files.
 *
 * Called during server startup, before route registration.
 */

import fs from "fs/promises";
import path from "path";
import { readCsv, writeCsv } from "./csv.js";
import { FIELD_SCHEMA_COLUMNS, FIELD_MAPPING_COLUMNS, LOG_COLUMNS } from "./schema.js";

/**
 * Run auto-migration to detect and apply field_name renames.
 *
 * Algorithm:
 * 1. Load fields_schema.csv → Map<field_id, current_field_name>
 * 2. Load field_mapping.csv → Map<field_id, previous_field_name>
 * 3. If field_mapping.csv doesn't exist: create it from current schema, return
 * 4. Compare: for each field_id, check if field_name changed
 * 5. If renames detected, apply to all CSV files
 * 6. Save updated field_mapping.csv
 *
 * @param {string} dataDir - Path to the data/ directory
 * @param {string[]} [employeeColumns] - Current employee columns (for employees.csv migration).
 *   If not provided, columns are derived from current schema.
 */
export async function runAutoMigration(dataDir, employeeColumns) {
  const schemaPath = path.join(dataDir, "fields_schema.csv");
  const mappingPath = path.join(dataDir, "field_mapping.csv");

  // 1. Load current schema
  let schema;
  try {
    schema = await readCsv(schemaPath, FIELD_SCHEMA_COLUMNS);
  } catch (err) {
    console.error("auto-migrate: Cannot read fields_schema.csv:", err.message);
    return { renames: {}, created: false };
  }

  if (schema.length === 0) {
    console.log("auto-migrate: fields_schema.csv is empty, skipping");
    return { renames: {}, created: false };
  }

  // Build current mapping: field_id → field_name (skip entries without field_id)
  const currentMapping = new Map();
  for (const field of schema) {
    if (field.field_id && field.field_name) {
      currentMapping.set(field.field_id, field.field_name);
    }
  }

  // 2. Load previous mapping
  let previousMapping;
  let mappingExists = true;
  try {
    await fs.access(mappingPath);
  } catch {
    mappingExists = false;
  }

  if (!mappingExists) {
    // 3. First run — create field_mapping.csv from current schema
    const rows = [];
    for (const [fieldId, fieldName] of currentMapping) {
      rows.push({ field_id: fieldId, field_name: fieldName });
    }
    await writeCsv(mappingPath, FIELD_MAPPING_COLUMNS, rows);
    console.log(`auto-migrate: Created field_mapping.csv with ${rows.length} entries (first run)`);
    return { renames: {}, created: true };
  }

  // Load existing mapping
  const mappingRows = await readCsv(mappingPath, FIELD_MAPPING_COLUMNS);
  previousMapping = new Map();
  for (const row of mappingRows) {
    if (row.field_id && row.field_name) {
      previousMapping.set(row.field_id, row.field_name);
    }
  }

  // 4. Detect renames: field_id exists in both, but field_name differs
  const renames = {}; // old_field_name → new_field_name
  for (const [fieldId, currentName] of currentMapping) {
    const previousName = previousMapping.get(fieldId);
    if (previousName && previousName !== currentName) {
      renames[previousName] = currentName;
    }
  }

  if (Object.keys(renames).length === 0) {
    // No renames detected — but still update mapping in case new fields were added
    const rows = [];
    for (const [fieldId, fieldName] of currentMapping) {
      rows.push({ field_id: fieldId, field_name: fieldName });
    }
    await writeCsv(mappingPath, FIELD_MAPPING_COLUMNS, rows);
    return { renames: {}, created: false };
  }

  // 5. Expand renames: for file-type fields, also rename _issue_date and _expiry_date columns
  const expandedRenames = { ...renames };
  const fileFields = schema.filter(f => f.field_type === "file");
  const fileFieldIds = new Set(fileFields.map(f => f.field_id));

  for (const [fieldId, currentName] of currentMapping) {
    const previousName = previousMapping.get(fieldId);
    if (previousName && previousName !== currentName && fileFieldIds.has(fieldId)) {
      // Auto-generate _issue_date and _expiry_date column renames
      expandedRenames[`${previousName}_issue_date`] = `${currentName}_issue_date`;
      expandedRenames[`${previousName}_expiry_date`] = `${currentName}_expiry_date`;
    }
  }

  console.log(`auto-migrate: Detected ${Object.keys(renames).length} field rename(s):`);
  for (const [oldName, newName] of Object.entries(expandedRenames)) {
    console.log(`  ${oldName} → ${newName}`);
  }

  // Apply renames to CSV files
  await renameEmployeesCsv(path.join(dataDir, "employees.csv"), expandedRenames, employeeColumns);
  await renameEmployeesCsv(path.join(dataDir, "employees_remote.csv"), expandedRenames, employeeColumns);
  await renameTemplatesPlaceholders(path.join(dataDir, "templates.csv"), renames);
  await renameLogsFieldName(path.join(dataDir, "logs.csv"), renames);

  // 6. Save updated field_mapping.csv
  const rows = [];
  for (const [fieldId, fieldName] of currentMapping) {
    rows.push({ field_id: fieldId, field_name: fieldName });
  }
  await writeCsv(mappingPath, FIELD_MAPPING_COLUMNS, rows);
  console.log("auto-migrate: Updated field_mapping.csv");

  return { renames: expandedRenames, created: false };
}

/**
 * Rename columns in employees.csv or employees_remote.csv.
 * Reads the file with raw headers, renames matching columns, writes back.
 */
async function renameEmployeesCsv(filePath, renames, employeeColumns) {
  try {
    await fs.access(filePath);
  } catch {
    return; // File doesn't exist, skip
  }

  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());
  if (lines.length === 0) return;

  // Parse header
  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const currentColumns = headerLine.split(";").map(col => col.trim().replace(/^"|"$/g, ""));

  // Check if any column needs renaming
  const hasRenames = currentColumns.some(col => renames[col]);
  if (!hasRenames) return;

  // Rename columns in header
  const newColumns = currentColumns.map(col => renames[col] || col);

  // Read data with old columns
  const { parse } = await import("csv-parse/sync");
  const records = parse(content, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true
  });

  // Rename keys in each record
  const renamedRecords = records.map(record => {
    const renamed = {};
    for (const [key, value] of Object.entries(record)) {
      const newKey = renames[key] || key;
      renamed[newKey] = value;
    }
    return renamed;
  });

  // Determine final columns: if employeeColumns provided, use that (includes all expected columns)
  // Otherwise use the renamed headers from the file
  const finalColumns = employeeColumns || newColumns;

  await writeCsv(filePath, finalColumns, renamedRecords);

  const renamedCount = currentColumns.filter(col => renames[col]).length;
  console.log(`auto-migrate: Renamed ${renamedCount} column(s) in ${path.basename(filePath)} (${renamedRecords.length} rows)`);
}

/**
 * Update placeholder_fields in templates.csv: replace old field names with new ones.
 */
async function renameTemplatesPlaceholders(filePath, renames) {
  const TEMPLATE_COLUMNS = [
    "template_id",
    "template_name",
    "template_type",
    "docx_filename",
    "placeholder_fields",
    "description",
    "created_date",
    "active"
  ];

  try {
    await fs.access(filePath);
  } catch {
    return; // File doesn't exist, skip
  }

  const templates = await readCsv(filePath, TEMPLATE_COLUMNS);
  if (templates.length === 0) return;

  let changed = false;
  for (const template of templates) {
    if (!template.placeholder_fields) continue;

    const placeholders = template.placeholder_fields.split(",").map(p => p.trim());
    const updatedPlaceholders = placeholders.map(p => renames[p] || p);
    const newValue = updatedPlaceholders.join(",");

    if (newValue !== template.placeholder_fields) {
      template.placeholder_fields = newValue;
      changed = true;
    }
  }

  if (changed) {
    await writeCsv(filePath, TEMPLATE_COLUMNS, templates);
    console.log(`auto-migrate: Updated placeholder_fields in templates.csv`);
  }
}

/**
 * Update field_name column in logs.csv: replace old field names with new ones.
 */
async function renameLogsFieldName(filePath, renames) {
  try {
    await fs.access(filePath);
  } catch {
    return; // File doesn't exist, skip
  }

  const logs = await readCsv(filePath, LOG_COLUMNS);
  if (logs.length === 0) return;

  let changed = false;
  for (const log of logs) {
    if (log.field_name && renames[log.field_name]) {
      log.field_name = renames[log.field_name];
      changed = true;
    }
  }

  if (changed) {
    await writeCsv(filePath, LOG_COLUMNS, logs);
    console.log(`auto-migrate: Updated field_name references in logs.csv`);
  }
}
