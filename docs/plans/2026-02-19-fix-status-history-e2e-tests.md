# Fix: Падаючі E2E тести status-history.spec.js

## Overview

Два E2E тести в `tests/e2e/status-history.spec.js` стабільно падають на CI (з 2 retry):
1. **Line 37**: "clicking clock button opens status history popup" — модалка не з'являється після кліку
2. **Line 148**: "popup can be closed with Закрити button" — кнопка `.secondary` не знайдена в модалці

При цьому аналогічні тести (lines 136, 160) з тим самим `testEmployeeId` і тією ж послідовністю дій проходять.

## Root Cause Analysis

### Проблема 1: Спільний CSS-клас між двома різними модалками
Клас `status-history-modal` використовується для двох різних попапів:
- **Історія статусів** (line 986): `<div class="vacation-notification-modal status-history-modal">`
- **Догани та відзнаки** (line 1033): `<div class="vacation-notification-modal status-history-modal">`

Хоча обидві модалки гейтовані різними `v-if`, спільний клас потенційно створює проблеми з Playwright-селекторами.

### Проблема 2: Нестабільні селектори в тестах
- Test 148 використовує `page.click('.status-history-modal .button-group .secondary')` — глобальний пошук
- Test 136 (проходить) використовує `modal.locator('.close-btn').click()` — scoped пошук через вже знайдений локатор

### Проблема 3: Відсутній wait перед click
- Test 37 клікає `.status-history-btn` без очікування `waitForSelector` для самої кнопки
- `.waitForSelector('.status-field-row')` не гарантує що кнопка клікабельна

## Context

- `tests/e2e/status-history.spec.js` — тести (8 тестів, 2 падають)
- `client/src/views/EmployeeCardsView.vue` — компонент з модалками (lines 986, 1033)
- `client/src/composables/useStatusManagement.js` — логіка відкриття/закриття модалки

## Development Approach

- **Testing approach**: Regular (fix code/tests, then verify)
- Мінімальні зміни — тільки те, що потрібно для стабільних тестів
- **CRITICAL: всі тести повинні пройти**

## Implementation Steps

### Task 1: Дати унікальний CSS-клас модалці доган/відзнак

- [x] в `EmployeeCardsView.vue` line 1033: замінити `status-history-modal` на `reprimands-modal` для попапу доган
- [x] в `styles.css`: додати `.reprimands-modal { max-width: 700px; }` (скопіювати стилі з `status-history-modal`)
- [x] перевірити що E2E тести `reprimands.spec.js` не використовують селектор `.status-history-modal`
- [x] запустити `npm run test:e2e -- --grep "Reprimands"` — повинні пройти

### Task 2: Зробити status-history тести стабільнішими

- [x] Test line 37: додати `await page.locator('.status-history-btn').waitFor()` перед click
- [x] Test line 37: використовувати `await page.locator('.status-history-btn').click()` замість `await page.click('.status-history-btn')`
- [x] Test line 148: замінити `await page.click('.status-history-modal .button-group .secondary')` на `await modal.locator('.button-group .secondary').click()` (scoped, як у test 136)
- [x] Перевірити інші тести в файлі на аналогічні патерни і зробити однаковими
- [x] запустити `npm run test:e2e -- --grep "Status History"` — всі повинні пройти

### Task 3: Фінальна верифікація

- [ ] запустити повний `npm run test:e2e` — всі 118 тестів проходять
- [ ] перевірити що немає інших місць де `status-history-modal` використовується для репрімандів

## Technical Details

**Зміна в EmployeeCardsView.vue (line 1033):**
```html
<!-- БУЛО -->
<div class="vacation-notification-modal status-history-modal" @click.stop>

<!-- СТАЛО -->
<div class="vacation-notification-modal reprimands-modal" @click.stop>
```

**Зміна в тесті (line 37):**
```javascript
// БУЛО
await page.click('.status-history-btn');

// СТАЛО
const historyBtn = page.locator('.status-history-btn');
await historyBtn.waitFor();
await historyBtn.click();
```

**Зміна в тесті (line 156):**
```javascript
// БУЛО
await page.click('.status-history-modal .button-group .secondary');

// СТАЛО
await modal.locator('.button-group .secondary').click();
```

## Post-Completion

**Ручна перевірка:**
- Відкрити картку працівника, натиснути годинник — модалка історії статусу відкривається
- Відкрити догани та відзнаки — модалка доган відкривається, стилі правильні
