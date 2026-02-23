<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { useDismissedEvents } from "../composables/useDismissedEvents";
import { useDashboardNotifications } from "../composables/useDashboardNotifications";
import { useDashboardStats } from "../composables/useDashboardStats";
import { useDashboardTimeline } from "../composables/useDashboardTimeline";
import { useDashboardReport } from "../composables/useDashboardReport";
import { displayName } from "../utils/employee";

const router = useRouter();

const employees = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const lastUpdated = ref(null);
const isRefreshing = ref(false);

// Refresh interval
const refreshIntervalId = ref(null);

// Fields schema for role-based lookups
const allFieldsSchema = ref([]);

// Dynamic status values from employees (get employment_status field options via role)
const employmentOptions = ref([]);
const workingStatus = computed(() => employmentOptions.value[0] || '');

// Dismissed events and notifications composables
const dismissed = useDismissedEvents();
const { loadDismissedEvents } = dismissed;
const {
  showStatusNotification,
  showDocExpiryNotification,
  showBirthdayNotification,
  showRetirementNotification,
  filteredStatusReturning,
  filteredStatusStarting,
  filteredDocExpiryToday,
  filteredDocExpiryWeek,
  filteredBirthdayToday,
  filteredBirthdayNext30Days,
  filteredRetirementToday,
  filteredRetirementThisMonth,
  checkStatusChanges,
  checkDocumentExpiry,
  checkBirthdayEvents,
  checkRetirementEvents,
  closeStatusNotification,
  closeDocExpiryNotification,
  closeBirthdayNotification,
  closeRetirementNotification,
  dismissStatusNotification,
  dismissDocExpiryNotification,
  dismissBirthdayNotification,
  dismissRetirementNotification,
} = useDashboardNotifications(employees, employmentOptions, workingStatus, dismissed, allFieldsSchema);

const {
  expandedCard,
  dashboardStats,
  expandedEmployees,
  statusCardColor,
  toggleStatCard,
} = useDashboardStats(employees, employmentOptions, allFieldsSchema);

const {
  dashboardEvents,
  dashboardOverdueEvents,
  loadDashboardEvents,
  loadOverdueDocuments,
  formatEventDate,
  daysFromNowLabel,
  statusEmoji,
  docExpiryEmoji,
  timelineEventEmoji,
  timelineEventDesc,
} = useDashboardTimeline(employmentOptions);

const {
  activeReport,
  reportData,
  reportLoading,
  absentEmployeesCount,
  statusChangesThisMonthCount,
  toggleReport,
  loadCounts,
} = useDashboardReport(errorMessage);

const formattedLastUpdated = computed(() => {
  if (!lastUpdated.value) return '';
  const d = lastUpdated.value;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});

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
    await checkRetirementEvents(lastUpdated);
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

function openEmployeeCard(employeeId) {
  router.push({ name: 'cards', params: { id: employeeId } });
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
    allFieldsSchema.value = data.allFields || [];
    // Find employment status field by role instead of hardcoded field_name
    const statusField = allFieldsSchema.value.find(f => f.role === 'STATUS');
    employmentOptions.value = statusField?.options || [];
  } catch (error) {
    console.error('Failed to load fields schema:', error);
  }
}

onMounted(async () => {
  loadDismissedEvents();
  await loadFieldsSchema();
  await loadCounts();
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
          <div v-if="filteredBirthdayNext30Days.length > 0" class="notification-section">
            <p class="notification-message">🎉 Найближчі дні народження:</p>
            <ul class="vacation-employees-list">
              <li v-for="(evt, idx) in filteredBirthdayNext30Days" :key="'bday-week-' + idx" class="vacation-employee returning">
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
                {{ displayName(emp, allFieldsSchema) }}
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
                {{ displayName(emp, allFieldsSchema) }}
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
                {{ displayName(emp, allFieldsSchema) }}
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
          <div class="timeline-title">Найближчі 30 днів</div>
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
            Хто відсутній зараз<span v-if="absentEmployeesCount > 0"> ({{ absentEmployeesCount }})</span>
          </button>
          <button class="report-btn" :class="{ active: activeReport === 'month' }" @click="toggleReport('month')">
            Зміни статусів цього місяця<span v-if="statusChangesThisMonthCount > 0"> ({{ statusChangesThisMonthCount }})</span>
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
