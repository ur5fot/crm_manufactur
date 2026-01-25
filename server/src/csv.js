import fs from "fs/promises";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const DELIMITER = ";";
const RECORD_DELIMITER = "\r\n";
const UTF8_BOM = "\uFEFF"; // Byte Order Mark для корректного отображения в Excel

export async function ensureCsvFile(filePath, columns) {
  try {
    await fs.access(filePath);
  } catch (error) {
    const header = UTF8_BOM + columns.join(DELIMITER) + RECORD_DELIMITER;
    await fs.writeFile(filePath, header, "utf8");
  }
}

function normalizeRow(columns, row) {
  const normalized = {};
  for (const column of columns) {
    const value = row?.[column];
    normalized[column] = value === undefined || value === null ? "" : String(value);
  }
  return normalized;
}

export async function readCsv(filePath, columns) {
  await ensureCsvFile(filePath, columns);
  const content = await fs.readFile(filePath, "utf8");
  if (!content.trim()) {
    return [];
  }

  const records = parse(content, {
    columns: true,
    delimiter: DELIMITER,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true
  });

  return records.map((row) => normalizeRow(columns, row));
}

export async function writeCsv(filePath, columns, rows) {
  await ensureCsvFile(filePath, columns);
  const normalized = rows.map((row) => normalizeRow(columns, row));

  const output = stringify(normalized, {
    header: true,
    columns,
    delimiter: DELIMITER,
    record_delimiter: RECORD_DELIMITER
  });

  // Добавляем BOM для корректного отображения кириллицы в Excel
  await fs.writeFile(filePath, UTF8_BOM + output, "utf8");
}

export function normalizeRows(columns, rows) {
  return rows.map((row) => normalizeRow(columns, row));
}

export function mergeRow(columns, current, updates) {
  const merged = { ...current };
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(updates, column)) {
      const value = updates[column];
      merged[column] = value === undefined || value === null ? "" : String(value);
    }
  }
  return normalizeRow(columns, merged);
}
