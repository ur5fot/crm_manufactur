<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { displayName } from "../utils/employee";
import { useDismissedEvents } from "../composables/useDismissedEvents";

const router = useRouter();
const { dismissedEvents, generateEventId, loadDismissedEvents, dismissEvent } = useDismissedEvents();

const employees = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const lastUpdated = ref(null);
const isRefreshing = ref(false);

// Dashboard state
const dashboardEvents = ref({ today: [], thisWeek: [] });
const dashboardOverdueEvents = ref([]);
const expandedCard = ref(null);
const activeReport = ref(null);
const reportData = ref([]);
const reportLoading = ref(false);

// Notification state
const statusReturning = ref([]);
const statusStarting = ref([]);
const showStatusNotification = ref(false);
const docExpiryToday = ref([]);
const docExpiryWeek = ref([]);
const showDocExpiryNotification = ref(false);
const birthdayToday = ref([]);
const birthdayNext7Days = ref([]);
const showBirthdayNotification = ref(false);
const retirementToday = ref([]);
const retirementThisMonth = ref([]);
const showRetirementNotification = ref(false);

// Refresh interval
const refreshIntervalId = ref(null);

// Track notified items to avoid duplicate notifications
const notifiedEmployeeIds = new Set();
let notifiedDate = '';
let docExpiryNotifiedDate = '';
let birthdayNotifiedDate = '';
const retirementNotifiedIds = new Set();
let retirementNotifiedDate = '';

// Dynamic status values from employees (get employment_status field options)
const employmentOptions = ref([]);
const workingStatus = computed(() => employmentOptions.value[0] || '');

const shortDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Statistics
const dashboardStats = computed(() => {
  const emps = employees.value;
  const total = emps.length;
  const options = employmentOptions.value;

  const statusCounts = options.map(opt => ({
    label: opt,
    count: emps.filter(e => e.employment_status === opt).length
  }));

  const counted = statusCounts.reduce((sum, s) => sum + s.count, 0);
  return { total, statusCounts, other: total - counted };
});

// Filtered notification lists (excluding dismissed events)
const filteredStatusReturning = computed(() => {
  return statusReturning.value.filter(emp => {
    const eventId = generateEventId('status_returning', emp.id, notifiedDate);
    return !dismissedEvents.value.has(eventId);
  });
});

const filteredStatusStarting = computed(() => {
  return statusStarting.value.filter(emp => {
    const eventId = generateEventId('status_starting', emp.id, notifiedDate);
    return !dismissedEvents.value.has(eventId);
  });
});

const filteredDocExpiryToday = computed(() => {
  return docExpiryToday.value.filter(evt => {
    const eventId = generateEventId('doc_expiry_today', evt.employee_id, evt.expiry_date);
    return !dismissedEvents.value.has(eventId);
  });
});

const filteredDocExpiryWeek = computed(() => {
  return docExpiryWeek.value.filter(evt => {
    const eventId = generateEventId('doc_expiry_week', evt.employee_id, evt.expiry_date);
    return !dismissedEvents.value.has(eventId);
  });
});

const filteredBirthdayToday = computed(() => {
  return birthdayToday.value.filter(evt => {
    const eventId = generateEventId('birthday_today', evt.employee_id, evt.current_year_birthday);
    return !dismissedEvents.value.has(eventId);
  });
});

const filteredBirthdayNext7Days = computed(() => {
  return birthdayNext7Days.value.filter(evt => {
    const eventId = generateEventId('birthday_week', evt.employee_id, evt.current_year_birthday);
    return !dismissedEvents.value.has(eventId);
  });
});

const filteredRetirementToday = computed(() => {
  return retirementToday.value.filter(evt => {
    const eventId = generateEventId('retirement_today', evt.employee_id, evt.retirement_date);
    return !dismissedEvents.value.has(eventId);
  });
});

const filteredRetirementThisMonth = computed(() => {
  return retirementThisMonth.value.filter(evt => {
    const eventId = generateEventId('retirement_month', evt.employee_id, evt.retirement_date);
    return !dismissedEvents.value.has(eventId);
  });
});

const formattedLastUpdated = computed(() => {
  if (!lastUpdated.value) return '';
  const d = lastUpdated.value;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});

