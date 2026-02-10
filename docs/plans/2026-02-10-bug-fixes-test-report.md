# Bug Fixes - CRM Manufacturing System Test Report

Bug fixes для CRM Manufacturing System по результатам comprehensive test report от 2026-02-10

## Plan Details

- **Files involved:** server/src/store.js, server/src/index.js, CLAUDE.md (possibly)
- **Related patterns:** Existing logWriteLock pattern in store.js for preventing race conditions
- **Dependencies:** None

## Status Overview

**СТАТУС БАГИ:**
- BUG #1 (Employee folder deletion) - УЖЕ ИСПРАВЛЕН в коде
- BUG #3 (CSV import logging) - УЖЕ ИСПРАВЛЕН в коде
- BUG #4 (Field labels in logs) - УЖЕ ИСПРАВЛЕН в коде
- BUG #5 (File upload logging) - УЖЕ ИСПРАВЛЕН в коде

**ОСТАЛСЯ ТОЛЬКО:**
- BUG #2 (Concurrent edits race condition) - требует имплементации

## Approach

- **Testing approach:** Regular (code first, then tests)
- Complete each task fully before moving to the next
- Реализовать аналогичную блокировку для saveEmployees как уже есть для логов (logWriteLock pattern)
- Либо задокументировать ограничение в CLAUDE.md если система предназначена для single-user deployments
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Tasks

### TASK 1: Добавить in-memory lock для предотвращения race condition при обновлении сотрудников

**Files:**
- Modify: `server/src/store.js`

**Subtasks:**
- [x] Добавить employeeWriteLock переменную аналогично logWriteLock (line 20)
- [x] Обернуть saveEmployees() функцию с lock/unlock механизмом
- [x] Проверить что блокировка работает: load → acquire lock → save → release lock
- [x] Добавить комментарии объясняющие механизм блокировки

### TASK 2: Тестирование race condition fix

**Files:**
- Test: `server/src/index.js` (PUT endpoint)

**Subtasks:**
- [x] Вручную протестировать concurrent PUT requests к одному employee
- [x] Убедиться что второй запрос ждёт завершения первого
- [x] Проверить что оба изменения корректно сохраняются последовательно
- [x] Проверить что логи корректно записываются для обоих изменений

### TASK 3: Документация и финальная проверка

**Files:**
- Modify: `CLAUDE.md` (если нужно задокументировать ограничение)

**Subtasks:**
- [ ] Если full fix невозможен - задокументировать ограничение в CLAUDE.md секция "Key Technical Decisions"
- [ ] Либо обновить секцию "Security Concerns" с информацией о concurrent edit handling
- [ ] Запустить ./run.sh и убедиться что сервер стартует без ошибок
- [ ] Проверить все основные операции: create, read, update, delete employee

## Validation

- [ ] manual test: Concurrent PUT requests к одному employee не теряют данные
- [ ] run server: `./run.sh`
- [ ] verify all CRUD operations work correctly
- [ ] verify no regressions in existing functionality

## Documentation

- [ ] update CLAUDE.md if concurrent edit protection implemented or limitation documented
- [ ] move this plan to `docs/plans/completed/`
