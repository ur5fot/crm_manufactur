#!/usr/bin/env node

/**
 * One-time migration script: adds field_id and role columns to fields_schema.csv.
 *
 * Safe to run multiple times (idempotent):
 * - If field_id column already exists, migration is skipped.
 * - If fields_schema.csv does not exist, migration is skipped
 *   (run.sh copies from template first).
 *
 * Called from run.sh after sync-template.js and before server start.
 */

import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const DELIMITER = ";";
const RECORD_DELIMITER = "\r\n";
const UTF8_BOM = "\uFEFF";

const DATA_DIR = path.resolve(new URL(".", import.meta.url).pathname, "../../data");
const SCHEMA_PATH = path.join(DATA_DIR, "fields_schema.csv");
const MAPPING_PATH = path.join(DATA_DIR, "field_mapping.csv");

// Role assignments: field_name -> role (only for critical fields)
const ROLE_MAP = {
  photo: "PHOTO",
  employee_id: "EMPLOYEE_ID",
  last_name: "LAST_NAME",
  first_name: "FIRST_NAME",
  middle_name: "MIDDLE_NAME",
  birth_date: "BIRTH_DATE",
  gender: "GENDER",
  employment_status: "STATUS",
  status_start_date: "STATUS_START",
  status_end_date: "STATUS_END",
  grade: "GRADE",
  position: "POSITION",
  indeclinable_name: "INDECL_NAME",
  indeclinable_first_name: "INDECL_FIRST",
  indeclinable_grade: "INDECL_GRADE",
  indeclinable_position: "INDECL_POSITION",
};

/**
 * Run migration on a parsed schema array.
 * Returns { migrated: boolean, schema: Array, summary: string }
 */
export function migrateSchema(rows) {
  // Check if field_id column already present (non-empty on at least one row)
  const hasFieldId = rows.some(r => r.field_id && r.field_id.trim() !== "");
  if (hasFieldId) {
    return { migrated: false, schema: rows, summary: "field_id already present — skipped" };
  }

  let rolesAssigned = 0;
  const migrated = rows.map(row => {
    const fieldName = row.field_name || "";
    const fieldId = fieldName ? `f_${fieldName}` : "";
    const role = ROLE_MAP[fieldName] || "";
    if (role) rolesAssigned++;
    return { ...row, field_id: fieldId, role };
  });

  return {
    migrated: true,
    schema: migrated,
    summary: `Migrated ${migrated.length} fields: added field_id, assigned ${rolesAssigned} roles`,
  };
}

/**
 * Write field_mapping.csv snapshot.
 */
async function writeFieldMapping(schema) {
  const mappingColumns = ["field_id", "field_name", "role"];
  const mappingRows = schema
    .filter(r => r.field_id)
    .map(r => ({
      field_id: r.field_id,
      field_name: r.field_name,
      role: r.role || "",
    }));

  const output = stringify(mappingRows, {
    header: true,
    columns: mappingColumns,
    delimiter: DELIMITER,
    record_delimiter: RECORD_DELIMITER,
  });
  await fs.writeFile(MAPPING_PATH, UTF8_BOM + output, "utf8");
}

async function main() {
  // Check if fields_schema.csv exists
  try {
    await fs.access(SCHEMA_PATH);
  } catch {
    console.log("⏭  fields_schema.csv not found — skipping migration");
    process.exit(0);
  }

  // Read existing schema
  const content = await fs.readFile(SCHEMA_PATH, "utf8");
  if (!content.trim()) {
    console.log("⏭  fields_schema.csv is empty — skipping migration");
    process.exit(0);
  }

  const rows = parse(content, {
    columns: true,
    delimiter: DELIMITER,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

  const result = migrateSchema(rows);

  if (!result.migrated) {
    console.log(`✓ ${result.summary}`);
    process.exit(0);
  }

  // Write updated schema with field_id and role columns
  const columns = Object.keys(result.schema[0] || {});
  // Ensure field_id is first and role is last
  const orderedColumns = [
    "field_id",
    ...columns.filter(c => c !== "field_id" && c !== "role"),
    "role",
  ];

  const output = stringify(result.schema, {
    header: true,
    columns: orderedColumns,
    delimiter: DELIMITER,
    record_delimiter: RECORD_DELIMITER,
  });
  await fs.writeFile(SCHEMA_PATH, UTF8_BOM + output, "utf8");

  // Write field_mapping.csv
  await writeFieldMapping(result.schema);

  console.log(`✓ ${result.summary}`);
  process.exit(0);
}

// Only run main when executed directly (not imported for testing)
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isDirectRun) {
  main().catch(err => {
    console.error("❌ Migration error:", err.message);
    process.exit(1);
  });
}
