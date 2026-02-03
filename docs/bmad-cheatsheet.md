# BMAD Шпаргалка

**BMAD** (Business Model Acceleration for Development) - система workflows для Claude Code, що автоматизує процеси розробки від ідеї до коду.

## 🚀 Швидкий старт

### Базові команди

```bash
/bmad-help                  # Показати наступні кроки або відповісти на питання
/bmad-party-mode           # Групова дискусія між агентами
```

## 📋 Життєвий цикл продукту

### Фаза 1: Ідея та дослідження

```bash
# Креативні методології
/bmad-cis-design-thinking        # Дизайн-мислення (Empathize → Define → Ideate → Prototype → Test)
/bmad-cis-innovation-strategy    # Стратегія інновацій (аналіз ринку, бізнес-моделі)
/bmad-brainstorming             # Інтерактивний брейнсторм
/bmad-cis-problem-solving       # Систематичне вирішення проблем

# Дослідження
/bmad-bmm-research              # Комплексне дослідження (ринок, технології, домен)
```

### Фаза 2: Документація продукту

```bash
/bmad-bmm-create-product-brief  # Створення Product Brief (пірингова співпраця як бізнес-аналітик)
/bmad-bmm-create-prd           # Створення PRD (Create/Validate/Edit режими)
/bmad-bmm-create-ux-design     # Планування UX паттернів та дизайну
```

### Фаза 3: Архітектура та планування

```bash
/bmad-bmm-create-architecture   # Архітектурні рішення (адаптивна розмова, не шаблони)
/bmad-bmm-document-project      # Документування brownfield проєктів

# Діаграми та візуалізація
/bmad-bmm-create-excalidraw-diagram    # Системні діаграми, ERD, UML
/bmad-bmm-create-excalidraw-flowchart  # Блок-схеми процесів
/bmad-bmm-create-excalidraw-dataflow   # Data Flow діаграми (DFD)
/bmad-bmm-create-excalidraw-wireframe  # Wireframes інтерфейсів

# Валідація
/bmad-bmm-check-implementation-readiness  # Перевірка готовності PRD/Architecture/Epics
```

### Фаза 4: Розробка

```bash
# Планування спринту
/bmad-bmm-create-epics-and-stories  # Перетворення PRD → Epics & Stories
/bmad-bmm-sprint-planning          # Генерація sprint-status.yaml
/bmad-bmm-sprint-status            # Перегляд статусу спринту

# Розробка
/bmad-bmm-quick-dev               # Швидка розробка (tech-specs або прямі інструкції)
/bmad-bmm-quick-spec              # Розмовне створення tech-spec
/bmad-bmm-create-story            # Створення наступної user story
/bmad-bmm-dev-story               # Виконання story (tasks → tests → validation)

# Коригування курсу
/bmad-bmm-correct-course          # Обробка значних змін під час спринту
```

### Фаза 5: Якість та ретроспектива

```bash
# Тестування
/bmad-bmm-qa-automate             # Генерація тестів для існуючих фіч

# Код-рев'ю
/bmad-bmm-code-review             # ADVERSARIAL рев'ю (знаходить 3-10 проблем у кожній story)

# Ретроспектива
/bmad-bmm-retrospective           # Огляд після епіку, lessons learned
```

## 🤖 Агенти BMAD

```bash
# Business Model Management (BMM)
/bmad-agent-bmm-quinn             # Quinn - універсальний агент
/bmad-agent-bmm-quick-flow-solo-dev  # Швидка розробка соло
/bmad-agent-bmm-sm                # Scrum Master
/bmad-agent-bmm-pm                # Product Manager
/bmad-agent-bmm-architect         # Архітектор
/bmad-agent-bmm-ux-designer       # UX дизайнер
/bmad-agent-bmm-dev               # Розробник
/bmad-agent-bmm-analyst           # Аналітик
/bmad-agent-bmm-tech-writer       # Технічний письменник

# Creative Innovation Suite (CIS)
/bmad-agent-cis-innovation-strategist    # Стратег інновацій
/bmad-agent-cis-design-thinking-coach    # Коуч дизайн-мислення
/bmad-agent-cis-brainstorming-coach      # Коуч брейнсторму
/bmad-agent-cis-creative-problem-solver  # Креативний problem solver
/bmad-agent-cis-storyteller              # Сторітеллер
/bmad-agent-cis-presentation-master      # Майстер презентацій

# Core
/bmad-agent-bmad-master           # Головний BMAD агент
```

