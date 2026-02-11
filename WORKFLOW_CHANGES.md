# Workflow Changes

## 2026-02-11: Migration from BMAD to Ralphex

### Changes

**Workflow orchestration:**
- **Removed:** BMAD skills (`/bmad-bmm-dev-story`, `/bmad-bmm-code-review`, etc.)
- **Added:** [Ralphex](https://github.com/umputun/ralphex) - external task orchestrator

**How Ralphex works:**
- User runs once: `ralphex docs/plans/feature.md`
- Reads plan file (markdown with `- [ ]` checkboxes)
- **Launches fresh Claude Code session for EACH task**
- Executes tasks sequentially until all checkboxes complete
- Runs validation commands (tests, linters) after each task
- Automatically commits changes and proceeds to next task
- Multi-phase code review: 5 agents → codex → 2 agents final
- Moves completed plans to `docs/plans/completed/`

### Why Ralphex

**Benefits:**
1. **Fresh context per task** - each task in new Claude Code session prevents context bloat
2. **Zero setup** - works immediately with sensible defaults
3. **Autonomous execution** - runs entire plan unattended with automatic retries
4. **Multi-phase reviews** - 5 parallel agents + external tool + final review
5. **Git automation** - auto-commits after validation passes
6. **Web dashboard** - real-time monitoring via `--serve` flag
7. **Docker isolation** - safer autonomous execution with containerization
8. **Customizable agents** - template system with configurable review personas

### Git Commit Workflow (CHANGED)

**With Ralphex orchestration:**
- Ralphex **automatically commits** after successful task validation
- Agent does NOT ask user about commits (Ralphex handles git workflow)
- Commits include task changes + validation results
- Auto-generated commit messages based on task description

**Manual commits (outside Ralphex):**
- When working without Ralphex: **always ask user before committing**
- Provide choice: commit now / commit later
- Include `Co-Authored-By: Claude Sonnet 4.5` trailer

See [CLAUDE.md](CLAUDE.md) for full guidelines.

### Documentation Updated

- `CLAUDE.md` - Added "Task Orchestration with Ralphex" section
- `WORKFLOW_CHANGES.md` - This file updated
- Legacy BMAD artifacts preserved in `_bmad-output/` for historical reference

### Notes

- `_bmad/` directory removed from project (no longer needed)
- BMAD output artifacts kept in `_bmad-output/` for reference
- Ralphex CLI installed separately (not in project dependencies)

---

## Archive: Previous BMAD Workflow (2026-02-09)

<details>
<summary>Click to expand legacy BMAD workflow notes</summary>

### Улучшение git commit workflow

**dev-story workflow** (Step 11):
- Добавлена опция "Закоммитить после code review"
- 3 варианта: коммит сейчас / после review / сам позже

**code-review workflow** (Step 6):
- Умная логика: определяет был ли коммит после story
- Если story закоммичена → предлагает коммит для fixes
- Если нет → предлагает объединённый коммит (story + fixes)

**Изменённые файлы:**
- `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- `_bmad/bmm/workflows/4-implementation/code-review/instructions.xml`

</details>
