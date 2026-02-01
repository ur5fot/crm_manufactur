# Посібник з розробки

**Дата:** 2026-02-01
**Проект:** CRM Manufactur

## Швидкий старт

### Перше встановлення

```bash
git clone <repository-url>
cd crm_manufactur
cp data/fields_schema.template.csv data/fields_schema.csv
./run.sh
```

Відкрийте: `http://localhost:5173`

### Оновлення з GitHub

```bash
git pull origin master
./stop.sh
./run.sh
```

**Примітка:** `fields_schema.csv` в `.gitignore` - локальні зміни схеми не перезапишуться.

## Передумови

### Обов'язкові

- **Node.js** - Latest LTS (перевірте: `node --version`)
- **npm** - Comes with Node.js (перевірте: `npm --version`)
- **Git** - Для клонування проекту

### Рекомендовані

- **VS Code** - IDE
- **Excel / LibreOffice** - Для редагування CSV
- **PDF reader** - Для перегляду документів

## Встановлення залежностей

### Автоматично (рекомендується)

```bash
./run.sh
```

Скрипт автоматично перевірить та встановить залежності.

### Вручну

**Client:**
```bash
cd client
npm install
```

**Server:**
```bash
cd server
npm install
```

## Команди розробки

### Запуск додатку

**Обидві частини разом:**
```bash
./run.sh
```

**Окремо - Client:**
```bash
cd client
npm run dev
# Dev server: http://localhost:5173
```

**Окремо - Server:**
```bash
cd server
npm run dev
# API server: http://localhost:3000
```

### Зупинка додатку

```bash
./stop.sh
```

Вбиває процеси на портах: 3000, 5173, 5174

### Production build

**Client:**
```bash
cd client
npm run build          # → dist/
npm run preview        # Preview на :5174
```

**Server:**
```bash
cd server
npm start              # Production mode
```

## Середовище розробки

### Порти

| Сервіс | Port | URL |
|--------|------|-----|
| Client Dev | 5173 | http://localhost:5173 |
| Server | 3000 | http://localhost:3000 |
| Client Preview | 5174 | http://localhost:5174 |

### Proxy налаштування

**Vite proxy** (`client/vite.config.js`):
```javascript
proxy: {
  "/api": "http://localhost:3000",
  "/files": "http://localhost:3000",
  "/data": "http://localhost:3000"
}
```

**Що це означає:**
- Запити до `/api/*` перенаправляються на backend
- Уникає CORS проблем в development
- Production потребує proper CORS config

### Hot Module Replacement

**Client (Vite HMR):**
- ✅ Автоматичне оновлення при зміні `.vue`, `.js`, `.css`
- ✅ Зберігає стан компонента (якщо можливо)
- ✅ Швидке (~50ms)

**Server (Node --watch):**
- ✅ Перезапуск при зміні `.js` файлів
- ❌ Втрачає in-memory стан
- ⚠️ ~1-2s на restart

## Структура коду

### Client

```
client/src/
├── main.js          # Vue app initialization
├── App.vue          # Main component (all UI)
├── api.js           # API client methods
└── styles.css       # Global styles
```

**Development flow:**
1. Редагувати `App.vue` для UI changes
2. Додати API methods в `api.js` якщо потрібно
3. HMR автоматично оновить browser

### Server

```
server/src/
├── index.js         # Express app + routes
├── store.js         # Business logic + file I/O
├── csv.js           # CSV utilities
└── schema.js        # Data model
```

**Development flow:**
1. Додати endpoint в `index.js`
2. Реалізувати logic в `store.js`
3. Server auto-restart via `--watch`

## Робота з даними

### Editing CSV files

**Excel workflow:**
1. Відкрити `data/employees.csv` в Excel
2. Зберегти з UTF-8 BOM encoding
3. Delimiter: semicolon (`;`)
4. Оновити browser → зміни з'являться

**Schema changes:**
1. Редагувати `data/fields_schema.csv`
2. Додати/видалити/змінити поля
3. Reload UI → форми оновляться

**⚠️ ВАЖЛИВО:**
- Завжди зберігайте з UTF-8 BOM
- Не міняйте delimiter на `,`
- Header row повинен залишитись

