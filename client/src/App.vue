<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import LogsView from "./views/LogsView.vue";
import ImportView from "./views/ImportView.vue";
import DocumentHistoryView from "./views/DocumentHistoryView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import ReportsView from "./views/ReportsView.vue";
import DashboardView from "./views/DashboardView.vue";
import TableView from "./views/TableView.vue";
import PlaceholderReferenceView from "./views/PlaceholderReferenceView.vue";
import EmployeeCardsView from "./views/EmployeeCardsView.vue";

const router = useRouter();
const route = useRoute();

const currentView = computed(() => route.name || 'dashboard');

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
  router.push({ name: view });
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
        <div class="tab-bar">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-item"
            :class="{ active: currentView === tab.key }"
            @click="switchView(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
      </header>

      <!-- Режим Dashboard -->
      <DashboardView v-if="currentView === 'dashboard'" />

      <!-- Режим карточек -->
      <EmployeeCardsView v-else-if="currentView === 'cards'" />

      <!-- Режим сводної таблиці -->
      <TableView v-else-if="currentView === 'table'" />

      <!-- Режим звітів -->
      <ReportsView v-else-if="currentView === 'reports'" />

      <!-- Режим імпорту -->
      <ImportView v-else-if="currentView === 'import'" />

      <!-- Режим шаблонів -->
      <TemplatesView v-else-if="currentView === 'templates'" />

      <!-- Режим історії документів -->
      <DocumentHistoryView v-else-if="currentView === 'document-history'" />

      <!-- Довідник плейсхолдерів -->
      <PlaceholderReferenceView v-else-if="currentView === 'placeholder-reference'" />

      <!-- Режим логов -->
      <LogsView v-else-if="currentView === 'logs'" />
    </div>
  </div>
</template>