const absentEmployeesCount = computed(() => {
  if (activeReport.value === 'current') {
    return reportData.value.length;
  }
  return 0;
});

const statusChangesThisMonthCount = computed(() => {
  if (activeReport.value === 'month') {
    return reportData.value.length;
  }
  return 0;
});

const expandedEmployees = computed(() => {
  const key = expandedCard.value;
  if (!key) return [];
  const emps = employees.value;
  if (key === 'total') return emps;
  if (key === 'other') {
    const options = employmentOptions.value;
    return emps.filter(e => !options.includes(e.employment_status));
  }
  return emps.filter(e => e.employment_status === key);
});

// Status card colors (CSS variables)
const statusColors = [
  'var(--color-status-active)',
  'var(--color-status-warning)',
  'var(--color-status-vacation)',
  'var(--color-status-warning)',
];
function statusCardColor(idx) {
  return statusColors[idx] || 'var(--color-status-inactive)';
}

function toggleStatCard(cardKey) {
  expandedCard.value = expandedCard.value === cardKey ? null : cardKey;
}

function statusEmoji(statusValue) {
  const idx = employmentOptions.value.indexOf(statusValue);
  if (idx === 2) return '✈️';
  if (idx === 3) return '🏥';
  return 'ℹ️';
}

function docExpiryEmoji(event) {
  if (event.type === 'recently_expired') return '⚠️';
  if (event.type === 'expiring_today') return '⚠️';
  if (event.type === 'expiring_soon') return '📄';
  return '📄';
}

function timelineEventEmoji(event) {
  if (event.type === 'doc_expiry') return docExpiryEmoji({ type: event.expiry_type });
  if (event.type === 'status_end') return '🏢';
  if (event.type === 'birthday_today') return '🎂';
  if (event.type === 'birthday_upcoming') return '🎉';
  return statusEmoji(event.status_type);
}

