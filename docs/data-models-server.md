# Моделі даних - Server

**Дата сканування:** 2026-02-01
**Частина:** server (Backend)
**Тип сканування:** Quick (pattern-based)

## Огляд

CSV-based data storage з 3 основними таблицями та файловим сховищем для PDF документів.

---

## Схема даних

### Таблиця: employees.csv

**Опис:** Основна таблиця даних співробітників
**Рядків:** ~3 (дані користувача)
**Колонок:** 40
**Delimiter:** `;` (semicolon)
**Encoding:** UTF-8 with BOM
**Джерело:** `data/employees.csv`

**Модель:** EMPLOYEE_COLUMNS (визначено в `server/src/schema.js`)

**Категорії полів:**

1. **Ідентифікація** (1 поле)
   - `employee_id` - Auto-increment ID (sequential numeric strings)

2. **Особисті дані** (3 поля)
   - `last_name`, `first_name`, `middle_name`

3. **Статус роботи** (5 полів)
   - `employment_status` (select: Работает|Уволен|Отпуск|Больничный)
   - `additional_status`
   - `work_state`, `work_type`
   - `location`

4. **Посада та зарплата** (5 полів)
   - `department`, `position`
   - `grade`, `salary_grid`, `salary_amount`

5. **Спеціальність** (2 поля)
   - `specialty`, `fit_status`

6. **Фінанси** (4 поля)
   - `bank_name`, `bank_card_number`, `bank_iban`, `tax_id`

7. **Контакти** (3 поля)
   - `email`, `phone`, `phone_note`

8. **Адреси** (3 поля)
   - `workplace_location`, `residence_place`, `registration_place`

9. **Документи - шляхи до файлів** (4 поля)
   - `driver_license_file`
   - `id_certificate_file`
   - `foreign_passport_file`
   - `criminal_record_file`

10. **Паспортні дані** (2 поля)
    - `foreign_passport_number`
    - `foreign_passport_issue_date` (YYYY-MM-DD)

11. **Відпустки** (2 поля)
    - `vacation_start_date` (YYYY-MM-DD)
    - `vacation_end_date` (YYYY-MM-DD)

12. **Інше** (6 полів)
    - `blood_group` (select: I (0)|II (A)|III (B)|IV (AB))
    - `gender` (select: Мужской|Женский)
    - `education`
    - `notes`
    - `order_ref`

**Primary Key:** `employee_id` (auto-generated)
**Unique Constraints:** None
**Relationships:** None (denormalized)

---

### Таблиця: fields_schema.csv

**Опис:** Мета-схема для динамічної генерації UI
**Рядків:** 41 (37 полів + header)
**Колонок:** 8
**Delimiter:** `;`
**Encoding:** UTF-8 with BOM
**Джерело:** `data/fields_schema.csv`

**Призначення:** Single source of truth для UI конфігурації

**Колонки:**
1. `field_order` - Порядковий номер (1-37)
2. `field_name` - Технічна назва поля
3. `field_label` - Відображувана назва (українська/російська)
4. `field_type` - Тип input: text|select|textarea|number|email|tel|date|file
5. `field_options` - Опції для select (pipe-separated)
6. `show_in_table` - Показувати в таблиці: yes|no
7. `field_group` - Група для секцій форми
8. `editable_in_table` - Inline редагування: yes|no

**Використання:**
- Frontend читає через `/api/fields-schema`
- Генерує форми, таблиці, фільтри автоматично
- Зміни в схемі = зміни UI без коду

---

### Таблиця: logs.csv

**Опис:** Audit log всіх CRUD операцій
**Рядків:** 47 (дані користувача)
**Колонок:** 9
**Delimiter:** `;`
**Encoding:** UTF-8 with BOM
**Джерело:** `data/logs.csv`

**Колонки:**
1. `log_id` - Sequential log ID
2. `timestamp` - ISO 8601 timestamp
3. `action` - CREATE|UPDATE|DELETE
4. `employee_id` - ID співробітника
5. `employee_name` - Full name (at time of change)
6. `field_name` - Змінене поле (для UPDATE)
7. `old_value` - Попереднє значення
8. `new_value` - Нове значення
9. `details` - Human-readable опис

**Сортування:** DESC by timestamp (newest first)
**Retention:** Немає (всі записи зберігаються)

**Автоматичне логування:**
- CREATE - при POST /api/employees
- UPDATE - при PUT /api/employees/:id (field-level)
- DELETE - при DELETE /api/employees/:id

---

## Файлове сховище

### Структура: files/employee_[ID]/

**Тип:** Файлова система як document storage
**Шлях:** `files/employee_{employee_id}/`
**Формат:** PDF documents
**Розмір:** До 10MB per file

**Типи документів:**
- `driver_license_file.pdf` - Водійське посвідчення
- `id_certificate_file.pdf` - ID картка
- `foreign_passport_file.pdf` - Закордонний паспорт
- `criminal_record_file.pdf` - Довідка про несудимість

**Lifecycle:**
- Створення: POST /api/employees/:id/files
- Видалення: DELETE /api/employees/:id/files/:fieldName
- Cascade delete: При видаленні співробітника видаляється вся папка

**Шляхи в БД:**
- Зберігаються як relative paths в employees.csv
- Приклад: `files/employee_emp_1234/passport.pdf`

---

## Миграції та схеми

**Стратегія міграцій:** Відсутня (ручне управління)

**Row Normalization:**
- При читанні CSV: всі колонки normalize до empty string
- Гарантує існування всіх полів навіть у старих записах
- Реалізовано в `csv.js`

**Schema Evolution:**
- Додавання поля: додати колонку в CSV + рядок в fields_schema.csv
- Видалення поля: видалити з обох файлів (дані втрачаються)
- Немає version control схеми

---

## Відносини та constraints

**Нормалізація:** Denormalized (все в одній таблиці)
**Foreign Keys:** Відсутні
**Indexes:** Відсутні (linear scan)
**Constraints:** Відсутні (validation в Zod)
**Transactions:** Відсутні

**Data Integrity:**
- Гарантується application layer (store.js)
- UTF-8 BOM для Excel compatibility
- Auto-generated IDs (sequential)

---

## Performance характеристики

**Read:** In-memory на кожен запит (reload CSV)
**Write:** Повна перезапис файлу
**Scalability:** ~1000 employees (обмеження in-memory)
**Concurrency:** Відсутня (file lock issues можливі)

**Переваги:**
- ✅ Excel можна використовувати як admin tool
- ✅ Легко робити backup (copy файл)
- ✅ Human-readable формат

**Недоліки:**
- ❌ Немає індексів (повний скан)
- ❌ Немає транзакцій
- ❌ Race conditions можливі
- ❌ Не масштабується для великих датасетів

---

## Зв'язки з кодом

**Schema Definition:** `server/src/schema.js`
- `EMPLOYEE_COLUMNS` - масив з 40 назв колонок
- Dynamically loaded from fields_schema.csv

**Data Access:** `server/src/store.js`
- `readEmployees()` - читає CSV
- `writeEmployees()` - записує CSV
- `addLog()` - додає в audit log

**CSV Utilities:** `server/src/csv.js`
- `readCsv()` - парсинг
- `writeCsv()` - запис з BOM
- Row normalization

---

## Виявлені таблиці

**Кількість таблиць:** 3
- `employees.csv` - 3 рядки даних, 40 колонок
- `fields_schema.csv` - 41 рядок, 8 колонок
- `logs.csv` - 47 рядків, 9 колонок

**Загальна схема:** CSV-based relational-like structure без справжньої БД
