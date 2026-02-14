import path from "path";
import { execFile } from "child_process";
import { DATA_DIR, FILES_DIR, getEmployeeColumnsSync } from "./store.js";
import { normalizeRows } from "./csv.js";

export function getOpenCommand() {
  if (process.platform === "darwin") {
    return "open";
  }
  if (process.platform === "win32") {
    return "explorer";
  }
  return "xdg-open";
}

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

export function normalizeEmployeeInput(payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  return normalizeRows(getEmployeeColumnsSync(), [input])[0];
}
