#!/usr/bin/env node

/**
 * Standalone script to sync employees_import_sample.csv with fields_schema.csv
 * Called from run.sh before starting the application
 */

import { initializeEmployeeColumns, syncCSVTemplate } from "./store.js";

async function main() {
  try {
    console.log("🔄 Синхронізація шаблону CSV з fields_schema.csv...");

    // Initialize schema columns first
    await initializeEmployeeColumns();

    // Sync template
    const result = await syncCSVTemplate();

    if (result.status === "up_to_date") {
      console.log("✓ Шаблон актуальний");
      process.exit(0);
    } else if (result.status === "created") {
      console.log("✓ Шаблон створено");
      process.exit(0);
    } else if (result.status === "updated") {
      console.log(`✓ Шаблон оновлено (+${result.added.length} колонок, -${result.removed.length} колонок)`);
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Помилка синхронізації:", error.message);
    process.exit(1);
  }
}

main();
