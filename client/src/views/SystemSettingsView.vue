<template>
  <div class="layout-cards">
    <div class="panel full-width">
      <div class="panel-header">
        <div class="panel-title">Налаштування системи</div>
      </div>

      <!-- Tab navigation -->
      <div class="subtab-bar">
        <button
          :class="['subtab-btn', { active: activeTab === 'import' }]"
          @click="activeTab = 'import'"
        >
          Імпорт
        </button>
        <button
          :class="['subtab-btn', { active: activeTab === 'logs' }]"
          @click="activeTab = 'logs'"
        >
          Логи
        </button>
      </div>

      <!-- Tab content -->
      <div class="subtab-content">
        <ImportView v-if="activeTab === 'import'" />
        <LogsView v-if="activeTab === 'logs'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import ImportView from "./ImportView.vue";
import LogsView from "./LogsView.vue";

const activeTab = ref("import");
</script>

<style scoped>
.full-width {
  width: 100%;
}

.subtab-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.subtab-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: background-color 0.2s, border-color 0.2s;
}

.subtab-btn:hover {
  background: var(--hover-bg);
}

.subtab-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.subtab-content {
  padding: 0;
}
</style>