## 📝 Редакторські інструменти

```bash
/bmad-editorial-review-prose      # Клінічний копірайтинг (комунікаційні проблеми)
/bmad-editorial-review-structure  # Структурний редактор (cuts, реорганізація)
/bmad-cis-storytelling            # Створення narratives з frameworks
```

## 🛠️ Утиліти

```bash
/bmad-shard-doc                   # Розбиття великих markdown на файли (по h2 секціях)
/bmad-index-docs                  # Генерація index.md для директорії
/bmad-review-adversarial-general  # Цинічний review контенту
```

## 💡 Типові сценарії використання

### Сценарій 1: Новий feature з нуля

```bash
1. /bmad-cis-design-thinking           # Зрозуміти потреби користувачів
2. /bmad-bmm-create-prd               # Створити PRD
3. /bmad-bmm-create-architecture      # Спроєктувати архітектуру
4. /bmad-bmm-create-epics-and-stories # Розбити на stories
5. /bmad-bmm-dev-story                # Розробити кожну story
6. /bmad-bmm-code-review              # Код-рев'ю
```

### Сценарій 2: Швидкий фікс

```bash
1. /bmad-bmm-quick-dev                # Прямо до розробки
2. /bmad-bmm-qa-automate              # Додати тести
```

### Сценарій 3: Документування існуючого проєкту

```bash
1. /bmad-bmm-document-project         # Сканувати та документувати codebase
2. /bmad-index-docs                   # Створити індекс документації
```

### Сценарій 4: Аналіз та покращення

```bash
1. /bmad-bmm-sprint-status            # Подивитися поточний статус
2. /bmad-review-adversarial-general   # Критичний review
3. /bmad-bmm-correct-course           # Скоригувати курс
```

## 📊 Структура файлів BMAD

```
_bmad/
├── _config/          # Конфігурації workflows
├── _memory/          # Контекст та пам'ять агентів
├── bmm/              # Business Model Management workflows
├── cis/              # Creative Innovation Suite workflows
└── core/             # Базові workflows

_bmad-output/         # Результати виконання (НЕ комітити!)

.claude/
└── commands/         # Custom команди Claude Code
```

## ⚙️ Best Practices

### ✅ Рекомендується

- Використовувати `/bmad-help` коли не знаєте, що робити далі
- Слідувати послідовності: Research → PRD → Architecture → Stories → Development
- Використовувати `/bmad-bmm-check-implementation-readiness` перед розробкою
- Запускати `/bmad-bmm-code-review` на кожну story
- Робити `/bmad-bmm-retrospective` після епіків

### ❌ Не робити

- НЕ комітити `_bmad/`, `_bmad-output/`, `.claude/` в git (додати до `.gitignore`)
- НЕ пропускати валідацію перед розробкою
- НЕ ігнорувати код-рев'ю (BMAD знаходить реальні проблеми!)

## 🎯 Корисні поєднання

```bash
# Креативна сесія
/bmad-party-mode + /bmad-brainstorming

# Глибокий аналіз проблеми
/bmad-cis-problem-solving + /bmad-agent-cis-creative-problem-solver

# Повний цикл розробки
/bmad-bmm-create-prd + /bmad-bmm-create-architecture + /bmad-bmm-create-epics-and-stories

# Документація + діаграми
/bmad-bmm-document-project + /bmad-bmm-create-excalidraw-diagram
```

## 📚 Додаткові ресурси

- `_bmad/_config/` - Конфігурації кожного workflow
- `/bmad-help` - Контекстна допомога на будь-якому етапі
- Документація в репозиторії BMAD

---

**Порада:** Починайте з `/bmad-help`, якщо не впевнені, який workflow використовувати! 🚀
