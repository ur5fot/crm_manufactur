<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "./api";
import { SEARCH_MIN_LENGTH, SEARCH_DEBOUNCE_MS } from "./utils/constants";
import { displayName } from "./utils/employee";
import DashboardView from "./views/DashboardView.vue";
import TableView from "./views/TableView.vue";
import PlaceholderReferenceView from "./views/PlaceholderReferenceView.vue";
import LogsView from "./views/LogsView.vue";
import ImportView from "./views/ImportView.vue";
import DocumentHistoryView from "./views/DocumentHistoryView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import ReportsView from "./views/ReportsView.vue";
import DocumentsView from "./views/DocumentsView.vue";
import SystemSettingsView from "./views/SystemSettingsView.vue";

const router = useRouter();
const route = useRoute();

// Global search
const globalSearchTerm = ref("");
const globalSearchResults = ref({ employees: [], templates: [], documents: [] });
const showGlobalSearchResults = ref(false);
const globalSearchLoading = ref(false);

// Theme management
const currentTheme = ref(localStorage.getItem('theme') || 'light');

// Dropdown menu state
const showDropdown = ref(false);

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

function closeDropdown() {
  showDropdown.value = false;
}

function navigateToSystemSettings() {
  closeDropdown();
  router.push({ name: 'system-settings' });
}

async function openDataFolder() {
  closeDropdown();
  try {
    await api.openDataFolder();
  } catch (err) {
    console.error('Failed to open data folder:', err);
  }
}

// Compute current view based on route
const currentView = computed(() => route.name || 'dashboard');

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'cards', label: 'Картки' },
  { key: 'table', label: 'Таблиця' },
  { key: 'reports', label: 'Звіти' },
  { key: 'documents', label: 'Документи' },
];

function switchView(view) {
  router.push({ name: view });
}

