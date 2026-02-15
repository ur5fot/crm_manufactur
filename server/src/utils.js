import path from "path";
import { execFile } from "child_process";
import { DATA_DIR, FILES_DIR, getEmployeeColumnsSync } from "./store.js";
import { normalizeRows } from "./csv.js";

// Pagination constants
export const DEFAULT_PAGINATION_LIMIT = 50;
export const MAX_PAGINATION_LIMIT = 1000;
export const DEFAULT_PAGINATION_OFFSET = 0;

// Search constants
export const MIN_SEARCH_LENGTH = 2;
export const MAX_SEARCH_LENGTH = 200;
export const MAX_EMPLOYEE_RESULTS = 20;
export const MAX_TEMPLATE_RESULTS = 10;
export const MAX_DOCUMENT_RESULTS = 10;

/**
 * Get platform-specific command to open files/folders
 * @returns {string} Command name (open, explorer, or xdg-open)
 */
export function getOpenCommand() {
  if (process.platform === "darwin") {
    return "open";
  }
  if (process.platform === "win32") {
    return "explorer";
  }
  return "xdg-open";
}

/**
 * Open a folder in the system file manager with security validation
 * @param {string} targetPath - Path to folder to open
 * @returns {Promise<void>}
 * @throws {Error} If path is outside allowed directories
 */
export function openFolder(targetPath) {
  // SECURITY: Validate path is within allowed directories to prevent command injection
  const resolvedPath = path.resolve(targetPath);
  const allowedDirs = [path.resolve(FILES_DIR), path.resolve(DATA_DIR)];

  if (!allowedDirs.some(dir => resolvedPath.startsWith(dir + path.sep) || resolvedPath === dir)) {
    throw new Error('Path outside allowed directories');
  }

  const command = getOpenCommand();
  return new Promise((resolve, reject) => {
    execFile(command, [resolvedPath], (error) => {
      if (error) {
        // Graceful degradation: в headless окружении команда может провалиться
        // но это не критическая ошибка - папка создана, API должен вернуть успех
        console.warn(`Could not open folder in file manager (expected in headless environments): ${error.message}`);
        resolve();
        return;
      }
      resolve();
    });
  });
}

/**
 * Generate next auto-increment ID for a collection
 * @param {Array} items - Collection of items with ID field
 * @param {string} idField - Name of the ID field
 * @returns {string} Next ID as string
 */
export function getNextId(items, idField) {
  if (items.length === 0) {
    return "1";
  }
  const ids = items
    .map((item) => parseInt(item[idField], 10))
    .filter((id) => !isNaN(id));
  if (ids.length === 0) {
    return "1";
  }
  // Use reduce to avoid stack overflow with large arrays (Math.max spread has ~65k argument limit)
  const maxId = ids.reduce((max, id) => Math.max(max, id), 0);
  return String(maxId + 1);
}

/**
 * Normalize employee input payload to match schema
 * @param {Object} payload - Raw employee data
 * @returns {Object} Normalized employee object
 */
export function normalizeEmployeeInput(payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  return normalizeRows(getEmployeeColumnsSync(), [input])[0];
}

/**
 * Validate required field presence
 * @param {string|undefined|null} value - Field value
 * @param {string} fieldName - Field name for error message
 * @param {string} errorMessage - Error message in Ukrainian
 * @returns {string|null} Error message or null if valid
 */
export function validateRequired(value, fieldName, errorMessage) {
  if (!value || !String(value).trim()) {
    return errorMessage;
  }
  return null;
}

/**
 * Validate and sanitize pagination parameters
 * @param {string|number} offset - Offset parameter
 * @param {string|number} limit - Limit parameter
 * @returns {{offset: number, limit: number}} Validated pagination params
 */
export function validatePagination(offset, limit) {
  const offsetNum = parseInt(offset, 10) || DEFAULT_PAGINATION_OFFSET;
  const limitNum = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_PAGINATION_LIMIT, 1),
    MAX_PAGINATION_LIMIT
  );

  if (offsetNum < 0 || isNaN(offsetNum)) {
    throw new Error('Invalid offset parameter');
  }

  return { offset: offsetNum, limit: limitNum };
}

/**
 * Validate path is within allowed directory (prevents path traversal)
 * @param {string} filePath - Path to validate
 * @param {string} allowedDir - Allowed base directory
 * @returns {boolean} True if path is safe
 */
export function validatePath(filePath, allowedDir) {
  const resolvedPath = path.resolve(filePath);
  const resolvedAllowedDir = path.resolve(allowedDir);
  return resolvedPath.startsWith(resolvedAllowedDir + path.sep) || resolvedPath === resolvedAllowedDir;
}

/**
 * Find entity by ID from collection
 * @param {Array} items - Collection to search
 * @param {string} idField - Name of ID field
 * @param {string} idValue - ID value to find
 * @returns {Object|undefined} Found item or undefined
 */
export function findById(items, idField, idValue) {
  return items.find(item => item[idField] === idValue);
}

/**
 * Build full name from employee name parts
 * @param {Object} employee - Employee object with name fields
 * @returns {string} Full name (last first middle)
 */
export function buildFullName(employee) {
  return [employee.last_name, employee.first_name, employee.middle_name]
    .filter(Boolean)
    .join(" ");
}
