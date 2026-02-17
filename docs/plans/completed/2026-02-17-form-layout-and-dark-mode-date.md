# Form Layout Fix and Dark Mode Date Input Visibility

## Overview

Two problems visible in the reprimand "Новий запис" form (and all other modal forms):

1. **Form layout is broken** — `.form-group` has no CSS, so browser defaults make labels and inputs render horizontally as inline elements. Fields have inconsistent widths, no consistent spacing. Fix: add proper vertical stack CSS for `.form-group` (label above input, full-width inputs).

2. **Date input invisible in dark mode** — The browser's native date picker (`дд.мм.рррр` + calendar icon) doesn't adapt to dark backgrounds. The calendar icon and date text are nearly invisible on `#1f1f1f` background. Fix: add `color-scheme: dark` and invert the calendar picker indicator in dark mode.

Applies to all 17 `.form-group` occurrences across `EmployeeCardsView.vue` and `TemplatesView.vue`.

## Context

- **CSS file**: `client/src/styles.css`
  - `label {}` at line 773 — has `font-size: 12px; color: var(--muted)` but no layout
  - `.form-group` — **not defined at all** in styles.css (bug)
  - `[data-theme="dark"]` block at line 22 — `--input-bg: #1f1f1f` but no date-specific overrides
  - No `::-webkit-calendar-picker-indicator` rule anywhere
- **Affected views**: `EmployeeCardsView.vue` (12 form-groups), `TemplatesView.vue` (5 form-groups)
- **Related plan**: `2026-02-17-modal-redesign-clean.md` — fixes modal header/footer structure (independent)

## Development Approach

- **Testing approach**: Regular (CSS/visual changes — no unit tests, visual browser verification)
- Changes are pure CSS additions in one file
- Minimal risk: `.form-group` has no existing CSS so no breakage expected

## Progress Tracking

- Mark completed items with `[x]` immediately when done

## Implementation Steps

### Task 1: Add .form-group CSS for vertical stack layout

Add `.form-group` to `styles.css` so all modal forms get proper label-above-input layout with full-width fields.

- [x] In `styles.css`, after the `label {}` block (after line ~778), add `.form-group` CSS:
  ```css
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    box-sizing: border-box;
  }
  ```
- [x] Verify in browser (light mode): open reprimand "Новий запис" form — label appears above input, all fields are full-width
- [x] Verify: status change modal form looks good
- [x] Verify: template create/edit dialog looks good
- [x] Verify: document upload modal form looks good

### Task 2: Fix date input visibility in dark mode

The native browser date picker is light-themed by default. Add CSS to make it dark-aware.

- [x] In `styles.css`, inside the `[data-theme="dark"]` block (near other dark overrides for inputs), add:
  ```css
  [data-theme="dark"] input[type="date"],
  [data-theme="dark"] input[type="time"] {
    color-scheme: dark;
  }

  [data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8);
    cursor: pointer;
  }
  ```
- [x] Toggle to dark mode in browser, open reprimand form — verify date field text `дд.мм.рррр` is clearly visible
- [x] Verify calendar icon (□) is now visible/white
- [x] Check other views with date inputs in dark mode (status change modal, doc edit dates modal, employee card date fields) — all should look correct

### Task 3: Verify acceptance criteria

- [x] Light mode: all modal forms — label above input, inputs full width, proper spacing between fields
- [x] Dark mode: date inputs are fully visible (text + calendar icon)
- [x] No regressions in non-modal forms (employee card `.field` layout — separate class, not affected)
- [x] `TemplatesView.vue` create template dialog still looks good
- [x] Reprimand "Новий запис" form: all 4 fields (Дата, Тип, № наказу, Примітка) are properly stacked and full-width

## Technical Details

**Why `.form-group` affects only modal forms:**
- Employee card main form uses `.field` class (separate, already has `flex-direction: column`)
- Only modal forms use `.form-group` (17 occurrences across 2 files)
- Adding `.form-group` CSS adds vertical layout with no risk to `.field` layout

**Date input dark mode fix:**
- `color-scheme: dark` tells the browser to render native form controls (date picker popup, spinners) in dark mode
- `::-webkit-calendar-picker-indicator` with `filter: invert(0.8)` makes the icon white-ish without being harsh white
- Works in Chromium-based browsers (project uses Chrome for E2E tests per playwright.config.js)

## Post-Completion

- Visual test in Firefox if needed (`::-webkit-calendar-picker-indicator` is webkit-specific; Firefox date inputs may look different)
