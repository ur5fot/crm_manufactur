import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { readCsv, writeCsv } from "./csv.js";
import { DICTIONARY_COLUMNS, EMPLOYEE_COLUMNS } from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const FILES_DIR = path.join(ROOT_DIR, "files");

const EMPLOYEES_PATH = path.join(DATA_DIR, "employees.csv");
const DICTIONARIES_PATH = path.join(DATA_DIR, "dictionaries.csv");

export async function ensureDataDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(FILES_DIR, { recursive: true });
}

export async function loadEmployees() {
  return readCsv(EMPLOYEES_PATH, EMPLOYEE_COLUMNS);
}

export async function saveEmployees(rows) {
  return writeCsv(EMPLOYEES_PATH, EMPLOYEE_COLUMNS, rows);
}

export async function loadDictionaries() {
  return readCsv(DICTIONARIES_PATH, DICTIONARY_COLUMNS);
}

export async function saveDictionaries(rows) {
  return writeCsv(DICTIONARIES_PATH, DICTIONARY_COLUMNS, rows);
}
