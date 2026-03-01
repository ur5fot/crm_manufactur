# Table Column Sorting

## Overview
Add ascending/descending sorting to every column in the `/table` page. Clicking a column header cycles through: unsorted → ascending → descending → unsorted. Only one column can be sorted at a time (single-column sort). Sort indicators (▲/▼) show the current sort state.

## Context
- **Main component:** `client/src/views/TableView.vue`
- **Related composables:** `useTableColumnFilters.js`, `useTableInlineEdit.js`, `useFieldsSchema.js`
- **Current state:** No sorting exists. Rows display in CSV file order. All data is loaded client-side.
- **Filtering:** Client-side via `filteredEmployees` computed property (text search + column filters)
- **Columns:** Dynamic from `summaryColumns` (schema-driven, `show_in_table='yes'`)
- **Column types:** text, select, date, number, textarea

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task**
- **CRITICAL: update this plan file when scope changes during implementation**

## Testing Strategy
- **Unit tests**: Not applicable (pure frontend composable with no backend changes)
- **E2E tests**: Add Playwright test for sorting behavior (click header, verify row order)

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix

## Implementation Steps

### Task 1: Create useTableSort composable
- [x] Create `client/src/composables/useTableSort.js` with:
  - `sortColumn` ref (column key or `null`)
  - `sortDirection` ref (`'asc'`, `'desc'`, or `null`)
  - `toggleSort(columnKey)` function — cycles: null → asc → desc → null; clicking a different column resets to asc
  - `sortData(data, columns)` function — sorts array copy by current column, handles types: text (locale-aware Ukrainian), number (parseFloat), date (string comparison YYYY-MM-DD), select/textarea (same as text); empty values always sort last regardless of direction
- [x] Run tests — must pass before next task

### Task 2: Integrate sorting into TableView
- [ ] Import `useTableSort` composable in `TableView.vue`
- [ ] Chain sorting after filtering: `filteredEmployees` computed should apply sort via `sortData()` after search/column filters
- [ ] Make column headers clickable: add `@click="toggleSort(col.key)"` to each `<th>` (including ID column)
- [ ] Add sort indicator next to column label: ▲ for asc, ▼ for desc, no indicator when unsorted
- [ ] Add `cursor: pointer` style to sortable `<th>` headers and hover highlight
- [ ] Run tests — must pass before next task

### Task 3: Add E2E test for table sorting
- [ ] Create `tests/e2e/table-sort.spec.js` with tests:
  - Click column header → rows reorder ascending
  - Click same header again → rows reorder descending
  - Click same header third time → returns to unsorted (original order)
  - Click different column → sorts by new column ascending
  - Sort indicator (▲/▼) appears on active column only
- [ ] Run E2E tests — must pass before next task

### Task 4: Verify acceptance criteria
- [ ] Verify sorting works for all column types (text, number, date, select)
- [ ] Verify empty values sort last in both directions
- [ ] Verify sorting works correctly with active filters and search
- [ ] Verify inline editing still works after sorting
- [ ] Run full test suite (unit + E2E)
- [ ] Verify no regressions in existing table-filters E2E tests

## Technical Details

**Sort cycle per column:** `null` → `'asc'` → `'desc'` → `null`
**Switching columns:** resets to `'asc'` on the new column

**Type-aware comparison:**
- `text` / `select` / `textarea`: `localeCompare('uk')` for Ukrainian-aware sorting
- `number`: `parseFloat()` comparison
- `date`: string comparison (YYYY-MM-DD format sorts correctly lexicographically)
- Empty/null values: always placed at the end regardless of sort direction

**Sort indicator UI:**
- Active ascending: `▲` (or `↑`)
- Active descending: `▼` (or `↓`)
- Inactive: no indicator
- Displayed inline next to column label text
