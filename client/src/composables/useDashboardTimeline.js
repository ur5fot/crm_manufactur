import { ref } from "vue";
import { api } from "../api";

const shortDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function useDashboardTimeline(employmentOptions) {
  const dashboardEvents = ref({ today: [], thisWeek: [] });
  const dashboardOverdueEvents = ref([]);

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

      const weekBirthdayEvents = (birthdayData.next30Days || []).map(evt => mapBirthdayEvent(evt, false));
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

  return {
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
  };
}
