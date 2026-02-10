# Move "New Employee" button from global header to Cards view left sidebar

**Description:**
Move the "New Employee" button (➕) from the global header tab bar to the left sidebar panel in the Cards view, so new employees can only be created from the /cards route where the employee list is visible.

**Files involved:**
- Modify: `client/src/App.vue`
- Modify: `client/src/styles.css`

**Related patterns:**
- Icon-only button pattern already used for refresh/new employee buttons
- Panel-header layout in Cards view left sidebar

**Dependencies:**
- None (pure UI restructuring)

## Implementation Approach

**Testing approach:** Regular (code first, then manual validation)

- Move button from global header (topbar) to Cards view left sidebar panel
- Only show button when currentView === 'cards'
- Keep existing `startNew()` function behavior unchanged
- Update CSS for proper positioning within `panel-header` of left sidebar
- Complete each task fully before moving to the next
- **CRITICAL: Manual validation required for all UI changes**

## Tasks

### Task 1: Remove button from global header

**Files:**
- Modify: `client/src/App.vue`

- [x] Remove "New Employee" button (➕) from global header tab bar (lines ~1965-1972)
- [x] Verify refresh button (🔄) remains in header
- [x] Manual test: Verify button no longer appears in header on any view

### Task 2: Add button to Cards view sidebar

**Files:**
- Modify: `client/src/App.vue`

- [ ] Add "New Employee" button to Cards view left sidebar panel-header (after "Співробітники" title, before status-bar)
- [ ] Keep same `@click="startNew"` handler and `title` attribute for accessibility
- [ ] Ensure button only renders when in Cards view context
- [ ] Manual test: Button appears in /cards left sidebar
- [ ] Manual test: Button does NOT appear in /table, /reports, /dashboard, /import, /logs

### Task 3: Style adjustments

**Files:**
- Modify: `client/src/styles.css`

- [ ] Verify existing `.tab-icon-btn` styles work for panel-header placement
- [ ] Add specific styles if needed for sidebar button positioning
- [ ] Ensure button aligns properly with "Співробітники" title and status count
- [ ] Manual test: Button styling matches design (icon-only, proper spacing, hover effects)

## Validation

- [ ] Manual test: Navigate to /cards - button appears in left sidebar
- [ ] Manual test: Navigate to /table, /reports, /dashboard - button does NOT appear
- [ ] Manual test: Click button in /cards - creates new employee form correctly
- [ ] Manual test: Verify button styling matches design (icon-only, proper spacing)
- [ ] Manual test: Verify button hover tooltip shows "Новий працівник"
- [ ] Verify refresh button (🔄) still works independently in header

## Completion

- [ ] Update CLAUDE.md if UI structure changed significantly (document button location)
- [ ] Move this plan to `docs/plans/completed/`