function timelineEventDesc(event) {
  if (event.type === 'doc_expiry') {
    const label = event.document_label || event.document_field;
    if (event.expiry_type === 'recently_expired' || event.expiry_type === 'expiring_today') {
      return `— ${label} (термін сплив)`;
    }
    return `— ${label} (до ${formatEventDate(event.expiry_date)})`;
  }
  if (event.type === 'status_end') {
    return `— повернення (${event.status_type || 'статус'})`;
  }
  if (event.type === 'birthday_today') {
    return `— день народження (${event.age} років)`;
  }
  if (event.type === 'birthday_upcoming') {
    return `— день народження (${event.age} років, ${formatEventDate(event.date)})`;
  }
  const label = event.status_type || 'статус';
  if (event.end_date) {
    return `— ${label} (до ${formatEventDate(event.end_date)})`;
  }
  return `— ${label}`;
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const day = shortDays[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}, ${dd}.${mm}.${d.getFullYear()}`;
}

function daysFromNowLabel(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return 'сьогодні';
  if (diff < 0) return `${Math.abs(diff)} дн. тому`;
  if (diff === 1) return 'завтра';
  if (diff >= 2 && diff <= 4) return `через ${diff} дні`;
  return `через ${diff} днів`;
}

async function loadEmployees(silent = false) {
  if (silent && isRefreshing.value) return;
  if (!silent) loading.value = true;
  isRefreshing.value = true;
  if (!silent) errorMessage.value = "";
  try {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
    await checkStatusChanges();
    await checkDocumentExpiry();
    await checkBirthdayEvents();
    await checkRetirementEvents();
    lastUpdated.value = new Date();

    // Auto-expand "Who is absent now" report on Dashboard load
    if (activeReport.value !== 'current') {
      await toggleReport('current');
    }
  } catch (error) {
    if (!silent) errorMessage.value = error.message;
  } finally {
    isRefreshing.value = false;
    if (!silent) loading.value = false;
  }
}

async function loadDashboardEvents() {
  try {
    const [statusData, docData, birthdayData] = await Promise.all([
      api.getDashboardEvents(),
      api.getDocumentExpiry(),
      api.getBirthdayEvents()
    ]);

    const mapDocEvent = (evt) => ({
      employee_id: evt.employee_id,
      name: evt.name,
      type: 'doc_expiry',
      expiry_type: evt.type,
      document_field: evt.document_field,
      document_label: evt.document_label,
      expiry_date: evt.expiry_date,
      date: evt.expiry_date
    });

    const mapBirthdayEvent = (evt, isToday) => ({
      employee_id: evt.employee_id,
      name: evt.employee_name,
      type: isToday ? 'birthday_today' : 'birthday_upcoming',
      birth_date: evt.birth_date,
      age: evt.age,
      date: evt.current_year_birthday
    });

    const todayDocEvents = (docData.today || [])
      .filter(evt => evt.type !== 'recently_expired')
      .map(mapDocEvent);
    const todayBirthdayEvents = (birthdayData.today || []).map(evt => mapBirthdayEvent(evt, true));
    const todayEvents = [
      ...(statusData.today || []),
      ...todayDocEvents,
      ...todayBirthdayEvents
    ];

    const weekBirthdayEvents = (birthdayData.next7Days || []).map(evt => mapBirthdayEvent(evt, false));
    const weekEvents = [
      ...(statusData.thisWeek || []),
      ...(docData.thisWeek || []).map(mapDocEvent),
      ...weekBirthdayEvents
    ];
    weekEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    dashboardEvents.value = { today: todayEvents, thisWeek: weekEvents };
  } catch (error) {
    console.error('Failed to load dashboard events:', error);
  }
}

async function loadOverdueDocuments() {
  try {
    const data = await api.getDocumentOverdue();
    dashboardOverdueEvents.value = data.overdue || [];
  } catch (error) {
    console.error('Failed to load overdue documents:', error);
  }
}

async function checkStatusChanges() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (!workingStatus.value) {
    console.warn('checkStatusChanges: workingStatus not available yet, skipping');
    return;
  }

  if (notifiedDate !== today) {
    notifiedEmployeeIds.clear();
    notifiedDate = today;
  }

  const returningToday = [];
  const startingToday = [];
  const needsUpdate = [];

  employees.value.forEach(employee => {
    const startDate = employee.status_start_date;
    const endDate = employee.status_end_date;

    if (!startDate && !endDate) return;

    const firedStatus = employmentOptions.value[1] || '';
    const isFired = firedStatus && employee.employment_status === firedStatus;

    if (endDate === today && !isFired) {
      returningToday.push({
        id: employee.employee_id,
        name: displayName(employee),
        position: employee.position || '',
        statusType: employee.employment_status
      });
      return;
    }

    if (endDate && endDate < today && !isFired) {
      needsUpdate.push({
        ...employee,
        status_start_date: '',
        status_end_date: '',
        employment_status: workingStatus.value
      });
      return;
    }

    if (startDate === today && employee.employment_status !== workingStatus.value) {
      startingToday.push({
        id: employee.employee_id,
        name: displayName(employee),
        position: employee.position || '',
        endDate: endDate,
        statusType: employee.employment_status
      });
      return;
    }
  });

  for (const employee of needsUpdate) {
    try {
      await api.updateEmployee(employee.employee_id, employee);
    } catch (error) {
      console.error(`Ошибка обновления сотрудника ${employee.employee_id}:`, error);
    }
  }

  const newReturning = returningToday.filter(e => !notifiedEmployeeIds.has(e.id));
  const newStarting = startingToday.filter(e => !notifiedEmployeeIds.has(e.id));
  // Update raw data first
  statusReturning.value = newReturning;
  statusStarting.value = newStarting;

  // Check filtered arrays to determine visibility (respects dismissed events)
  if (filteredStatusReturning.value.length > 0 || filteredStatusStarting.value.length > 0) {
    newReturning.forEach(e => notifiedEmployeeIds.add(e.id));
    newStarting.forEach(e => notifiedEmployeeIds.add(e.id));
    showStatusNotification.value = true;
  }

  if (needsUpdate.length > 0) {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
  }
}

async function checkDocumentExpiry() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (docExpiryNotifiedDate === today) return;

  try {
    const data = await api.getDocumentExpiry();
    const todayItems = (data.today || []).filter(evt => evt.type !== 'recently_expired');
    const weekItems = data.thisWeek || [];

    docExpiryNotifiedDate = today;
    // Update raw data first
    docExpiryToday.value = todayItems;
    docExpiryWeek.value = weekItems;

    // Check filtered arrays to determine visibility (respects dismissed events)
    if (filteredDocExpiryToday.value.length > 0 || filteredDocExpiryWeek.value.length > 0) {
      showDocExpiryNotification.value = true;
    }
  } catch (error) {
    console.error('Failed to check document expiry:', error);
  }
}

async function checkBirthdayEvents() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (birthdayNotifiedDate === today) return;

  try {
    const data = await api.getBirthdayEvents();
    const todayItems = data.today || [];
    const next7DaysItems = data.next7Days || [];

    birthdayNotifiedDate = today;
    // Update raw data first
    birthdayToday.value = todayItems;
    birthdayNext7Days.value = next7DaysItems;

    // Check filtered arrays to determine visibility (respects dismissed events)
    if (filteredBirthdayToday.value.length > 0 || filteredBirthdayNext7Days.value.length > 0) {
      showBirthdayNotification.value = true;
    }
  } catch (error) {
    console.error('Failed to check birthday events:', error);
  }
}

async function checkRetirementEvents() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (!workingStatus.value || !employmentOptions.value[1]) {
    console.warn('checkRetirementEvents: employment options not available yet, skipping');
    return;
  }

  if (retirementNotifiedDate !== today) {
    retirementNotifiedIds.clear();
    retirementNotifiedDate = today;
  }

  try {
    const data = await api.getRetirementEvents();
    const todayItems = data.today || [];
    const thisMonthItems = data.thisMonth || [];

    const newTodayItems = todayItems.filter(item => !retirementNotifiedIds.has(item.employee_id));
    const newThisMonthItems = thisMonthItems.filter(item => !retirementNotifiedIds.has(item.employee_id));

    if (newTodayItems.length > 0) {
      const firedStatus = employmentOptions.value[1];
      for (const event of newTodayItems) {
        const emp = employees.value.find(e => e.employee_id === event.employee_id);
        if (emp && emp.employment_status === workingStatus.value) {
          try {
            await api.updateEmployee(event.employee_id, {
              ...emp,
              employment_status: firedStatus
            });
            console.log(`Auto-dismissed employee ${event.employee_name} (ID: ${event.employee_id}) due to retirement`);
            retirementNotifiedIds.add(event.employee_id);
          } catch (error) {
            console.error(`Failed to auto-dismiss employee ${event.employee_id}:`, error);
          }
        } else {
          retirementNotifiedIds.add(event.employee_id);
        }
      }
      const employeeData = await api.getEmployees();
      employees.value = employeeData.employees || [];
      lastUpdated.value = new Date();
    }

    newThisMonthItems.forEach(item => retirementNotifiedIds.add(item.employee_id));

    // Update raw data first
    retirementToday.value = newTodayItems;
    retirementThisMonth.value = newThisMonthItems;

    // Check filtered arrays to determine visibility (respects dismissed events)
    if (filteredRetirementToday.value.length > 0 || filteredRetirementThisMonth.value.length > 0) {
      showRetirementNotification.value = true;
    }
  } catch (error) {
    console.error('Failed to check retirement events:', error);
  }
}

async function toggleReport(type) {
  if (activeReport.value === type) {
    activeReport.value = null;
    reportData.value = [];
    return;
  }
  activeReport.value = type;
  reportLoading.value = true;
  try {
    const data = await api.getStatusReport(type);
    reportData.value = data;
    errorMessage.value = '';
  } catch (e) {
    reportData.value = [];
    errorMessage.value = 'Помилка завантаження звіту';
  } finally {
    reportLoading.value = false;
  }
}

function openEmployeeCard(employeeId) {
  router.push({ name: 'cards', params: { id: employeeId } });
}

function closeStatusNotification() {
  showStatusNotification.value = false;
}

function closeDocExpiryNotification() {
  showDocExpiryNotification.value = false;
}

function closeBirthdayNotification() {
  showBirthdayNotification.value = false;
}

function closeRetirementNotification() {
  showRetirementNotification.value = false;
}

function dismissStatusNotification() {
  // Dismiss all status change events shown in this notification
  filteredStatusStarting.value.forEach(emp => {
    const eventId = generateEventId('status_starting', emp.id, notifiedDate);
    dismissEvent(eventId);
  });
  filteredStatusReturning.value.forEach(emp => {
    const eventId = generateEventId('status_returning', emp.id, notifiedDate);
    dismissEvent(eventId);
  });
  closeStatusNotification();
}

function dismissDocExpiryNotification() {
  // Dismiss all document expiry events shown in this notification
  filteredDocExpiryToday.value.forEach(evt => {
    const eventId = generateEventId('doc_expiry_today', evt.employee_id, evt.expiry_date);
    dismissEvent(eventId);
  });
  filteredDocExpiryWeek.value.forEach(evt => {
    const eventId = generateEventId('doc_expiry_week', evt.employee_id, evt.expiry_date);
    dismissEvent(eventId);
  });
  closeDocExpiryNotification();
}

function dismissBirthdayNotification() {
  // Dismiss all birthday events shown in this notification
  filteredBirthdayToday.value.forEach(evt => {
    const eventId = generateEventId('birthday_today', evt.employee_id, evt.current_year_birthday);
    dismissEvent(eventId);
  });
  filteredBirthdayNext7Days.value.forEach(evt => {
    const eventId = generateEventId('birthday_week', evt.employee_id, evt.current_year_birthday);
    dismissEvent(eventId);
  });
  closeBirthdayNotification();
}

function dismissRetirementNotification() {
  // Dismiss all retirement events shown in this notification
  filteredRetirementToday.value.forEach(evt => {
    const eventId = generateEventId('retirement_today', evt.employee_id, evt.retirement_date);
    dismissEvent(eventId);
  });
  filteredRetirementThisMonth.value.forEach(evt => {
    const eventId = generateEventId('retirement_month', evt.employee_id, evt.retirement_date);
    dismissEvent(eventId);
  });
  closeRetirementNotification();
}

function startDashboardRefresh() {
  stopDashboardRefresh();
  refreshIntervalId.value = setInterval(async () => {
    try {
      await loadEmployees(true);
      await loadDashboardEvents();
      await loadOverdueDocuments();
    } catch (error) {
      console.error('Dashboard auto-refresh failed:', error);
    }
  }, 300000);
}

function stopDashboardRefresh() {
  if (refreshIntervalId.value) {
    clearInterval(refreshIntervalId.value);
    refreshIntervalId.value = null;
  }
}

async function loadFieldsSchema() {
  try {
    const data = await api.getFieldsSchema();
    const allFields = data.allFields || [];
    const statusField = allFields.find(f => f.key === 'employment_status');
    employmentOptions.value = statusField?.options || [];
  } catch (error) {
    console.error('Failed to load fields schema:', error);
  }
}

onMounted(async () => {
  loadDismissedEvents();
  await loadFieldsSchema();
  await loadEmployees();
  await loadDashboardEvents();
  await loadOverdueDocuments();
  startDashboardRefresh();
});

onUnmounted(() => {
  stopDashboardRefresh();
});
</script>

<template>
  <div>
    <!-- Notification modals -->
    <div v-if="showStatusNotification" class="vacation-notification-overlay" @click="closeStatusNotification">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>📋 Сповіщення про зміну статусів</h3>
          <button class="close-btn" @click="closeStatusNotification">×</button>
        </div>
        <div class="vacation-notification-body">
          <div v-if="filteredStatusStarting.length > 0" class="notification-section">
            <p class="notification-message">📋 Сьогодні змінюють статус:</p>
            <ul class="vacation-employees-list">
              <li v-for="emp in filteredStatusStarting" :key="emp.id" class="vacation-employee starting">
                <div class="employee-info">
                  <span class="employee-name">{{ statusEmoji(emp.statusType) }} {{ emp.name }}</span>
                  <span v-if="emp.position" class="employee-position">{{ emp.position }}</span>
                </div>
                <div class="status-details">
                  <span class="status-badge">{{ emp.statusType }}</span>
                  <span v-if="emp.endDate" class="vacation-end-date">до {{ formatEventDate(emp.endDate) }}</span>
                </div>
              </li>
            </ul>
          </div>
          <div v-if="filteredStatusReturning.length > 0" class="notification-section">
            <p class="notification-message">🏢 Сьогодні повертаються:</p>
            <ul class="vacation-employees-list">
              <li v-for="emp in filteredStatusReturning" :key="emp.id" class="vacation-employee returning">
                <div class="employee-info">
                  <span class="employee-name">{{ emp.name }}</span>
                  <span v-if="emp.position" class="employee-position">{{ emp.position }}</span>
                </div>
                <span class="status-badge returning-badge">{{ emp.statusType }} → {{ workingStatus }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="vacation-notification-footer">
          <button class="primary" @click="closeStatusNotification">Зрозуміло</button>
          <button class="secondary" @click="dismissStatusNotification">Більше не показувати</button>
        </div>
      </div>
    </div>

    <div v-if="showDocExpiryNotification" class="vacation-notification-overlay" @click="closeDocExpiryNotification">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>📋 Сповіщення про закінчення терміну дії документів</h3>
          <button class="close-btn" @click="closeDocExpiryNotification">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div v-if="filteredDocExpiryToday.length > 0" class="notification-section">
            <p class="notification-message">⚠️ Термін дії сплив або спливає сьогодні:</p>
            <ul class="vacation-employees-list">
              <li v-for="(evt, idx) in filteredDocExpiryToday" :key="'doc-today-' + idx" class="vacation-employee starting">
                <div class="employee-info">
                  <span class="employee-name">{{ docExpiryEmoji(evt) }} {{ evt.name }}</span>
                </div>
                <div class="status-details">
                  <span class="status-badge">{{ evt.document_label }}</span>
                  <span class="vacation-end-date">{{ formatEventDate(evt.expiry_date) }}</span>
                </div>
              </li>
            </ul>
          </div>
          <div v-if="filteredDocExpiryWeek.length > 0" class="notification-section">
            <p class="notification-message">📄 Термін дії спливає найближчим часом:</p>
            <ul class="vacation-employees-list">
              <li v-for="(evt, idx) in filteredDocExpiryWeek" :key="'doc-week-' + idx" class="vacation-employee returning">
                <div class="employee-info">
                  <span class="employee-name">📄 {{ evt.name }}</span>
                </div>
                <div class="status-details">
                  <span class="status-badge">{{ evt.document_label }}</span>
                  <span class="vacation-end-date">{{ formatEventDate(evt.expiry_date) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div class="vacation-notification-footer">
          <button class="primary" @click="closeDocExpiryNotification">Зрозуміло</button>
          <button class="secondary" @click="dismissDocExpiryNotification">Більше не показувати</button>
        </div>
      </div>
    </div>

    <div v-if="showBirthdayNotification" class="vacation-notification-overlay" @click="closeBirthdayNotification">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>🎂 Сповіщення про дні народження</h3>
          <button class="close-btn" @click="closeBirthdayNotification">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div v-if="filteredBirthdayToday.length > 0" class="notification-section">
            <p class="notification-message">🎂 Сьогодні день народження:</p>
            <ul class="vacation-employees-list">
              <li v-for="(evt, idx) in filteredBirthdayToday" :key="'bday-today-' + idx" class="vacation-employee starting">
                <div class="employee-info">
                  <span class="employee-name">🎂 {{ evt.employee_name }}</span>
                </div>
                <div class="status-details">
                  <span class="status-badge">{{ evt.age }} років</span>
                  <span class="vacation-end-date">{{ formatEventDate(evt.current_year_birthday) }}</span>
                </div>
              </li>
            </ul>
          </div>
          <div v-if="filteredBirthdayNext7Days.length > 0" class="notification-section">
            <p class="notification-message">🎉 Найближчі дні народження:</p>
            <ul class="vacation-employees-list">
              <li v-for="(evt, idx) in filteredBirthdayNext7Days" :key="'bday-week-' + idx" class="vacation-employee returning">
                <div class="employee-info">
                  <span class="employee-name">🎉 {{ evt.employee_name }}</span>
                </div>
                <div class="status-details">
                  <span class="status-badge">{{ evt.age }} років</span>
                  <span class="vacation-end-date">{{ formatEventDate(evt.current_year_birthday) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div class="vacation-notification-footer">
          <button class="primary" @click="closeBirthdayNotification">Зрозуміло</button>
          <button class="secondary" @click="dismissBirthdayNotification">Більше не показувати</button>
        </div>
      </div>
    </div>

    <div v-if="showRetirementNotification" class="vacation-notification-overlay" @click="closeRetirementNotification">
      <div class="vacation-notification-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>👴 Сповіщення про вихід на пенсію</h3>
          <button class="close-btn" @click="closeRetirementNotification">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div v-if="filteredRetirementToday.length > 0" class="notification-section">
            <p class="notification-message">👴 Виходять на пенсію сьогодні:</p>
            <ul class="vacation-employees-list">
              <li v-for="(evt, idx) in filteredRetirementToday" :key="'retire-today-' + idx" class="vacation-employee starting">
                <div class="employee-info">
                  <span class="employee-name">👴 {{ evt.employee_name }}</span>
                </div>
                <div class="status-details">
                  <span class="status-badge">{{ evt.age }} років</span>
                  <span class="vacation-end-date">{{ formatEventDate(evt.retirement_date) }}</span>
                </div>
              </li>
            </ul>
          </div>
          <div v-if="filteredRetirementThisMonth.length > 0" class="notification-section">
            <p class="notification-message">ℹ️ Виходять на пенсію цього місяця:</p>
            <ul class="vacation-employees-list">
              <li v-for="(evt, idx) in filteredRetirementThisMonth" :key="'retire-month-' + idx" class="vacation-employee returning">
                <div class="employee-info">
                  <span class="employee-name">ℹ️ {{ evt.employee_name }}</span>
                </div>
                <div class="status-details">
                  <span class="status-badge">{{ evt.age }} років</span>
                  <span class="vacation-end-date">{{ formatEventDate(evt.retirement_date) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div class="vacation-notification-footer">
          <button class="primary" @click="closeRetirementNotification">Зрозуміло</button>
          <button class="secondary" @click="dismissRetirementNotification">Більше не показувати</button>
        </div>
      </div>
    </div>

    <!-- Dashboard view -->
    <div class="dashboard">
      <div v-if="loading" class="status-bar" style="justify-content: center; padding: 24px;">
        <span>Завантаження...</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card-wrap">
          <div class="stat-card" :class="{ expanded: expandedCard === 'total' }"
               style="--card-color: #E0E0E0" @click="toggleStatCard('total')">
            <div class="stat-card-header">
              <div>
                <div class="stat-card-number">{{ dashboardStats.total }}</div>
                <div class="stat-card-label">Всього</div>
              </div>
              <span class="stat-card-toggle">{{ expandedCard === 'total' ? '▲' : '▼' }}</span>
            </div>
          </div>
          <div class="inline-expand" :class="{ open: expandedCard === 'total' }">
            <div class="inline-expand-list">
              <div v-if="expandedEmployees.length === 0" class="inline-expand-empty">Немає працівників</div>
              <div v-for="emp in expandedEmployees" :key="emp.employee_id" class="inline-expand-item" @click.stop="openEmployeeCard(emp.employee_id)">
                {{ [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ') }}
              </div>
            </div>
          </div>
        </div>
        <div
          v-for="(stat, idx) in dashboardStats.statusCounts"
          :key="stat.label"
          class="stat-card-wrap"
        >
          <div
            class="stat-card"
            :class="{ expanded: expandedCard === stat.label }"
            :style="{ '--card-color': statusCardColor(idx) }"
            @click="toggleStatCard(stat.label)"
          >
            <div class="stat-card-header">
              <div>
                <div class="stat-card-number">{{ stat.count }}</div>
                <div class="stat-card-label">{{ stat.label }}</div>
              </div>
              <span class="stat-card-toggle">{{ expandedCard === stat.label ? '▲' : '▼' }}</span>
            </div>
          </div>
          <div class="inline-expand" :class="{ open: expandedCard === stat.label }">
            <div class="inline-expand-list">
              <div v-if="expandedEmployees.length === 0" class="inline-expand-empty">Немає працівників</div>
              <div v-for="emp in expandedEmployees" :key="emp.employee_id" class="inline-expand-item" @click.stop="openEmployeeCard(emp.employee_id)">
                {{ [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ') }}
              </div>
            </div>
          </div>
        </div>
        <div class="stat-card-wrap">
          <div class="stat-card" :class="{ expanded: expandedCard === 'other' }"
               style="--card-color: var(--color-status-inactive)" @click="toggleStatCard('other')">
            <div class="stat-card-header">
              <div>
                <div class="stat-card-number">{{ dashboardStats.other }}</div>
                <div class="stat-card-label">Інше</div>
              </div>
              <span class="stat-card-toggle">{{ expandedCard === 'other' ? '▲' : '▼' }}</span>
            </div>
          </div>
          <div class="inline-expand" :class="{ open: expandedCard === 'other' }">
            <div class="inline-expand-list">
              <div v-if="expandedEmployees.length === 0" class="inline-expand-empty">Немає працівників</div>
              <div v-for="emp in expandedEmployees" :key="emp.employee_id" class="inline-expand-item" @click.stop="openEmployeeCard(emp.employee_id)">
                {{ [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ') }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="timeline-grid">
        <div class="timeline-card">
          <div class="timeline-title">Сьогодні</div>
          <div v-if="dashboardEvents.today.length === 0" class="timeline-empty">
            Нічого термінового
          </div>
          <div v-for="event in dashboardEvents.today" :key="event.employee_id + event.type + (event.document_field || '')" class="timeline-event">
            <span class="timeline-emoji">{{ timelineEventEmoji(event) }}</span>
            <span class="timeline-name timeline-link" @click="openEmployeeCard(event.employee_id)">{{ event.name }}</span>
            <span class="timeline-desc">{{ timelineEventDesc(event) }}</span>
          </div>
        </div>
        <div class="timeline-card">
          <div class="timeline-title">Найближчі 7 днів</div>
          <div v-if="dashboardEvents.thisWeek.length === 0" class="timeline-empty">
            Немає запланованих подій
          </div>
          <div v-for="event in dashboardEvents.thisWeek" :key="event.employee_id + event.type + event.date + (event.document_field || '')" class="timeline-event">
            <span class="timeline-date">{{ formatEventDate(event.date) }}</span>
            <span class="timeline-days-badge">{{ daysFromNowLabel(event.date) }}</span>
            <span class="timeline-emoji">{{ timelineEventEmoji(event) }}</span>
            <span class="timeline-name timeline-link" @click="openEmployeeCard(event.employee_id)">{{ event.name }}</span>
            <span class="timeline-desc">{{ timelineEventDesc(event) }}</span>
          </div>
        </div>
      </div>
      <div class="timeline-card" style="margin-top: 1rem;">
        <div class="timeline-title">Прострочені документи</div>
        <div v-if="dashboardOverdueEvents.length === 0" class="timeline-empty">
          Немає прострочених документів
        </div>
        <div v-for="event in dashboardOverdueEvents" :key="event.employee_id + event.document_field" class="timeline-event">
          <span class="timeline-emoji">⚠️</span>
          <span class="timeline-name timeline-link" @click="openEmployeeCard(event.employee_id)">{{ event.name }}</span>
          <span class="timeline-desc">{{ event.document_label }} (закінчився {{ formatEventDate(event.expiry_date) }})</span>
        </div>
      </div>
      <div class="report-section">
        <div class="report-buttons">
          <button class="report-btn" :class="{ active: activeReport === 'current' }" @click="toggleReport('current')">
            Хто відсутній зараз<span v-if="activeReport === 'current'"> ({{ absentEmployeesCount }})</span>
          </button>
          <button class="report-btn" :class="{ active: activeReport === 'month' }" @click="toggleReport('month')">
            Зміни статусів цього місяця<span v-if="activeReport === 'month'"> ({{ statusChangesThisMonthCount }})</span>
          </button>
        </div>
        <div v-if="activeReport && !reportLoading" class="report-result">
          <div v-if="reportData.length === 0" class="report-empty">
            {{ activeReport === 'current' ? 'Наразі всі працюють' : 'Немає змін статусів цього місяця' }}
          </div>
          <table v-else class="report-table">
            <thead>
              <tr>
                <th>ПІБ</th>
                <th>Статус</th>
                <th>Початок</th>
                <th>Закінчення</th>
                <th>Днів</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reportData" :key="row.employee_id">
                <td><span class="report-name-link" @click="openEmployeeCard(row.employee_id)">{{ row.name }}</span></td>
                <td>{{ row.status_type }}</td>
                <td>{{ formatEventDate(row.status_start_date) }}</td>
                <td>{{ formatEventDate(row.status_end_date) }}</td>
                <td>{{ row.days }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="reportLoading" class="report-empty">Завантаження...</div>
      </div>
      <div v-if="lastUpdated" class="dashboard-footer">
        Оновлено: {{ formattedLastUpdated }}
      </div>
    </div>
  </div>
</template>
