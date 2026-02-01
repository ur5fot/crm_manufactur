# Огляд проекту

**Назва проекту:** CRM Manufactur
**Тип:** Multi-part Client-Server Application
**Дата документації:** 2026-02-01

## Executive Summary

Локальна CRM система для управління даними співробітників з використанням CSV файлів як бази даних та PDF документів у локальних папках.

**Ключова особливість:** CSV файли можна редагувати безпосередньо в Excel, зміни автоматично завантажуються при оновленні UI.

## Призначення проекту

Система для управління інформацією про співробітників виробничої компанії з можливостями:

- **CRUD операції** - Створення, читання, оновлення, видалення записів
- **Управління документами** - Завантаження та зберігання PDF файлів
- **Динамічна UI** - Форми та таблиці генеруються з мета-схеми
- **Аудит лог** - Автоматичне відстеження всіх змін
- **Відстеження відпусток** - Автоматична зміна статусів
- **Excel-сумісність** - Прямe редагування даних в Excel

## Архітектура

### Тип репозиторію
**Multi-part** (2 частини)

### Технологічний стек

| Компонент | Технологія | Версія |
|-----------|------------|--------|
| **Frontend** | Vue.js | 3.4.30 |
| **Build Tool** | Vite | 5.3.5 |
| **Backend** | Express.js | 4.18.2 |
| **Runtime** | Node.js | Latest |
| **Database** | CSV Files | - |
| **Language** | JavaScript | ES2015+ |

### Частини проекту

#### 1. CLIENT - Frontend (Vue.js SPA)
- **Розташування:** `client/`
- **Тип:** Web Application (SPA)
- **Порт:** 5173 (dev)
- **Framework:** Vue 3 + Vite
- **Архітектура:** Monolithic component
- **Головний файл:** `src/App.vue` (46KB)

#### 2. SERVER - Backend (Express.js API)
- **Розташування:** `server/`
- **Тип:** REST API Backend
- **Порт:** 3000
- **Framework:** Express.js
- **Архітектура:** Layered (API → Business Logic → Data Access)
- **Головний файл:** `src/index.js` (14.8KB)

## Структура даних

### CSV-based Storage

**Головні таблиці:**
1. **employees.csv** - Дані співробітників (40 колонок, ~3 рядки)
2. **fields_schema.csv** - Мета-схема UI (41 поле, 8 колонок)
3. **logs.csv** - Аудит лог (47 записів, 9 колонок)

**Формат:**
- Encoding: UTF-8 with BOM
- Delimiter: `;` (semicolon)
- Excel-compatible

### File Storage

**Документи:**
- Розташування: `files/employee_[ID]/`
- Формат: PDF
- Limit: 10MB per file
- Типи: Паспорти, водійські права, довідки

## Ключові функції

### Управління співробітниками
- ✅ Створення, редагування, видалення
- ✅ Пошук та фільтрація
- ✅ Три режими перегляду (Cards, Table, Logs)
- ✅ Inline редагування в таблиці
- ✅ Динамічні форми з fields_schema

### Управління документами
- ✅ Завантаження PDF (до 10MB)
- ✅ Перегляд в browser
- ✅ Видалення файлів
- ✅ Відкриття папки в ОС

### Відстеження відпусток
- ✅ Автоматична зміна статусу при початку відпустки
- ✅ Автоматичне відновлення статусу після відпустки
- ✅ Сповіщення про відпустки сьогодні

### Аудит та логування
- ✅ Всі CRUD операції логуються
- ✅ Field-level change tracking
- ✅ Timestamp та user-readable описи
- ✅ Перегляд логів в UI

### Імпорт/Експорт
- ✅ Масовий імпорт з CSV
- ✅ Template для імпорту
- ✅ Excel як admin tool для редагування

## Інтеграція

### Client ↔ Server
**Протокол:** REST API over HTTP
**Формат:** JSON
**Proxy:** Vite dev proxy (development)

**Endpoints:** 13 REST endpoints
- CRUD: 5 endpoints
- Files: 3 endpoints
- Metadata: 2 endpoints
- Utilities: 3 endpoints

## Розробка

### Швидкий старт
```bash
git clone <repo>
cd crm_manufactur
cp data/fields_schema.template.csv data/fields_schema.csv
./run.sh
```

### Команди
- `./run.sh` - Запустити обидві частини
- `./stop.sh` - Зупинити все

### URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Документація

### Існуюча
- **README.md** - Англійська документація
- **README.uk.md** - Українська документація
- **CLAUDE.md** - Технічний посібник для AI
- **docs/** - Згенерована документація (ця тека)

### Згенерована (AI)
- [Структура проекту](./project-structure.md)
- [Технологічний стек](./technology-stack.md)
- [Архітектурні патерни](./architecture-patterns.md)
- [API контракти](./api-contracts-server.md)
- [Моделі даних](./data-models-server.md)
- [State management](./state-management-patterns-client.md)
- [UI компоненти](./ui-component-inventory-client.md)
- [Дерево файлів](./source-tree-analysis.md)
- [Посібник розробки](./development-guide.md)
- [Інтеграційна архітектура](./integration-architecture.md)

## Особливості реалізації

### Унікальні рішення

1. **CSV як база даних**
   - Людино-читабельний формат
   - Excel як admin interface
   - Легкий backup (copy файл)
   - Немає потреби в DB setup

2. **Динамічна UI**
   - fields_schema.csv контролює всю UI
   - Форми генеруються автоматично
   - Зміни схеми без коду

3. **Monolithic SPA**
   - Весь UI в одному компоненті (App.vue)
   - Простота для невеликого проекту
   - Швидкий розвиток

4. **Автоматичний аудит**
   - Всі зміни логуються автоматично
   - Field-level tracking
   - Human-readable logs

## Обмеження

### Технічні
- ❌ Не масштабується (in-memory, ~1000 employees max)
- ❌ Немає автентифікації
- ❌ Немає транзакцій (file-based)
- ❌ Немає concurrent writes protection

### Функціональні
- ❌ Тільки локальне використання
- ❌ Один користувач одночасно
- ❌ Ручне управління схемою
- ❌ Немає версіонування даних

## Use Cases

### Ідеально для:
- ✅ Малі компанії (< 100 співробітників)
- ✅ Локальне використання
- ✅ Прості CRUD операції
- ✅ Excel power users
- ✅ Швидкий prototyping

### Не підходить для:
- ❌ Великі організації (> 1000 співробітників)
- ❌ Multi-user concurrent access
- ❌ Cloud deployment
- ❌ Compliance requirements (GDPR, etc.)
- ❌ Real-time collaboration

## Майбутні покращення

### Короткострокові
- [ ] Додати тести (Unit + E2E)
- [ ] Розділити App.vue на компоненти
- [ ] Додати pagination в таблиці
- [ ] Implement proper error handling

### Середньострокові
- [ ] Міграція на SQLite/PostgreSQL
- [ ] Додати автентифікацію
- [ ] Implement роздільний доступ
- [ ] Cloud backup для даних

### Довгострокові
- [ ] Multi-tenancy support
- [ ] Real-time collaboration
- [ ] Mobile app (React Native)
- [ ] Advanced reporting

## Контакти та підтримка

**Проект:** Local CRM для виробництва
**Репозиторій:** [Git repository URL]
**Документація:** `docs/index.md`
**Підтримка:** [Contact information]

---

**Остання оновлення:** 2026-02-01
**Версія документації:** 1.0
**Генератор:** BMAD Document Project Workflow
