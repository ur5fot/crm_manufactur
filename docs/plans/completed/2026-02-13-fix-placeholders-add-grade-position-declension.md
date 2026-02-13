# Fix placeholder extraction and add grade/position declension

## Overview

Two changes:

1. Fix placeholder extraction from DOCX templates - currently fails when Word splits `{placeholder}` across multiple XML runs (e.g., `<w:t>{</w:t><w:t>full_name}</w:t>`). Use docxtemplater's `getFullText()` method which merges runs before extraction.

2. Add Ukrainian grammatical declension for `grade` (Посада) and `position` (Звання) fields using the `shevchenko-ext-military` npm extension. Display these as a SEPARATE group from name declension on the placeholder-reference page. Add per-field indeclinable controls (`indeclinable_grade`, `indeclinable_position`) in fields_schema.csv for cases where grade/position should not be declined.

## Context

- Files involved:
  - `server/src/docx-generator.js` - extractPlaceholders function (fix run-splitting issue), prepareData (add grade/position declension)
  - `server/src/declension.js` - add grade/position declension function
  - `server/src/index.js` - update placeholder-preview endpoint to include new declension group
  - `server/test/declension.test.js` - add tests for grade/position declension
  - `server/test/docx-generator.test.js` - add test for split-run placeholder extraction
  - `client/src/App.vue` - update placeholder-reference page to show new group
  - `data/fields_schema.csv` - add indeclinable_grade and indeclinable_position fields
- Related patterns: existing name declension in `declension.js`, placeholder-preview API endpoint
- Dependencies: `shevchenko-ext-military` npm package (new dependency)

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Fix placeholder extraction from DOCX templates

**Files:**
- Modify: `server/src/docx-generator.js`
- Modify: `server/test/docx-generator.test.js`

- [x] In `extractPlaceholders()`, replace raw XML regex search with `doc.getFullText()` approach: instantiate Docxtemplater, call `getFullText()` to get merged plain text, then apply the existing regex on that text
- [x] Add a unit test that creates a DOCX with a placeholder split across multiple XML runs and verifies `extractPlaceholders()` finds it
- [x] Run `node server/test/docx-generator.test.js` - must pass

### Task 2: Add grade/position declension using shevchenko-ext-military

**Files:**
- Modify: `server/package.json` (add dependency)
- Modify: `server/src/declension.js`
- Modify: `server/src/docx-generator.js` (prepareData function)
- Modify: `server/test/declension.test.js`
- Modify: `data/fields_schema.csv` (add indeclinable_grade, indeclinable_position fields)

- [x] Install `shevchenko-ext-military` package: `cd server && npm install shevchenko-ext-military`
- [x] Add two new fields to `data/fields_schema.csv`: `indeclinable_grade` (label: "Посада не відмінюється") and `indeclinable_position` (label: "Звання не відмінюється") as text fields, in the same style as existing `indeclinable_name` and `indeclinable_first_name`
- [x] In `declension.js`, add a new exported function `generateDeclinedGradePosition(data)` that:
  - Imports and uses `shevchenko-ext-military` extension
  - Declines `grade` field (mapped to `militaryAppointment`) across 6 cases: `grade_genitive`, `grade_dative`, `grade_accusative`, `grade_vocative`, `grade_locative`, `grade_ablative`
  - Declines `position` field (mapped to `militaryRank`) across 6 cases: `position_genitive`, `position_dative`, etc.
  - Respects `indeclinable_grade` and `indeclinable_position` flags (when 'yes', return nominative for all cases)
  - Returns empty strings when source fields are empty
- [x] In `docx-generator.js` `prepareData()`, call `generateDeclinedGradePosition(data)` and merge results into prepared data (alongside existing name declension)
- [x] Add tests for grade/position declension: test with sample values like grade="командир роти", position="капітан"; test indeclinable flags; test empty values
- [x] Run `node server/test/declension.test.js` - must pass

### Task 3: Update placeholder-reference page with new declension group

**Files:**
- Modify: `server/src/index.js` (placeholder-preview endpoint)
- Modify: `client/src/App.vue` (placeholder-reference display)

- [x] In the `/api/placeholder-preview/:employeeId?` endpoint, call `generateDeclinedGradePosition(employee)` and add the resulting 12 placeholders to the response with group `'declension_fields'` (separate from existing `'declension'` group for names) and Ukrainian labels (e.g., "Посада (родовий)", "Звання (давальний)")
- [x] In the frontend placeholder-reference view, add `'declension_fields'` to the group iteration list (after `'declension'`), with header "Відмінювання посади та звання" (distinct from the existing "Відмінювання імен" header for names)
- [x] Run E2E tests: `npm run test:e2e` - must pass

### Task 4: Verify acceptance criteria

- [x] Manual test: upload a DOCX template where Word has split a placeholder across runs - verify placeholders appear on Templates page
- [x] Manual test: go to placeholder-reference page and verify grade/position declined placeholders appear in their own separate group with correct preview values
- [x] Manual test: generate a document using a template with `{grade_genitive}` placeholder - verify correct value in output DOCX
- [x] Run full test suite: `cd server && npm test` and `npm run test:e2e`

### Task 5: Update documentation

- [x] Update CLAUDE.md: add grade/position declension to "Name Declension Placeholders" section, mention shevchenko-ext-military dependency, document indeclinable_grade and indeclinable_position fields
- [x] Move this plan to `docs/plans/completed/`
