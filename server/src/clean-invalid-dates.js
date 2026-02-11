#!/usr/bin/env node
/**
 * Очистка невалидных дат в employees.csv
 *
 * Проблема: В CSV файле в некоторых полях дат записаны имена сотрудников
 * вместо дат (например, "Тестовий співробітник 1" в insurance_file_expiry_date).
 *
 * Решение: Проходим по всем полям типа date и очищаем значения которые
 * не соответствуют формату YYYY-MM-DD.
 */

import { loadEmployees, saveEmployees, getEmployeeColumnsSync, initializeEmployeeColumns } from "./store.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

async function cleanInvalidDates() {
  console.log("🧹 Начинаем очистку невалидных дат в employees.csv...\n");

  // Инициализация колонок
  await initializeEmployeeColumns();

  // Загрузка сотрудников
  const employees = await loadEmployees();
  console.log(`📋 Загружено сотрудников: ${employees.length}\n`);

  // Находим все поля с датами
  const dateFields = getEmployeeColumnsSync().filter(col =>
    col.includes('_date') || col === 'birth_date'
  );

  console.log(`📅 Найдено полей дат: ${dateFields.length}`);
  console.log(`   Поля: ${dateFields.slice(0, 5).join(', ')}...\n`);

  let totalCleaned = 0;
  const cleanedByField = {};

  // Проходим по всем сотрудникам и очищаем невалидные даты
  employees.forEach((emp, idx) => {
    dateFields.forEach(field => {
      const value = String(emp[field] || "").trim();

      // Пропускаем пустые значения
      if (!value) return;

      // Проверяем формат даты
      if (!dateRegex.test(value)) {
        console.log(`⚠️  Строка ${idx + 2}, поле "${field}": "${value}" (невалидная дата) → очищено`);
        emp[field] = "";
        totalCleaned++;
        cleanedByField[field] = (cleanedByField[field] || 0) + 1;
      } else {
        // Проверяем что дата существует (не Feb 30 и т.д.)
        if (isNaN(Date.parse(value))) {
          console.log(`⚠️  Строка ${idx + 2}, поле "${field}": "${value}" (неіснуюча дата) → очищено`);
          emp[field] = "";
          totalCleaned++;
          cleanedByField[field] = (cleanedByField[field] || 0) + 1;
        } else {
          // Validate calendar date
          const parsed = new Date(value + 'T00:00:00Z');
          const roundtrip = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
          if (roundtrip !== value) {
            console.log(`⚠️  Строка ${idx + 2}, поле "${field}": "${value}" (невірна календарна дата) → очищено`);
            emp[field] = "";
            totalCleaned++;
            cleanedByField[field] = (cleanedByField[field] || 0) + 1;
          }
        }
      }
    });
  });

  console.log("\n📊 Статистика очистки:");
  console.log(`   Всего очищено значений: ${totalCleaned}`);

  if (totalCleaned > 0) {
    console.log("\n   По полям:");
    Object.entries(cleanedByField).forEach(([field, count]) => {
      console.log(`   - ${field}: ${count} значений`);
    });

    // Сохраняем очищенные данные
    await saveEmployees(employees);
    console.log("\n✅ Данные успешно сохранены в employees.csv");
  } else {
    console.log("\n✅ Невалидных дат не найдено, файл в порядке!");
  }
}

// Запуск скрипта
cleanInvalidDates()
  .then(() => {
    console.log("\n✨ Готово!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Ошибка:", error.message);
    console.error(error);
    process.exit(1);
  });
