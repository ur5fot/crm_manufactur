import multer from "multer";
import path from "path";
import fs from "fs";
import { FILES_DIR } from "./store.js";

export function createImportUpload(appConfig) {
  const maxSizeMB = parseInt(appConfig.max_file_upload_mb, 10);
  const fileSize = (isNaN(maxSizeMB) || maxSizeMB <= 0) ? 10 : maxSizeMB;
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: fileSize * 1024 * 1024 }
  });
}

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

export function createEmployeeFileUpload(appConfig) {
  const maxSizeMB = parseInt(appConfig.max_file_upload_mb, 10);
  const fileSize = (isNaN(maxSizeMB) || maxSizeMB <= 0) ? 10 : maxSizeMB;

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const employeeId = req.params.id;
      const targetDir = path.join(FILES_DIR, `employee_${employeeId}`);
      fs.mkdir(targetDir, { recursive: true }, (error) => {
        cb(error, targetDir);
      });
    },
    filename: (req, file, cb) => {
      // Используем временное имя, потому что req.body еще не доступен
      const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
      const tempName = `temp_${Date.now()}${ext}`;
      cb(null, tempName);
    }
  });

  return multer({
    storage,
    limits: { fileSize: fileSize * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ALLOWED_FILE_EXTENSIONS.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Дозволені лише файли PDF та зображення (jpg, png, gif, webp)"));
      }
    }
  });
}

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export function createPhotoUpload(appConfig) {
  const maxSizeMB = parseInt(appConfig.max_file_upload_mb, 10);
  const fileSize = (isNaN(maxSizeMB) || maxSizeMB <= 0) ? 10 : maxSizeMB;

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const employeeId = req.params.id;
      const targetDir = path.join(FILES_DIR, `employee_${employeeId}`);
      const resolved = path.resolve(targetDir);
      if (!resolved.startsWith(path.resolve(FILES_DIR) + path.sep)) {
        return cb(new Error("Недозволений шлях"));
      }
      fs.mkdir(targetDir, { recursive: true }, (error) => {
        cb(error, targetDir);
      });
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `photo${ext}`);
    }
  });

  return multer({
    storage,
    limits: { fileSize: fileSize * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext) || !file.mimetype.startsWith('image/')) {
        cb(new Error("Дозволені лише зображення (jpg, png, gif, webp)"));
      } else {
        cb(null, true);
      }
    }
  });
}

export function createTemplateUpload(appConfig) {
  const maxSizeMB = parseInt(appConfig.max_file_upload_mb, 10);
  const fileSize = (isNaN(maxSizeMB) || maxSizeMB <= 0) ? 10 : maxSizeMB;

  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const templatesDir = path.join(FILES_DIR, 'templates');
        fs.mkdir(templatesDir, { recursive: true }, (error) => {
          cb(error, templatesDir);
        });
      },
      filename: (req, file, cb) => {
        const templateId = req.params.id;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `template_${templateId}_${timestamp}${ext}`);
      }
    }),
    limits: { fileSize: fileSize * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== '.docx') {
        cb(new Error('Тільки DOCX файли дозволені'));
        return;
      }
      cb(null, true);
    }
  });
}
