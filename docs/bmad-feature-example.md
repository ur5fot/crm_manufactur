# Приклад впровадження фічі через BMAD

## Фіча: Історія зарплат з візуалізацією

**Мета:** Додати можливість відстежувати історію змін зарплати кожного працівника та візуалізувати це у вигляді графіка.

---

## 📋 Крок 1: Дослідження та Design Thinking

### Команда:
```bash
/bmad-cis-design-thinking
```

### Діалог з Claude:

**Claude:** Давайте почнемо з фази **Empathize**. Хто користувачі цієї фічі?

**Ви:** HR менеджер та керівники відділів. Вони хочуть бачити історію підвищень зарплат, аналізувати тренди, готувати звіти для бухгалтерії.

**Claude:** Яку проблему це вирішує?

**Ви:** Зараз є тільки поточна зарплата. Коли хтось запитує "коли останній раз підвищували зарплату Іванову?", доводиться шукати в паперових наказах або логах змін.

*(продовжується діалог через всі фази: Define, Ideate, Prototype, Test)*

### Результат:
- Розуміння потреб користувачів
- Ключові use cases
- Можливі рішення

---

## 📝 Крок 2: Створення Product Brief

### Команда:
```bash
/bmad-bmm-create-product-brief
```

### Діалог:

**Claude:** Яка назва продукту/фічі?

**Ви:** Історія зарплат (Salary History)

**Claude:** Опишіть основну проблему

**Ви:** Відсутність історичних даних про зміни зарплат ускладнює аналіз та прийняття рішень

*(діалог продовжується)*

### Створений файл:
```
docs/product-brief-salary-history.md
```

### Зміст (приклад):
```markdown
# Product Brief: Історія зарплат

## Проблема
HR менеджери не мають швидкого доступу до історії змін зарплат...

## Рішення
Додати секцію "Історія зарплат" в картку працівника...

## Цільова аудиторія
- HR менеджери
- Керівники відділів
- Бухгалтерія

## Ключові функції
1. Перегляд історії змін зарплати
2. Графік змін за часом
3. Додавання нової зміни зарплати
4. Експорт історії в CSV
```

---

## 📐 Крок 3: Створення PRD (Product Requirements Document)

### Команда:
```bash
/bmad-bmm-create-prd
```

**Claude:** Створюємо новий PRD на основі Product Brief?

**Ви:** Так

### Створений файл:
```
docs/prd-salary-history.md
```

### Зміст (приклад):
```markdown
# PRD: Історія зарплат

## 1. Overview
**Feature:** Salary History Tracking
**Priority:** High
**Target Release:** Sprint 3

## 2. User Stories
- As HR manager, I want to see salary change history...
- As department head, I want to visualize salary growth...

## 3. Requirements

### 3.1 Functional
- FR-1: System shall store salary changes with date, amount, reason
- FR-2: System shall display salary history in chronological order
- FR-3: System shall generate line chart of salary changes
- FR-4: System shall allow adding new salary change entry

### 3.2 Non-functional
- NFR-1: History should load in <500ms
- NFR-2: Support minimum 50 salary changes per employee

## 4. Data Model
```csv
employee_id;change_date;old_salary;new_salary;reason;changed_by
```

## 5. UI/UX Requirements
- New tab "Історія зарплат" in employee card
- Table with columns: Date, Old, New, Change %, Reason
- Line chart below table
```

---

## 🏗️ Крок 4: Створення Architecture

### Команда:
```bash
/bmad-bmm-create-architecture
```

### Діалог:

**Claude:** Які архітектурні рішення потрібно прийняти?

**Ви:**
1. Де зберігати історію - окремий CSV чи в employees.csv?
2. Яку бібліотеку для графіків використовувати?
3. Як автоматично логувати зміни зарплат?

*(Claude задає питання, допомагає прийняти рішення)*

### Створений файл:
```
docs/architecture-salary-history.md
```