// Theme toggle function
function toggleTheme() {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
  currentTheme.value = newTheme;
  localStorage.setItem('theme', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
}

// Global search
let globalSearchTimeout;

async function performGlobalSearch(query) {
  if (!query || query.trim().length < SEARCH_MIN_LENGTH) {
    globalSearchResults.value = { employees: [], templates: [], documents: [] };
    showGlobalSearchResults.value = false;
    return;
  }
  globalSearchLoading.value = true;
  try {
    const result = await api.globalSearch(query);
    if (globalSearchTerm.value === query) {
      globalSearchResults.value = result;
      showGlobalSearchResults.value = true;
    }
  } catch (err) {
    console.error('Global search failed:', err);
    if (globalSearchTerm.value === query) {
      globalSearchResults.value = { employees: [], templates: [], documents: [] };
    }
  } finally {
    if (globalSearchTerm.value === query) {
      globalSearchLoading.value = false;
    }
  }
}

watch(() => globalSearchTerm.value, (newTerm) => {
  clearTimeout(globalSearchTimeout);
  if (!newTerm || newTerm.trim().length < SEARCH_MIN_LENGTH) {
    globalSearchResults.value = { employees: [], templates: [], documents: [] };
    showGlobalSearchResults.value = false;
    return;
  }
  globalSearchTimeout = setTimeout(() => {
    performGlobalSearch(newTerm);
  }, SEARCH_DEBOUNCE_MS);
});

function onGlobalSearchFocus() {
  if (globalSearchTerm.value.trim().length >= 2 && globalSearchHasResults.value) {
    showGlobalSearchResults.value = true;
  }
}

function closeGlobalSearch() {
  showGlobalSearchResults.value = false;
}

function selectGlobalSearchEmployee(employeeId) {
  closeGlobalSearch();
  globalSearchTerm.value = "";
  router.push({ name: 'cards', params: { id: employeeId } });
}

function selectGlobalSearchTemplate() {
  closeGlobalSearch();
  globalSearchTerm.value = "";
  router.push({ name: 'documents' });
}

function selectGlobalSearchDocument(doc) {
  closeGlobalSearch();
  globalSearchTerm.value = "";
  const downloadUrl = api.downloadDocument(doc.document_id);
  window.open(downloadUrl, '_blank');
}

const globalSearchHasResults = computed(() => {
  const r = globalSearchResults.value;
  return r.employees.length > 0 || r.templates.length > 0 || r.documents.length > 0;
});

onMounted(async () => {
  // Apply theme on load
  document.documentElement.setAttribute('data-theme', currentTheme.value);

  // Add click listener to close dropdown when clicking outside
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  clearTimeout(globalSearchTimeout);
  document.removeEventListener('click', handleClickOutside);
});

function handleClickOutside(event) {
  const dropdown = document.querySelector('.dropdown-wrapper');
  if (dropdown && !dropdown.contains(event.target)) {
    showDropdown.value = false;
  }
}
</script>

<template>
  <div class="app">
    <div class="page">
      <header class="topbar">
        <div class="brand">
          <div class="brand-title">CRM на CSV</div>
          <div class="brand-sub">Vue + Node, локальні CSV файли</div>
        </div>
        <div class="global-search-wrapper">
          <input
            v-model="globalSearchTerm"
            class="global-search-input"
            type="search"
            placeholder="Глобальний пошук..."
            @focus="onGlobalSearchFocus"
            @blur="closeGlobalSearch"
          />
          <div v-if="globalSearchLoading" class="global-search-spinner">...</div>
          <div
            v-if="showGlobalSearchResults && globalSearchHasResults"
            class="global-search-dropdown"
          >
            <div v-if="globalSearchResults.employees.length > 0" class="global-search-group">
              <div class="global-search-group-header">
                Співробітники ({{ globalSearchResults.total?.employees || globalSearchResults.employees.length }})
              </div>
              <div
                v-for="emp in globalSearchResults.employees"
                :key="'emp-' + emp.employee_id"
                class="global-search-item"
                @mousedown.prevent="selectGlobalSearchEmployee(emp.employee_id)"
              >
                <span class="global-search-item-name">{{ displayName(emp) }}</span>
                <span class="global-search-item-meta">ID: {{ emp.employee_id }}</span>
              </div>
            </div>
            <div v-if="globalSearchResults.templates.length > 0" class="global-search-group">
              <div class="global-search-group-header">
                Шаблони ({{ globalSearchResults.total?.templates || globalSearchResults.templates.length }})
              </div>
              <div
                v-for="tmpl in globalSearchResults.templates"
                :key="'tmpl-' + tmpl.template_id"
                class="global-search-item"
                @mousedown.prevent="selectGlobalSearchTemplate(tmpl.template_id)"
              >
                <span class="global-search-item-name">{{ tmpl.template_name }}</span>
                <span class="global-search-item-meta">{{ tmpl.template_type || '' }}</span>
              </div>
            </div>
            <div v-if="globalSearchResults.documents.length > 0" class="global-search-group">
              <div class="global-search-group-header">
                Документи ({{ globalSearchResults.total?.documents || globalSearchResults.documents.length }})
              </div>
              <div
                v-for="doc in globalSearchResults.documents"
                :key="'doc-' + doc.document_id"
                class="global-search-item"
                @mousedown.prevent="selectGlobalSearchDocument(doc)"
              >
                <span class="global-search-item-name">{{ doc.docx_filename || 'Без назви' }}</span>
                <span class="global-search-item-meta">{{ doc.employee_name || '' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="tab-bar">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: currentView === tab.key }]"
            @click="switchView(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="topbar-actions">
          <button
            class="icon-btn theme-toggle-btn"
            @click="toggleTheme"
            :title="currentTheme === 'light' ? 'Перемкнути на темну тему' : 'Перемкнути на світлу тему'"
          >
            {{ currentTheme === 'light' ? '🌙' : '☀️' }}
          </button>
          <div class="dropdown-wrapper">
            <button
              class="icon-btn dropdown-toggle-btn"
              @click="toggleDropdown"
              title="Меню"
            >
              ⋮
            </button>
            <div v-if="showDropdown" class="dropdown-menu" @click.stop>
              <button class="dropdown-item" @click="navigateToSystemSettings">
                Налаштування системи
              </button>
              <button class="dropdown-item" @click="openDataFolder">
                Відкрити папку даних
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Dashboard View -->
      <DashboardView v-if="currentView === 'dashboard'" />

      <!-- Cards view loaded via router -->
      <router-view v-else-if="currentView === 'cards'" />

      <!-- Table View -->
      <TableView v-else-if="currentView === 'table'" />

      <!-- Reports View -->
      <ReportsView v-else-if="currentView === 'reports'" />

      <!-- Режим імпорту -->
      <ImportView v-else-if="currentView === 'import'" />

      <!-- Documents View (combines Templates and Document History) -->
      <DocumentsView v-else-if="currentView === 'documents'" />

      <!-- Templates View (legacy route support) -->
      <TemplatesView v-else-if="currentView === 'templates'" />

      <!-- Document History View (legacy route support) -->
      <DocumentHistoryView v-else-if="currentView === 'document-history'" />

      <!-- Placeholder Reference View -->
      <PlaceholderReferenceView v-else-if="currentView === 'placeholder-reference'" />

      <!-- Logs View (legacy route support) -->
      <LogsView v-else-if="currentView === 'logs'" />

      <!-- System Settings View -->
      <SystemSettingsView v-else-if="currentView === 'system-settings'" />

    </div>
  </div>
</template>
