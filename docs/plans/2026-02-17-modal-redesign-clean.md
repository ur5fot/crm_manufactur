# Modal Redesign: Modern Clean

## Overview

All popups/modals in the application have two structural problems visible in the UI:

1. **Close button falls below the modal title** — `EmployeeCardsView.vue` modals use `.card-header` / `.card-content` classes, but CSS only defines styles for `.vacation-notification-header` / `.vacation-notification-body`. The `.card-header` has no flex layout, so `&times;` button is not right-aligned in the header.
2. **ALL CAPS form labels** — Global `label {}` CSS rule has `text-transform: uppercase`, making every form label shout.

Goal: fix the structure, clean up modal appearance, make it look polished and consistent.

## Context

- **Modals with wrong class names** (using `.card-header`/`.card-content`): all 6+ modals in `EmployeeCardsView.vue`
- **Modals with correct class names** (using `.vacation-notification-header`/`.vacation-notification-body`): `DashboardView.vue`, `TemplatesView.vue`
- **CSS file**: `client/src/styles.css` — `label {}` at line 773 has `text-transform: uppercase`
- **Modal CSS**: `.vacation-notification-*` classes at lines 1462–1640 in `styles.css`

## Development Approach

- **Testing approach**: Regular (code first, visual verification)
- Complete each task fully before moving to the next
- Visual changes — no unit tests needed, verify in browser

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix

## Implementation Steps

### Task 1: Fix structural class mismatch in EmployeeCardsView.vue

All modals in `EmployeeCardsView.vue` use `.card-header` / `.card-content` but CSS has no styles for these — change them to `.vacation-notification-header` / `.vacation-notification-body`.

Modals to fix (by line ~):
- Unsaved changes popup (~859) — uses `.card-header`, no `.card-content`
- Status change popup (~883) — uses `.card-header` + `.card-content`
- Document upload popup (~914) — uses `.card-header` + `.card-content`
- Document edit dates popup (~944) — uses `.card-header` + `.card-content`
- Clear confirm popup (~970) — uses `.card-header`, no `.card-content`
- Status history popup (~987) — uses `.card-header` + `.card-content`
- Reprimands popup (~1034) — uses `.card-header` + `.card-content`

Steps:
- [ ] In `EmployeeCardsView.vue`: replace all `class="card-header"` with `class="vacation-notification-header"` inside `.vacation-notification-modal`
- [ ] In `EmployeeCardsView.vue`: replace all `class="card-content"` with `class="vacation-notification-body"` inside `.vacation-notification-modal`
- [ ] Wrap button-group in modals with `<div class="vacation-notification-footer">` and remove bare `.button-group` from modal bottom
- [ ] Add `.vacation-notification-footer` CSS in `styles.css` (padding, border-top, flex layout)
- [ ] Verify all 7 modals: open each, confirm close button is top-right, title is in header

### Task 2: Fix ALL CAPS labels in modals

The global `label {}` rule forces uppercase on all labels. For modals this looks bad — labels should be normal case.

- [ ] In `styles.css` at line 773: change `label` block — remove `text-transform: uppercase` and `letter-spacing: 0.08em`, keep `font-size: 12px` and `color: var(--muted)`
- [ ] Add `text-transform: uppercase; letter-spacing: 0.08em` explicitly to table `th` selectors that need it (check: `.summary-table th`, `.status-history-table th` already have it — no change needed)
- [ ] Check form labels in DashboardView, TemplatesView, ReportsView, ImportView — they should now look better (not ALL CAPS)
- [ ] Verify no visual regressions: table headers should still be uppercase (they have their own explicit rules)

### Task 3: Polish modal CSS for a clean modern look

Improve the visual design of the modal itself:

- [ ] In `styles.css`: update `.vacation-notification-modal` — add `overflow: hidden` so header border-radius clips correctly
- [ ] Update `.vacation-notification-header`: make bg slightly tinted (`background: var(--bg-accent)`) so header stands out from body
- [ ] Update `.vacation-notification-header h3`: increase to `font-size: 16px`, `font-weight: 600`, keep `color: var(--ink)`, add `margin: 0`
- [ ] Update `.close-btn`: reduce font-size to `24px`, tighten the button size to `28px × 28px` for less visual weight
- [ ] Update `.vacation-notification-body`: add `padding: 20px 24px`, ensure vertical spacing between form groups
- [ ] Update `.vacation-notification-footer` (from Task 1): `padding: 16px 24px`, `border-top: 1px solid var(--line)`, flex row, gap 10px
- [ ] In dark theme section (`[data-theme="dark"]`): check `--modal-bg` is set to the dark modal color (already `#2d2d2d` at line 39 — verify it's applied)
- [ ] Visual check: open each modal type, confirm header/body/footer look clean, rounded corners clip properly

### Task 4: Verify acceptance criteria

- [ ] Open status change modal — close button is top-right, labels are normal case, layout looks clean
- [ ] Open reprimands modal — same checks, table with data looks right
- [ ] Open document upload modal — header fixed
- [ ] Open document edit dates modal — header fixed
- [ ] Open status history modal — wide modal looks good
- [ ] Open DashboardView notifications — still look correct (they were already using correct classes)
- [ ] Open TemplatesView create/edit dialog — still looks correct
- [ ] Dark mode: toggle theme, all modals look correct in dark mode
- [ ] No ALL CAPS labels in any modal form

## Technical Details

**Class name mapping** (old → new in EmployeeCardsView):
```
.card-header  →  .vacation-notification-header
.card-content →  .vacation-notification-body
```

**New footer pattern**:
```html
<div class="vacation-notification-footer">
  <button class="primary">...</button>
  <button class="secondary">...</button>
</div>
```

**Label fix** (styles.css line 773):
```css
/* Before */
label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

/* After */
label {
  font-size: 12px;
  color: var(--muted);
}
```

## Post-Completion

- Manual visual testing across all views in both light and dark themes
- Check mobile layout (modals use `width: 90%` already, should be fine)