### Зміст (приклад):
```markdown
# Architecture Decision Record: Salary History

## Decision 1: Окремий файл salary_history.csv
**Context:** Потрібно зберігати історію змін зарплат

**Options:**
A) Окремий CSV файл `salary_history.csv`
B) Додати поля в `employees.csv` (salary_history_json)
C) Використовувати SQLite

**Decision:** Option A - окремий CSV

**Rationale:**
- Консистентно з існуючою архітектурою (CSV-based)
- Простіше для backup та аналізу в Excel
- Необмежена кількість записів

## Decision 2: Chart.js для візуалізації
**Decision:** Використовувати Chart.js

**Rationale:**
- Легковагий (11KB gzipped)
- Не потребує додаткових залежностей
- Добра документація та приклади

## Decision 3: Автоматичне логування через PUT /api/employees/:id
**Decision:** Middleware в Express для автодетекту змін

**Implementation:**
- При PUT запиті порівнювати old vs new salary_amount
- Якщо відрізняється - автоматично додавати запис в salary_history.csv
- Зберігати: timestamp, employee_id, old, new, user (з JWT token)
```

---

## 🎨 Крок 5: UX Design (опціонально)

### Команда:
```bash
/bmad-bmm-create-ux-design
```

**Claude:** Які екрани потрібно спроєктувати?

**Ви:** Вкладка "Історія зарплат" в картці працівника

*(діалог про UI patterns, компоненти, flows)*

### Створений файл:
```
docs/ux-design-salary-history.md
```

---

## 🎯 Крок 6: Створення діаграм

### 6.1 Data Flow Diagram
```bash
/bmad-bmm-create-excalidraw-dataflow
```

**Створюється:** `diagrams/salary-history-dataflow.excalidraw`

### 6.2 Wireframe
```bash
/bmad-bmm-create-excalidraw-wireframe
```

**Створюється:** `diagrams/salary-history-wireframe.excalidraw`

---

## ✅ Крок 7: Перевірка готовності

### Команда:
```bash
/bmad-bmm-check-implementation-readiness
```

**Claude виконує adversarial review:**

```
🔍 Перевірка PRD, Architecture, та інших документів...

✅ PRD: Complete
  - User stories defined
  - Requirements clear
  - Data model specified

❌ Issues Found:
  1. PRD не вказує, що робити з існуючими працівниками без історії
  2. Architecture не описує міграцію даних
  3. Відсутня обробка edge cases (negative salary, future dates)

📋 Recommendations:
  - Додати Migration Plan секцію
  - Описати валідацію вхідних даних
  - Додати error handling scenarios
```

**Ви виправляєте проблеми та запускаєте знову**

```
✅ All checks passed. Ready for implementation.
```

---

## 📖 Крок 8: Створення Epics and Stories

### Команда:
```bash
/bmad-bmm-create-epics-and-stories
```

**Claude:** Аналізую PRD та Architecture...

### Створений файл:
```
docs/epics-and-stories/epic-salary-history.md
```

