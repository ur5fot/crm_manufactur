import { ref } from "vue";

const STORAGE_KEY = 'dashboardDismissedEvents';

export function useDismissedEvents() {
  const dismissedEvents = ref(new Set());

  function generateEventId(type, employeeId, date) {
    return `${type}:${employeeId}:${date}`;
  }

  function loadDismissedEvents() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        dismissedEvents.value = new Set(parsed);
      } catch (error) {
        console.error('Failed to load dismissed events:', error);
        localStorage.removeItem(STORAGE_KEY);
        dismissedEvents.value = new Set();
      }
    }
  }

  function dismissEvent(eventId) {
    const newSet = new Set(dismissedEvents.value);
    newSet.add(eventId);
    dismissedEvents.value = newSet;
    const arr = Array.from(newSet);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (error) {
      console.error('Failed to save dismissed event:', error);
    }
  }

  return {
    dismissedEvents,
    generateEventId,
    loadDismissedEvents,
    dismissEvent,
  };
}
