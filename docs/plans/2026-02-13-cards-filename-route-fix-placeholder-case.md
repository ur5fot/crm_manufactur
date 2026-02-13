# Employee Card Document Filename, Cards Route Bug, and Placeholder Case Variants

## Overview

Three changes:

1. Include employee last_name in generated document filenames (currently only template name + employee_id + timestamp)
2. Fix bug: navigating away from cards and back loses the selected employee ID in the URL, causing it to reset to the first employee on refresh
3. Add uppercase and capitalized variants for all text placeholders (e.g., {full_name_upper}, {full_name_cap})

## Context

- Files involved:
  - Modify: `server/src/index.js` (filename generation at line ~1487, placeholder-preview endpoint at line ~1003)
  - Modify: `server/src/docx-generator.js` (prepareData function at line ~73)
  - Modify: `client/src/App.vue` (switchView function at line ~204, route.name watcher at line ~253)
  - Modify: `server/test/docx-generator.test.js` (test case variants)
- Related patterns: existing filename sanitization regex, existing placeholder generation in prepareData
- Dependencies: none

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add last_name to generated document filename

**Files:**
- Modify: `server/src/index.js`

- [x] In POST /api/templates/:id/generate (line ~1487), change filename from `${sanitizedName}_${employee_id}_${timestamp}.docx` to `${sanitizedName}_${sanitizedLastName}_${employee_id}_${timestamp}.docx` where sanitizedLastName uses the same sanitization regex on employee.last_name
- [x] Update existing tests or add a test that verifies the generated filename includes the employee last name
- [x] Run project test suite - must pass before task 2

### Task 2: Fix cards route losing employee ID on navigation

**Files:**
- Modify: `client/src/App.vue`

- [ ] In switchView function (line ~207-208), when view is 'cards', preserve the currently selected employee ID: if selectedId.value exists, push `{ name: 'cards', params: { id: selectedId.value } }` instead of `{ name: 'cards' }` (without params)
- [ ] Run project test suite - must pass before task 3

### Task 3: Add uppercase and capitalized placeholder variants

**Files:**
- Modify: `server/src/docx-generator.js`
- Modify: `server/src/index.js`

- [ ] In prepareData (docx-generator.js), after building all prepared placeholders (including declension), generate two extra variants for every text placeholder: `{key_upper}` (all uppercase via .toUpperCase()) and `{key_cap}` (first letter uppercase via capitalize helper). Skip empty values and non-text fields (dates, IDs, etc. are fine to include - the transformation is harmless on them)
- [ ] In /api/placeholder-preview endpoint (index.js), add the _upper and _cap variants to the placeholders array so they appear on the reference page. Use a new group name like 'case_variants' or add them inline next to their source placeholder
- [ ] Add/update tests in docx-generator.test.js to verify _upper and _cap variants are generated correctly
- [ ] Run project test suite - must pass before task 4

### Task 4: Verify acceptance criteria

- [ ] Manual test: generate a document from the cards page and verify filename contains employee last name
- [ ] Manual test: on cards page select employee #2, navigate to dashboard, click "Картки" in sidebar, refresh page - should stay on employee #2
- [ ] Manual test: create a template with {full_name_upper} and {full_name_cap} placeholders, generate document, verify uppercase/capitalized output
- [ ] Run full test suite: `cd server && npm test` and `npm run test:e2e`
- [ ] Verify test coverage for new functionality

### Task 5: Update documentation

- [ ] Update CLAUDE.md if internal patterns changed (placeholder case variants section)
- [ ] Move this plan to `docs/plans/completed/`