### Зміст (приклад):
```markdown
# Epic: Salary History Tracking

## Epic Overview
Implement salary change tracking with visualization

**Estimated Effort:** 5 stories, ~8 hours

---

## Story 1: Backend - Salary History Data Model
**ID:** SH-001
**Priority:** High
**Depends on:** None

### Description
Create salary_history.csv file structure and API endpoints

### Acceptance Criteria
- [ ] Create data/salary_history.csv with schema
- [ ] GET /api/employees/:id/salary-history endpoint
- [ ] POST /api/employees/:id/salary-history endpoint
- [ ] Validation: date not in future, new_salary > 0
- [ ] Unit tests with 90% coverage

### Technical Notes
- Schema: employee_id;change_date;old_salary;new_salary;reason;changed_by;timestamp
- Auto-generate ID: SH-{timestamp}
- CSV with UTF-8 BOM, `;` delimiter

### Tasks
- [ ] Create salary_history.csv template
- [ ] Add schema definition to schema.js
- [ ] Implement GET endpoint
- [ ] Implement POST endpoint
- [ ] Add validation middleware
- [ ] Write unit tests

---

## Story 2: Backend - Auto-logging salary changes
**ID:** SH-002
**Priority:** High
**Depends on:** SH-001

### Description
Automatically log salary changes when employee record updated

### Acceptance Criteria
- [ ] Middleware detects salary_amount changes
- [ ] Auto-creates salary history entry
- [ ] Preserves old and new values
- [ ] Logs user who made change
- [ ] Does NOT create entry if salary unchanged

### Tasks
- [ ] Create salaryChangeMiddleware.js
- [ ] Integrate in PUT /api/employees/:id
- [ ] Add tests for auto-logging
- [ ] Test edge case: same salary value

---

## Story 3: Frontend - Salary History UI Component
**ID:** SH-003
**Priority:** High
**Depends on:** SH-001

### Description
Display salary history in employee card

### Acceptance Criteria
- [ ] New tab "Історія зарплат" in employee card
- [ ] Table displays: Date, Old, New, Change %, Reason
- [ ] Sorted by date descending (newest first)
- [ ] Shows "Немає історії" if empty
- [ ] Loading state while fetching data

### Tasks
- [ ] Add salaryHistory array to component state
- [ ] Create fetchSalaryHistory() method
- [ ] Add tab UI in employee card
- [ ] Create history table template
- [ ] Format currency with spaces (1 000 грн)
- [ ] Calculate and display % change

---

## Story 4: Frontend - Salary History Chart
**ID:** SH-004
**Priority:** Medium
**Depends on:** SH-003

### Description
Visualize salary changes as line chart

### Acceptance Criteria
- [ ] Install and configure Chart.js
- [ ] Line chart below history table
- [ ] X-axis: dates, Y-axis: salary amount
- [ ] Tooltips show exact values
- [ ] Responsive (adapts to card width)
- [ ] Handles 1 data point (shows single dot)

### Tasks
- [ ] npm install chart.js in client
- [ ] Create chart component/method
- [ ] Configure chart options
- [ ] Bind data from salaryHistory
- [ ] Add responsive container

---

## Story 5: Frontend - Add Salary Change Dialog
**ID:** SH-005
**Priority:** Medium
**Depends on:** SH-003

### Description
Allow adding new salary change entries

### Acceptance Criteria
- [ ] "Додати зміну" button above history table
- [ ] Modal dialog with form: date, new salary, reason
- [ ] Date picker (default: today)
- [ ] Number input for new salary
- [ ] Textarea for reason (optional)
- [ ] Validation: date not future, salary > 0
- [ ] On save: POST to API, refresh table and chart
- [ ] Success/error notifications

### Tasks
- [ ] Create modal dialog component
- [ ] Add form fields
- [ ] Implement validation
- [ ] POST to /api/employees/:id/salary-history
- [ ] Refresh UI after success
- [ ] Error handling

---

## Migration Plan

### Initial data migration
Create salary_history.csv and add initial entry for each employee with current salary:

```csv
employee_id;change_date;old_salary;new_salary;reason;changed_by;timestamp
1;2024-01-01;;;5000;Початкова зарплата;system;2024-01-01T00:00:00Z
```

### Implementation order
1. SH-001 (backend data)
2. SH-002 (auto-logging)
3. SH-003 (UI table)
4. SH-004 (chart)
5. SH-005 (add dialog)

### Testing strategy
- Unit tests for each API endpoint
- Integration tests for auto-logging
- E2E test: full flow (view → add → verify)
```

---

## 🚀 Крок 9: Sprint Planning

### Команда:
```bash
/bmad-bmm-sprint-planning
```

### Створений файл:
```
sprint-status.yaml
```

### Зміст:
```yaml
sprint:
  name: "Sprint 3: Salary History"
  start_date: "2024-02-01"
  end_date: "2024-02-14"

epics:
  - id: "epic-salary-history"
    title: "Salary History Tracking"
    status: "in_progress"
    stories:
      - id: "SH-001"
        title: "Backend - Salary History Data Model"
        status: "ready"
        assigned_to: ""

      - id: "SH-002"
        title: "Backend - Auto-logging salary changes"
        status: "pending"
        assigned_to: ""
        blocked_by: ["SH-001"]

      - id: "SH-003"
        title: "Frontend - Salary History UI Component"
        status: "pending"
        assigned_to: ""
        blocked_by: ["SH-001"]

      - id: "SH-004"
        title: "Frontend - Salary History Chart"
        status: "pending"
        assigned_to: ""
        blocked_by: ["SH-003"]

      - id: "SH-005"
        title: "Frontend - Add Salary Change Dialog"
        status: "pending"
        assigned_to: ""
        blocked_by: ["SH-003"]
```

