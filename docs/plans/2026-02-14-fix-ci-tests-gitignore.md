# Исправление падающих тестов в CI при PR в master

## Обзор

При PR в master тесты CI падают потому что файлы `data/fields_schema.template.csv` и `data/employees_import_sample.csv` были удалены из git-отслеживания и добавлены в .gitignore. CI workflow зависит от `fields_schema.template.csv` - копирует его для создания `fields_schema.csv` при старте тестов. Без этого файла сервер не может нормально стартовать.

Предлагаемое решение: шаблонные/template файлы (`fields_schema.template.csv`, `config.template.csv`) должны отслеживаться в git - они являются частью кода (определяют схему), а не рантайм данными. Автогенерируемые файлы (`employees_import_sample.csv`, `config.csv`, `fields_schema.csv`, `templates.csv`, `generated_documents.csv`) остаются в .gitignore, т.к. они действительно создаются автоматически при старте.

## Контекст

- Files involved:
  - Modify: `.gitignore`
  - Modify: `.github/workflows/tests.yml`
  - Return to git: `data/fields_schema.template.csv`
  - Keep in git: `data/config.template.csv`
- Related patterns:
  - CI workflow copies template files to create working CSVs
  - `run.sh` copies `config.template.csv` -> `config.csv` on first launch
  - `sync-template.js` generates `employees_import_sample.csv` from `fields_schema.csv`
  - Server reads `fields_schema.csv` at startup for column initialization

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Minimal changes to .gitignore and CI
- **CRITICAL: all tests must pass before completion**

## Implementation Steps

### Task 1: Fix .gitignore - return template files to git

**Files:**
- Modify: `.gitignore`

- [x] Remove `data/fields_schema.template.csv` from .gitignore (this is a schema file, part of code)
- [x] Ensure `data/config.template.csv` is NOT in .gitignore (it's also a template/schema file)
- [x] Keep auto-generated files in .gitignore: `data/config.csv`, `data/employees_import_sample.csv`, `data/templates.csv`, `data/generated_documents.csv`
- [x] Add `data/fields_schema.template.csv` back to git tracking (`git add -f data/fields_schema.template.csv`)

### Task 2: Update CI workflow

**Files:**
- Modify: `.github/workflows/tests.yml`

- [x] Ensure "Setup test data files" step correctly copies template files
- [x] Add `sync-template.js` execution in CI (to generate `employees_import_sample.csv`) or ensure backend generates it on startup
- [x] Add unit test run (`cd server && npm test`) to CI workflow

### Task 3: Verify everything works

- [ ] Run unit tests locally: `cd server && npm test`
- [ ] Run E2E tests locally: `npm run test:e2e`
- [ ] Ensure all tests pass
