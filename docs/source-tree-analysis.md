# Аналіз дерева вихідних файлів

**Дата:** 2026-02-01

## Структура проекту

```
crm_manufactur/                     # Root проекту
├── client/                         # Frontend (Vue.js SPA)
│   ├── src/                       # Вихідний код
│   │   ├── App.vue               # 🎯 Головний компонент (46KB)
│   │   ├── main.js               # Entry point
│   │   ├── api.js                # API client wrapper
│   │   └── styles.css            # Global styles (18KB)
│   ├── index.html                # HTML template
│   ├── vite.config.js            # Vite configuration
│   ├── package.json              # Dependencies
│   └── node_modules/             # Npm packages
│
├── server/                         # Backend (Express.js API)
│   ├── src/                       # Вихідний код
│   │   ├── index.js              # 🎯 Express app + REST endpoints (14.8KB)
│   │   ├── store.js              # File system operations (6.8KB)
│   │   ├── csv.js                # CSV utilities (2.2KB)
│   │   └── schema.js             # Data model definitions (7.6KB)
│   ├── package.json              # Dependencies
│   └── node_modules/             # Npm packages
│
├── data/                          # 💾 CSV Database
│   ├── employees.csv             # Main data table (3 rows, 40 cols)
│   ├── fields_schema.csv         # UI meta-schema (41 rows, 8 cols)
│   ├── logs.csv                  # Audit log (47 entries)
│   ├── fields_schema.template.csv # Schema template
│   └── employees_import_sample.csv # Import template
│
├── files/                         # 📁 Document storage
│   └── employee_[ID]/            # Per-employee folders
│       ├── passport.pdf
│       ├── driver_license.pdf
│       └── ...
│
├── docs/                          # 📚 Generated documentation
│   ├── index.md                  # Master index (to be generated)
│   ├── project-structure.md
│   ├── technology-stack.md
│   └── ...
│
├── _bmad/                         # BMAD framework
│   ├── bmm/                      # BMM module
│   ├── cis/                      # CIS module
│   └── core/                     # Core tasks
│
├── README.md                      # Main documentation (EN)
├── README.uk.md                   # Ukrainian documentation
├── CLAUDE.md                      # AI development guide
├── run.sh                        # 🚀 Start script
├── stop.sh                       # ⛔ Stop script
└── .gitignore                    # Git ignore rules
```

## Критичні каталоги

### Client (Frontend)

**`client/src/`** - Весь frontend код
- **Призначення:** Vue.js додаток
- **Entry point:** `main.js`
- **Main component:** `App.vue` (монолітний)
- **API layer:** `api.js`
- **Styles:** `styles.css`

**`client/node_modules/`** - Залежності
- Vue 3.4.30
- Vite 5.3.5
- @vitejs/plugin-vue

### Server (Backend)

**`server/src/`** - Весь backend код
- **Призначення:** Express.js REST API
- **Entry point:** `index.js`
- **Layers:**
  - API routes (index.js)
  - Business logic (store.js)
  - Data access (csv.js)
  - Schema (schema.js)

**`server/node_modules/`** - Залежності
- Express, CORS
- CSV libraries
- Multer, Zod

### Data Layer

**`data/`** - База даних CSV
- **Призначення:** Зберігання даних
- **Формат:** CSV (UTF-8 BOM, `;` delimiter)
- **Редагування:** Excel-compatible

**`files/`** - Документи
- **Призначення:** PDF storage
- **Структура:** `employee_[ID]/` folders
- **Max size:** 10MB per file

## Точки інтеграції

### Client → Server

**API calls:**
- `client/src/api.js` → HTTP fetch
- Vite proxy: `/api` → `:3000`
- Server: `server/src/index.js` endpoints

**Data flow:**
```
App.vue → api.js → Vite Proxy → Express → store.js → CSV files
```

### File System

**CSV читання/запис:**
```
index.js → store.js → csv.js → data/*.csv
```

**Document uploads:**
```
multer → temp file → rename → files/employee_[ID]/
```

## Entry Points

### Development

**Client:**
- Command: `cd client && npm run dev`
- Entry: `client/src/main.js`
- Port: 5173
- Hot reload: Yes (Vite HMR)

**Server:**
- Command: `cd server && npm run dev`
- Entry: `server/src/index.js`
- Port: 3000
- Hot reload: Yes (`--watch` flag)

**Both:**
- Command: `./run.sh`
- Starts: Client + Server in parallel

### Production

**Client:**
- Build: `npm run build` → `dist/`
- Preview: `npm run preview` (port 5174)

**Server:**
- Start: `npm start`
- Entry: `server/src/index.js`

## Ключові файли

### Configuration

- `client/vite.config.js` - Vite + proxy setup
- `client/package.json` - Client dependencies
- `server/package.json` - Server dependencies
- `data/fields_schema.csv` - UI configuration
- `.gitignore` - Git rules (data/, files/ ignored)

### Scripts

- `run.sh` - Start both services
- `stop.sh` - Stop both services (kill ports 3000, 5173, 5174)

### Documentation

- `README.md` - English docs
- `README.uk.md` - Ukrainian docs
- `CLAUDE.md` - Technical guide
- `docs/` - Generated AI documentation

## Статистика

**Загальна структура:**
- Parts: 2 (client, server)
- Source files: ~8 main files
- Data files: 5 CSV files
- Documentation: 5+ MD files
- Scripts: 2 shell scripts

**Розміри файлів:**
- App.vue: 46KB (largest source file)
- styles.css: 18KB
- index.js: 14.8KB
- schema.js: 7.6KB
- store.js: 6.8KB