---

## 💻 Крок 10: Розробка першої Story

### Команда:
```bash
/bmad-bmm-dev-story SH-001
```

**Claude:**
```
📖 Loading story: SH-001 - Backend - Salary History Data Model
📋 Tasks:
  1. Create salary_history.csv template
  2. Add schema definition to schema.js
  3. Implement GET endpoint
  4. Implement POST endpoint
  5. Add validation middleware
  6. Write unit tests

🚀 Starting implementation...
```

**Claude створює:**

1. **data/salary_history.template.csv**
```csv
employee_id;change_date;old_salary;new_salary;reason;changed_by;timestamp
```

2. **server/src/schema.js** (оновлює)
```javascript
const SALARY_HISTORY_COLUMNS = [
  'employee_id',
  'change_date',
  'old_salary',
  'new_salary',
  'reason',
  'changed_by',
  'timestamp'
];
```

3. **server/src/index.js** (додає endpoints)
```javascript
// GET salary history for employee
app.get('/api/employees/:id/salary-history', (req, res) => {
  const { id } = req.params;
  const history = store.getSalaryHistory(id);
  res.json(history);
});

// POST new salary change
app.post('/api/employees/:id/salary-history', (req, res) => {
  const { id } = req.params;
  const { change_date, new_salary, reason } = req.body;

  // Validation
  if (!change_date || !new_salary) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (new Date(change_date) > new Date()) {
    return res.status(400).json({ error: 'Date cannot be in future' });
  }

  if (new_salary <= 0) {
    return res.status(400).json({ error: 'Salary must be positive' });
  }

  const entry = store.addSalaryHistory(id, {
    change_date,
    new_salary,
    reason: reason || '',
    changed_by: 'current_user' // TODO: get from auth
  });

  res.json(entry);
});
```

4. **server/src/store.js** (додає методи)
```javascript
function getSalaryHistory(employeeId) {
  const history = readCSV('data/salary_history.csv');
  return history.filter(entry => entry.employee_id === employeeId);
}

function addSalaryHistory(employeeId, data) {
  const employee = getEmployeeById(employeeId);
  const history = readCSV('data/salary_history.csv');

  const entry = {
    employee_id: employeeId,
    change_date: data.change_date,
    old_salary: employee.salary_amount || '',
    new_salary: data.new_salary,
    reason: data.reason,
    changed_by: data.changed_by,
    timestamp: new Date().toISOString()
  };

  history.push(entry);
  writeCSV('data/salary_history.csv', history);
  return entry;
}
```

5. **Tests**
```javascript
// server/tests/salary-history.test.js
describe('Salary History API', () => {
  test('GET /api/employees/:id/salary-history returns array', async () => {
    const res = await request(app).get('/api/employees/1/salary-history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST validates future dates', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const res = await request(app)
      .post('/api/employees/1/salary-history')
      .send({
        change_date: futureDate.toISOString(),
        new_salary: 5000
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('future');
  });

  // ... більше тестів
});
```

**Claude запускає тести:**
```bash
npm test -- salary-history.test.js
```

**Результат:**
```
✓ GET /api/employees/:id/salary-history returns array (23ms)
✓ POST validates future dates (15ms)
✓ POST validates positive salary (12ms)
✓ POST creates history entry (45ms)

Tests: 4 passed, 4 total
Coverage: 92%
```

**Claude оновлює sprint-status.yaml:**
```yaml
- id: "SH-001"
  status: "completed"  # was "ready"
  completed_date: "2024-02-01"
```

---

## 🔍 Крок 11: Code Review

### Команда (після кожної story):
```bash
/bmad-bmm-code-review SH-001
```

**Claude (ADVERSARIAL режим):**

