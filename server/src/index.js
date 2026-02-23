import express from "express";
import cors from "cors";
import {
  ensureDataDirs,
  DATA_DIR,
  FILES_DIR,
  initializeEmployeeColumns,
  loadConfig
} from "./store.js";
import { runAutoMigration } from "./auto-migrate.js";
import { getCachedEmployeeColumns } from "./schema.js";
import { createImportUpload, createEmployeeFileUpload, createPhotoUpload } from "./upload-config.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerEmployeeRoutes } from "./routes/employees.js";
import { registerEmployeeFileRoutes } from "./routes/employee-files.js";
import { registerTemplateRoutes } from "./routes/templates.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import { registerLogRoutes } from "./routes/logs.js";
import { registerMiscRoutes } from "./routes/misc.js";
import { registerFieldSchemaRoutes } from "./routes/field-schema.js";

const app = express();
const port = process.env.PORT || 3000;

await ensureDataDirs();
await initializeEmployeeColumns();

// Run auto-migration: detect field_name renames and propagate across CSV files
await runAutoMigration(DATA_DIR, getCachedEmployeeColumns());

// Load configuration with fallback
let appConfig;
try {
  appConfig = await loadConfig();
  console.log(`Max file upload size: ${appConfig.max_file_upload_mb || 10}MB`);
} catch (err) {
  console.error('Failed to load config.csv, using default values:', err.message);
  appConfig = {
    max_file_upload_mb: 10,
    retirement_age_years: 60,
    max_log_entries: 1000,
    max_report_preview_rows: 100
  };
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/files", express.static(FILES_DIR));
// SECURITY: DATA_DIR static serving removed - sensitive CSV files should not be publicly accessible
// app.use("/data", express.static(DATA_DIR));

const importUpload = createImportUpload(appConfig);
const employeeFileUpload = createEmployeeFileUpload(appConfig);
const photoUpload = createPhotoUpload(appConfig);

// Register dashboard and config routes
registerDashboardRoutes(app);

// Register report and export routes
registerReportRoutes(app);

// Register employee CRUD routes
registerEmployeeRoutes(app);

// Register employee file and import routes
registerEmployeeFileRoutes(app, importUpload, employeeFileUpload, photoUpload);

// Register template routes
registerTemplateRoutes(app, appConfig);

// Register document history routes
registerDocumentRoutes(app);

// Register log routes
registerLogRoutes(app);

// Register miscellaneous routes (schema, search, placeholder preview, open folder)
registerMiscRoutes(app);

// Register field schema management routes
registerFieldSchemaRoutes(app);

app.listen(port, () => {
  console.log(`CRM server running on http://localhost:${port}`);
});
