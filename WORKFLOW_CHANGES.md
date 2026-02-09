# BMAD Workflow Changes

## 2026-02-09: Улучшение git commit workflow

### Изменения

**dev-story workflow** (Step 11):
- Добавлена опция "Закоммитить после code review"
- 3 варианта: коммит сейчас / после review / сам позже

**code-review workflow** (Step 6):
- Умная логика: определяет был ли коммит после story
- Если story закоммичена → предлагает коммит для fixes
- Если нет → предлагает объединённый коммит (story + fixes)

### Зачем

Даёт гибкость:
1. Можно коммитить сразу (для безопасности)
2. Можно коммитить после review (чистая история)
3. Можно управлять вручную

### Изменённые файлы

- `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- `_bmad/bmm/workflows/4-implementation/code-review/instructions.xml`

### Примечания

Файлы workflow в `_bmad/` исключены из git (`.gitignore`).
Изменения применяются локально и работают автоматически.