```
🔴 CRITICAL ISSUES (must fix):

1. **Security vulnerability** - No authentication check
   Location: server/src/index.js:145
   Issue: changed_by hardcoded as 'current_user', no JWT validation
   Fix: Add auth middleware, extract user from token

2. **Data integrity** - Race condition in addSalaryHistory
   Location: server/src/store.js:78
   Issue: Read-modify-write without locking
   Fix: Use file locking or atomic writes

3. **Missing error handling** - File not found
   Location: server/src/store.js:72
   Issue: readCSV will crash if salary_history.csv doesn't exist
   Fix: Check file existence, create if missing

🟡 WARNINGS (should fix):

4. **Performance** - Loading entire CSV on each request
   Impact: Will slow down with large history (>1000 records)
   Suggestion: Add caching or pagination

5. **Validation** - Missing salary range check
   Issue: Accepts unrealistic values (9999999999)
   Fix: Add max salary validation (e.g., 1,000,000)

🔵 SUGGESTIONS (nice to have):

6. **Code quality** - Duplicate date validation
   Suggestion: Extract to validateSalaryChange() helper

7. **Testing** - Missing edge case test
   Missing: Test with employee that has no salary_amount

---

📊 Coverage: 92% (target: 90%) ✅
🔒 Security scan: 2 issues ❌
📐 Architecture compliance: Pass ✅

**Verdict:** 3 critical issues must be fixed before merge
```

**Ви виправляєте проблеми і запускаєте review знову**

```
✅ All issues resolved. Code approved.
```

---

## 🔄 Крок 12: Продовження розробки

```bash
/bmad-bmm-dev-story SH-002  # Auto-logging
/bmad-bmm-code-review SH-002

/bmad-bmm-dev-story SH-003  # Frontend UI
/bmad-bmm-code-review SH-003

/bmad-bmm-dev-story SH-004  # Chart
/bmad-bmm-code-review SH-004

/bmad-bmm-dev-story SH-005  # Add dialog
/bmad-bmm-code-review SH-005
```

---

## 🧪 Крок 13: QA Automation

### Команда:
```bash
/bmad-bmm-qa-automate
```

**Claude:** Для якої фічі генерувати тести?

**Ви:** Salary History (всі stories SH-001 до SH-005)

**Claude створює:**

```javascript
// client/tests/e2e/salary-history.spec.js
describe('Salary History E2E', () => {
  it('should display salary history in employee card', () => {
    cy.visit('/');
    cy.get('[data-test="employee-card-1"]').click();
    cy.get('[data-test="tab-salary-history"]').click();

    cy.get('[data-test="salary-history-table"]').should('be.visible');
    cy.get('[data-test="salary-history-chart"]').should('be.visible');
  });

  it('should add new salary change', () => {
    cy.visit('/?employee=1');
    cy.get('[data-test="tab-salary-history"]').click();
    cy.get('[data-test="btn-add-change"]').click();

    cy.get('[data-test="input-change-date"]').type('2024-02-01');
    cy.get('[data-test="input-new-salary"]').type('6000');
    cy.get('[data-test="input-reason"]').type('Annual raise');
    cy.get('[data-test="btn-save"]').click();

    cy.get('[data-test="salary-history-table"]')
      .should('contain', '6000')
      .should('contain', 'Annual raise');
  });

  // ... more tests
});
```

---

## 📊 Крок 14: Sprint Status

### Команда (в будь-який момент):
```bash
/bmad-bmm-sprint-status
```

**Output:**
```
📊 Sprint 3: Salary History
🗓️  Feb 1 - Feb 14 (5 days remaining)

Epic: Salary History Tracking [████████░░] 80%

Stories:
✅ SH-001: Backend - Data Model (completed)
✅ SH-002: Backend - Auto-logging (completed)
✅ SH-003: Frontend - UI Component (completed)
✅ SH-004: Frontend - Chart (completed)
🔄 SH-005: Frontend - Add Dialog (in progress)

⚠️  Risks:
  - SH-005 in progress, 1 day remaining

💡 Suggestion: Run /bmad-bmm-dev-story SH-005 to complete
```

---

## 🎉 Крок 15: Retrospective

### Команда (після завершення epic):
```bash
/bmad-bmm-retrospective epic-salary-history
```

**Claude:** Аналізую epic та stories...

