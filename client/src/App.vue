<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "./api";
import DashboardView from "./views/DashboardView.vue";
import TableView from "./views/TableView.vue";
import PlaceholderReferenceView from "./views/PlaceholderReferenceView.vue";
import LogsView from "./views/LogsView.vue";
import ImportView from "./views/ImportView.vue";
import DocumentHistoryView from "./views/DocumentHistoryView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import ReportsView from "./views/ReportsView.vue";

const router = useRouter();
const route = useRoute();

// Global search
const globalSearchTerm = ref("");
const globalSearchResults = ref({ employees: [], templates: [], documents: [] });
const showGlobalSearchResults = ref(false);
const globalSearchLoading = ref(false);

// Theme management
const currentTheme = ref(localStorage.getItem('theme') || 'light');

// Compute current view based on route
const currentView = computed(() => {
  const name = route.name;
  if (name === 'dashboard') return 'dashboard';
  if (name === 'cards') return 'cards';
  if (name === 'table') return 'table';
  if (name === 'reports') return 'reports';
  if (name === 'import') return 'import';
  if (name === 'templates') return 'templates';
  if (name === 'document-history') return 'document-history';
  if (name === 'placeholder-reference') return 'placeholder-reference';
  if (name === 'logs') return 'logs';
  return 'dashboard';
});

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'cards', label: 'Картки' },
  { key: 'table', label: 'Таблиця' },
  { key: 'reports', label: 'Звіти' },
  { key: 'import', label: 'Імпорт' },
  { key: 'templates', label: 'Шаблони' },
  { key: 'document-history', label: 'Історія документів' },
  { key: 'logs', label: 'Логи' },
];

function switchView(view) {
  if (view === 'dashboard') {
    router.push({ name: 'dashboard' });
  } else if (view === 'cards') {
    router.push({ name: 'cards' });
  } else if (view === 'table') {
    router.push({ name: 'table' });
  } else if (view === 'reports') {
    router.push({ name: 'reports' });
  } else if (view === 'import') {
    router.push({ name: 'import' });
  } else if (view === 'templates') {
    router.push({ name: 'templates' });
  } else if (view === 'document-history') {
    router.push({ name: 'document-history' });
  } else if (view === 'logs') {
    router.push({ name: 'logs' });
  }
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
  if (!query || query.trim().length < 2) {
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
  if (!newTerm || newTerm.trim().length < 2) {
    globalSearchResults.value = { employees: [], templates: [], documents: [] };
    showGlobalSearchResults.value = false;
    return;
  }
  globalSearchTimeout = setTimeout(() => {
    performGlobalSearch(newTerm);
  }, 300);
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
  router.push({ name: 'templates' });
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

function displayName(employee) {
  const parts = [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Без імені";
}

onMounted(async () => {
  // Apply theme on load
  document.documentElement.setAttribute('data-theme', currentTheme.value);
});

onUnmounted(() => {
  clearTimeout(globalSearchTimeout);
});
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

      <!-- Templates View -->
      <TemplatesView v-else-if="currentView === 'templates'" />

      <!-- Document History View -->
      <DocumentHistoryView v-else-if="currentView === 'document-history'" />

      <!-- Placeholder Reference View -->
      <PlaceholderReferenceView v-else-if="currentView === 'placeholder-reference'" />

      <!-- Logs View -->
      <LogsView v-else-if="currentView === 'logs'" />

    </div>
  </div>
</template>
