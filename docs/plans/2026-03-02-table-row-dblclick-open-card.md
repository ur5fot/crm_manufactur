# Двойной клик по строке таблицы → открыть карточку в новом окне

## Overview
- Убрать inline-редактирование ячеек по двойному клику в TableView
- Убрать навигацию на карточку по двойному клику на ID
- Добавить двойной клик по всей строке → открыть карточку сотрудника в новой вкладке (`window.open`)
- Полностью удалить composable `useTableInlineEdit.js` и связанные стили

## Context (from discovery)
- Файлы: `client/src/views/TableView.vue`, `client/src/composables/useTableInlineEdit.js`
- TableView строка 220: `@dblclick="openEmployeeCard(employee.employee_id)"` на ID-ячейке
- TableView строки 221-276: `@dblclick.stop="startEditCell(...)"` на ячейках данных с edit/view режимами
- Composable `useTableInlineEdit.js`: `startEditCell`, `cancelEditCell`, `isEditingCell`, `saveCell`
- CSS-стили для `.editable-cell`, `.edit-cell`, `.cell-input`, `.cell-btn`, `.cell-actions`, `.view-cell`
- E2E тесты: `tests/e2e/table-sort.spec.js` (может использовать inline edit)

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Простое удаление функциональности — минимальные изменения
- Один двойной клик на `<tr>` вместо множества обработчиков на `<td>`
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Testing Strategy
- **Unit tests**: не требуются (удаляем composable, а не добавляем новый)
- **E2E tests**: обновить существующие тесты если они используют inline edit; добавить тест на двойной клик по строке

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix

## Implementation Steps

### Task 1: Удалить inline-редактирование и добавить двойной клик на строку
- [x] Удалить файл `client/src/composables/useTableInlineEdit.js`
- [x] В `TableView.vue`: убрать импорт и вызов `useTableInlineEdit`
- [x] В `TableView.vue`: убрать функцию-обёртку `saveCell`
- [x] В `TableView.vue`: убрать `@dblclick` с ID-ячейки (`<td class="id-cell">`)
- [x] В `TableView.vue`: убрать `@dblclick.stop` с data-ячеек, убрать edit-mode разметку (v-if/v-else с input/select/buttons), оставить только отображение значения
- [x] В `TableView.vue`: добавить `@dblclick="openEmployeeCardNewWindow(employee.employee_id)"` на `<tr>`
- [x] Изменить функцию `openEmployeeCard` → `openEmployeeCardNewWindow`: использовать `window.open(router.resolve(...).href, '_blank')` вместо `router.push`
- [x] Убрать CSS-стили для inline-edit: `.editable-cell`, `.edit-cell`, `.cell-input`, `.cell-btn`, `.save-btn`, `.cancel-btn`, `.cell-actions`, `.view-cell` и связанные
- [x] Убрать `title="Клік для редагування"` с ячеек
- [x] Добавить cursor: pointer на строки таблицы (`.table-row { cursor: pointer; }`)
- [x] Проверить что нет сломанных импортов и неиспользуемых переменных

### Task 2: Обновить E2E тесты
- [x] Проверить `tests/e2e/table-sort.spec.js` — убрать упоминания inline edit если есть
- [x] Проверить другие E2E тесты на упоминания inline edit в таблице
- [x] Добавить E2E тест: двойной клик по строке таблицы открывает карточку в новой вкладке
- [x] Запустить все E2E тесты — должны пройти

### Task 3: Обновить документацию
- [x] Обновить CLAUDE.md: убрать упоминания `useTableInlineEdit.js` из структуры проекта и описаний
- [x] Обновить CLAUDE.md: обновить описание TableView (двойной клик → новая вкладка вместо inline edit)

### Task 4: Verify acceptance criteria
- [ ] Двойной клик на любую ячейку строки НЕ открывает inline-редактирование
- [ ] Двойной клик на ID НЕ навигирует на карточку в текущем окне
- [ ] Двойной клик на строку открывает карточку в новой вкладке/окне
- [ ] Файл `useTableInlineEdit.js` удалён
- [ ] Нет сломанных тестов
- [ ] Run full test suite (unit + e2e)

## Technical Details
- `window.open(url, '_blank')` откроет новую вкладку (в большинстве браузеров)
- URL для карточки: `router.resolve({ name: 'cards', params: { id: employeeId } }).href`
- Событие `@dblclick` на `<tr>` покрывает клик на любую ячейку строки

## Post-Completion
**Manual verification:**
- Проверить в браузере что двойной клик на строку открывает правильную карточку
- Проверить что popup-blocker не блокирует открытие
- Проверить что курсор pointer отображается при наведении на строку