**Output:**
```markdown
# Retrospective: Salary History Epic

## Success Metrics
✅ All 5 stories completed
✅ 0 critical bugs in production
✅ User feedback: positive (HR loves the chart!)
⏱️  Completed in 6 days (estimate: 7 days)

## What Went Well 🎉
1. Clear architecture decisions saved time
2. ADVERSARIAL code review caught security issues early
3. Auto-logging worked perfectly from day 1
4. Chart.js integration was simpler than expected

## What Didn't Go Well 😞
1. Forgot to handle employees with no history (SH-003)
2. Had to refactor CSV reading twice (performance issue)
3. Initial estimate for SH-005 was too low (3h → 5h actual)

## Lessons Learned 📚
1. **Always validate with empty state** - test with no data first
2. **Performance testing early** - load 1000 records during development
3. **Buffer estimates** - UI work takes longer than expected

## New Information Emerged 💡
1. Users want to **export history to Excel** (new feature request)
2. Accounting needs **approval workflow** for salary changes
3. Chart should show **comparison with department average**

## Actionable Items for Next Epic
- [ ] Add "Export to Excel" to backlog (priority: medium)
- [ ] Research approval workflow patterns
- [ ] Consider adding department analytics view

## Impact on Future Work
This epic proved that:
- CSV-based approach scales to relational data
- Chart.js is good fit for this project
- Auto-logging pattern can be reused for other entities

Recommend using similar approach for:
- Vacation history
- Position changes
- Performance reviews
```

---

## 📁 Структура файлів після завершення

```
crm_manufactur/
├── docs/
│   ├── product-brief-salary-history.md          # Крок 2
│   ├── prd-salary-history.md                    # Крок 3
│   ├── architecture-salary-history.md           # Крок 4
│   ├── ux-design-salary-history.md             # Крок 5
│   └── epics-and-stories/
│       └── epic-salary-history.md               # Крок 8
├── diagrams/
│   ├── salary-history-dataflow.excalidraw       # Крок 6.1
│   └── salary-history-wireframe.excalidraw      # Крок 6.2
├── sprint-status.yaml                            # Крок 9, оновлюється
├── data/
│   ├── salary_history.csv                        # Створено в SH-001
│   └── salary_history.template.csv
├── server/
│   ├── src/
│   │   ├── index.js                              # Оновлено (endpoints)
│   │   ├── store.js                              # Оновлено (методи)
│   │   └── schema.js                             # Оновлено (schema)
│   └── tests/
│       └── salary-history.test.js                # Створено в SH-001
└── client/
    ├── src/
    │   └── App.vue                                # Оновлено (UI)
    └── tests/
        └── e2e/
            └── salary-history.spec.js             # Крок 13
```

---

## ⏱️ Затрачений час

| Крок | Команда | Час |
|------|---------|-----|
| 1 | Design Thinking | 30 хв |
| 2 | Product Brief | 15 хв |
| 3 | PRD | 20 хв |
| 4 | Architecture | 25 хв |
| 5 | UX Design | 20 хв |
| 6 | Діаграми | 15 хв |
| 7 | Readiness Check | 10 хв |
| 8 | Epics & Stories | 15 хв |
| 9 | Sprint Planning | 5 хв |
| 10 | Dev SH-001 | 45 хв |
| 11 | Code Review | 10 хв |
| 12 | Dev SH-002-005 | 4 год |
| 13 | QA Automation | 30 хв |
| 15 | Retrospective | 15 хв |
| **TOTAL** | | **~7 годин** |

*(Без BMAD це зайняло б ~12-15 годин)*

---

## 🎯 Ключові висновки

### Що дає BMAD:
1. ✅ **Структурований підхід** - нічого не забувається
2. ✅ **Документація на автопілоті** - все задокументовано
3. ✅ **Рання валідація** - проблеми знаходяться до кодування
4. ✅ **Якість коду** - adversarial review знаходить реальні issues
5. ✅ **Швидкість** - 40% економія часу
6. ✅ **Історія рішень** - чому зроблено саме так

### Коли можна пропустити кроки:
- **Швидкий фікс** → одразу до `/bmad-bmm-quick-dev`
- **Проста зміна UI** → пропустити Architecture
- **Додавання поля** → пропустити Design Thinking та UX

### Коли обов'язково все:
- **Нова значна фіча** (як в прикладі)
- **Архітектурні зміни**
- **Інтеграції з зовнішніми системами**

---

**Порада:** Копіюйте цей workflow для ваших фіч! 🚀
