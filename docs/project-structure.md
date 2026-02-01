# Структура проекту

**Дата створення:** 2026-02-01
**Тип репозиторію:** Multi-part (Клієнт-Сервер архітектура)

## Загальний огляд

Це багаточастинний проект із двома окремими додатками, що працюють разом:

1. **client/** - Vue.js 3 SPA Frontend
2. **server/** - Express.js REST API Backend

## Частини проекту

### Частина 1: CLIENT (Frontend)

- **ID частини:** client
- **Тип проекту:** web
- **Кореневий шлях:** `/Users/dim/code/crm_manufactur/client/`
- **Опис:** Vue.js Single Page Application для управління CRM

**Основний стек:**
- Vue 3.4.30
- Vite 5.3.5 (збірка та dev server)

**Архітектура:**
- Monolithic component approach (один великий App.vue)
- API клієнт для комунікації з backend

### Частина 2: SERVER (Backend)

- **ID частини:** server
- **Тип проекту:** backend
- **Кореневий шлях:** `/Users/dim/code/crm_manufactur/server/`
- **Опис:** Express.js REST API для управління даними співробітників

**Основний стек:**
- Express 4.18.2
- Node.js (ES modules)
- CSV-based storage

**Ключові залежності:**
- csv-parse, csv-stringify - для роботи з CSV файлами
- multer - завантаження файлів
- zod - валідація даних
- cors - CORS middleware

## Інтеграція між частинами

**Тип інтеграції:** REST API

- **Від:** client
- **До:** server
- **Протокол:** HTTP/REST
- **Комунікація:** Клієнт використовує api.js для виклику API ендпоінтів на сервері
