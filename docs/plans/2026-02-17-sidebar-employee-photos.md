# Sidebar Employee Photos

## Overview
Add small circular photo thumbnails to each employee card in the sidebar list of the Cards view. Currently the sidebar only shows text (name, ID, position, department, status). Adding photos makes it easier to visually identify employees.

## Context (from discovery)
- **Sidebar template**: `client/src/views/EmployeeCardsView.vue` lines 853-872 — `.employee-card` divs with name, meta, tags
- **Sidebar styles**: `client/src/styles.css` — `.employee-card` (padding 14px 16px), `.employee-name`, `.employee-meta`, `.employee-tags`
- **Existing photo styles**: `.employee-photo-area` (72x72px, card header) — reusable pattern for smaller thumbnails
- **Photo data**: `employee.photo` field already available in the employees list (loaded via `GET /api/employees`)
- **Photo URL pattern**: `${VITE_API_URL || ''}/${employee.photo}` — same as card header photo

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- **CRITICAL: all tests must pass before starting next task**
- Maintain backward compatibility

## Testing Strategy
- **E2E tests**: Update `tests/e2e/employee-photo.spec.js` to verify sidebar photo display
- Unit test commands: `cd server && npm test`
- E2E test commands: `npm run test:e2e`

## Progress Tracking
- Mark completed items with `[x]` immediately when done

## Implementation Steps

### Task 1: Add photo thumbnails to sidebar employee cards
- [ ] Add small circular photo (36px) or placeholder SVG to each `.employee-card` in `EmployeeCardsView.vue` sidebar (lines 853-872) — use flexbox row layout with photo on the left, existing text on the right
- [ ] Construct photo URL from `employee.photo` using same pattern as card header (`${base}/${employee.photo}`)
- [ ] Show placeholder SVG icon (same person icon, smaller) when employee has no photo
- [ ] Add CSS styles in `styles.css`: `.employee-card-photo` (36x36px, circular, flex-shrink: 0), `.employee-card-photo-img`, `.employee-card-photo-placeholder` — follow existing `.employee-photo-*` pattern but smaller
- [ ] Verify dark theme support (use CSS variables like existing photo styles)
- [ ] Update E2E test `tests/e2e/employee-photo.spec.js` — add test that sidebar shows photo after upload
- [ ] Run tests — must pass before next task

### Task 2: Verify acceptance criteria
- [ ] Verify photos display correctly in sidebar for employees with photos
- [ ] Verify placeholder shows for employees without photos
- [ ] Verify sidebar card layout looks good (no overflow, proper alignment)
- [ ] Verify dark theme
- [ ] Run full test suite: `cd server && npm test`
- [ ] Run E2E tests: `npm run test:e2e`

### Task 3: [Final] Update documentation
- [ ] Update `CLAUDE.md` if needed (sidebar photo pattern)

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`*

## Technical Details

### Sidebar card layout change
```
Before:                          After:
┌─────────────────────┐         ┌─────────────────────────┐
│ Іванов Іван          │         │ [📷] Іванов Іван         │
│ ID: 1 · Інженер     │         │      ID: 1 · Інженер    │
│ [Працює]             │         │      [Працює]            │
└─────────────────────┘         └─────────────────────────┘
```

### Photo URL in sidebar
```javascript
// Reuse same pattern as card header
const base = import.meta.env.VITE_API_URL || '';
// In template: :src="`${base}/${employee.photo}`"
```

## Post-Completion

**Manual verification**:
- Test with mix of employees (some with photos, some without)
- Check sidebar scrolling with many employees
- Verify on narrow screen widths