### Sample data

**Імпорт шаблон:**
```bash
data/employees_import_sample.csv
```

Використовуйте як template для bulk import.

## Testing

### Ручне тестування

**Client:**
1. Відкрити http://localhost:5173
2. Перевірити всі view modes (Cards, Table, Logs)
3. Створити/Оновити/Видалити employee
4. Завантажити PDF документ
5. Перевірити filters в Table view

**Server:**
```bash
# API health check
curl http://localhost:3000/api/health

# Get employees
curl http://localhost:3000/api/employees

# Get schema
curl http://localhost:3000/api/fields-schema
```

### Автоматичне тестування

**Поточний стан:** ❌ Тести відсутні

**TODO:**
- Unit tests для server (Jest/Vitest)
- Component tests для client (Vitest)
- E2E tests (Playwright)

## Debugging

### Client (Browser DevTools)

**Chrome/Firefox DevTools:**
1. F12 → Console для errors
2. Network tab → перевірити API calls
3. Vue DevTools extension → inspect components

**Vue DevTools:**
- Встановити: https://devtools.vuejs.org/
- Inspect: Component tree, State, Events

### Server (Node.js)

**Console logging:**
```javascript
console.log('Debug:', variable);
```

**VS Code debugger:**
1. Add breakpoint in code
2. F5 → Start debugging
3. Select "Node.js" config

### CSV issues

**Encoding problems:**
```bash
# Check file encoding
file -I data/employees.csv

# Should show: utf-8
```

**Кирилиця не відображається в Excel:**
- Зберегти з UTF-8 BOM
- Перевірити delimiter (`;`)

## Coding Style

### JavaScript

**ES Modules:**
```javascript
import { ref } from 'vue';
export const api = { ... };
```

**Async/await:**
```javascript
async function loadData() {
  const data = await api.getEmployees();
}
```

**Naming:**
- camelCase для змінних/функцій
- PascalCase для компонентів
- UPPER_CASE для констант

### Vue

**Composition API:**
```vue
<script>
import { ref, onMounted } from 'vue';

const data = ref([]);
onMounted(async () => {
  data.value = await loadData();
});
</script>
```

**Template syntax:**
```vue
<template>
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
</template>
```

## Troubleshooting

### Port already in use

```bash
# Kill процеси на портах
./stop.sh

# Або вручну
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Dependencies issues

```bash
# Видалити та переінсталювати
rm -rf client/node_modules server/node_modules
cd client && npm install
cd ../server && npm install
```

### CSV corruption

```bash
# Backup
cp data/employees.csv data/employees.backup.csv

# Restore від template
cp data/employees_import_sample.csv data/employees.csv
```

### Git conflicts на CSV

⚠️ **Не commit user data!** CSV files в `.gitignore`

Якщо випадково committed:
```bash
git rm --cached data/employees.csv
git commit -m "Remove user data"
```

## Deployment (Production)

### Considerations

**Client:**
- Build static files: `npm run build`
- Serve з Nginx/Apache
- Налаштувати proxy до backend

**Server:**
- Use process manager (PM2, systemd)
- Налаштувати CORS для production domain
- Secure file uploads path
- Regular CSV backups

**Data:**
- Backup strategy для CSV files
- File storage management
- Log rotation

### Environment

Create `.env` файли якщо потрібно (currently not used).

## Корисні команди

```bash
# Перевірити структуру
tree -L 2 -I 'node_modules'

# Знайти TODO comments
grep -r "TODO" client/src server/src

# Підрахувати рядки коду
find client/src server/src -name "*.js" -o -name "*.vue" | xargs wc -l

# Backup data
tar -czf backup-$(date +%Y%m%d).tar.gz data/ files/
```

## Додаткові ресурси

**Документація:**
- Vue 3: https://vuejs.org/
- Vite: https://vitejs.dev/
- Express: https://expressjs.com/

**Tools:**
- VS Code: https://code.visualstudio.com/
- Vue DevTools: https://devtools.vuejs.org/
- Postman: https://www.postman.com/ (API testing)
