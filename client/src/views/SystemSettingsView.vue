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
        <button
          :class="['subtab-btn', { active: activeTab === 'field-schema' }]"
          @click="activeTab = 'field-schema'"
        >
          Схема полів
        </button>
      </div>

      <!-- Tab content -->
      <div class="subtab-content">
        <ImportView v-if="activeTab === 'import'" />
        <LogsView v-if="activeTab === 'logs'" />
        <FieldSchemaEditorView v-if="activeTab === 'field-schema'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import ImportView from "./ImportView.vue";
import LogsView from "./LogsView.vue";
import FieldSchemaEditorView from "./FieldSchemaEditorView.vue";

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
  border-bottom: 1px solid var(--line);
  background: var(--bg);
}

.subtab-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: background-color 0.2s, border-color 0.2s;
}

.subtab-btn:hover {
  background: var(--bg-accent);
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
