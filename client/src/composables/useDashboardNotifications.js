import { ref, computed } from "vue";
import { api } from "../api";
import { displayName } from "../utils/employee";

// Module-level deduplication state (persists across re-renders but resets on page reload)
const notifiedEmployeeIds = new Set();
let notifiedDate = '';
let docExpiryNotifiedDate = '';
let birthdayNotifiedDate = '';
const retirementNotifiedIds = new Set();
let retirementNotifiedDate = '';

export function useDashboardNotifications(employees, employmentOptions, workingStatus, dismissed, allFieldsSchema) {
  const { dismissedEvents, generateEventId, dismissEvent } = dismissed;

  // Helper to resolve field name by role from schema
  function fieldKey(role, fallback) {
    if (allFieldsSchema && allFieldsSchema.value) {
      const f = allFieldsSchema.value.find(f => f.role === role);
      if (f) return f.key;
    }
    return fallback;
  }

  // Notification state
  const statusReturning = ref([]);
  const statusStarting = ref([]);
  const showStatusNotification = ref(false);
  const docExpiryToday = ref([]);
  const docExpiryWeek = ref([]);
  const showDocExpiryNotification = ref(false);
  const birthdayToday = ref([]);
  const birthdayNext30Days = ref([]);
  const showBirthdayNotification = ref(false);
  const retirementToday = ref([]);
  const retirementThisMonth = ref([]);
  const showRetirementNotification = ref(false);

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

  const filteredBirthdayNext30Days = computed(() => {
    return birthdayNext30Days.value.filter(evt => {
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

  // Check functions
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

    const statusKey = fieldKey('STATUS', 'employment_status');
    const startDateKey = fieldKey('STATUS_START', 'status_start_date');
    const endDateKey = fieldKey('STATUS_END', 'status_end_date');
    const positionKey = fieldKey('POSITION', 'position');

    employees.value.forEach(employee => {
      const startDate = employee[startDateKey];
      const endDate = employee[endDateKey];

      if (!startDate && !endDate) return;

      const firedStatus = employmentOptions.value[1] || '';
      const isFired = firedStatus && employee[statusKey] === firedStatus;

      if (endDate === today && !isFired) {
        returningToday.push({
          id: employee.employee_id,
          name: displayName(employee, allFieldsSchema && allFieldsSchema.value),
          position: employee[positionKey] || '',
          statusType: employee[statusKey]
        });
        return;
      }

      if (endDate && endDate < today && !isFired) {
        needsUpdate.push({
          ...employee,
          [startDateKey]: '',
          [endDateKey]: '',
          [statusKey]: workingStatus.value
        });
        return;
      }

      if (startDate === today && employee[statusKey] !== workingStatus.value) {
        startingToday.push({
          id: employee.employee_id,
          name: displayName(employee, allFieldsSchema && allFieldsSchema.value),
          position: employee[positionKey] || '',
          endDate: endDate,
          statusType: employee[statusKey]
        });
        return;
      }
    });

    for (const employee of needsUpdate) {
      try {
        await api.updateEmployee(employee.employee_id, employee);
      } catch (error) {
        console.error(`Помилка оновлення співробітника ${employee.employee_id}:`, error);
      }
    }

    const newReturning = returningToday.filter(e => !notifiedEmployeeIds.has(e.id));
    const newStarting = startingToday.filter(e => !notifiedEmployeeIds.has(e.id));
    statusReturning.value = newReturning;
    statusStarting.value = newStarting;

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
      docExpiryToday.value = todayItems;
      docExpiryWeek.value = weekItems;

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
      const next30DaysItems = data.next30Days || [];

      birthdayNotifiedDate = today;
      birthdayToday.value = todayItems;
      birthdayNext30Days.value = next30DaysItems;

      if (filteredBirthdayToday.value.length > 0 || filteredBirthdayNext30Days.value.length > 0) {
        showBirthdayNotification.value = true;
      }
    } catch (error) {
      console.error('Failed to check birthday events:', error);
    }
  }

  async function checkRetirementEvents(lastUpdated) {
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
        const retStatusKey = fieldKey('STATUS', 'employment_status');
        for (const event of newTodayItems) {
          const emp = employees.value.find(e => e.employee_id === event.employee_id);
          if (emp && emp[retStatusKey] === workingStatus.value) {
            try {
              await api.updateEmployee(event.employee_id, {
                ...emp,
                [retStatusKey]: firedStatus
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

      retirementToday.value = newTodayItems;
      retirementThisMonth.value = newThisMonthItems;

      if (filteredRetirementToday.value.length > 0 || filteredRetirementThisMonth.value.length > 0) {
        showRetirementNotification.value = true;
      }
    } catch (error) {
      console.error('Failed to check retirement events:', error);
    }
  }

  // Close functions
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

  // Dismiss functions
  function dismissStatusNotification() {
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
    filteredBirthdayToday.value.forEach(evt => {
      const eventId = generateEventId('birthday_today', evt.employee_id, evt.current_year_birthday);
      dismissEvent(eventId);
    });
    filteredBirthdayNext30Days.value.forEach(evt => {
      const eventId = generateEventId('birthday_week', evt.employee_id, evt.current_year_birthday);
      dismissEvent(eventId);
    });
    closeBirthdayNotification();
  }

  function dismissRetirementNotification() {
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

  return {
    // State
    showStatusNotification,
    showDocExpiryNotification,
    showBirthdayNotification,
    showRetirementNotification,
    // Filtered lists
    filteredStatusReturning,
    filteredStatusStarting,
    filteredDocExpiryToday,
    filteredDocExpiryWeek,
    filteredBirthdayToday,
    filteredBirthdayNext30Days,
    filteredRetirementToday,
    filteredRetirementThisMonth,
    // Check functions
    checkStatusChanges,
    checkDocumentExpiry,
    checkBirthdayEvents,
    checkRetirementEvents,
    // Close functions
    closeStatusNotification,
    closeDocExpiryNotification,
    closeBirthdayNotification,
    closeRetirementNotification,
    // Dismiss functions
    dismissStatusNotification,
    dismissDocExpiryNotification,
    dismissBirthdayNotification,
    dismissRetirementNotification,
  };
}
