<script setup>
import { ref } from "vue";
import TemplatesView from "./TemplatesView.vue";
import DocumentHistoryView from "./DocumentHistoryView.vue";

const activeTab = ref('templates');
</script>

<template>
  <div class="documents-view">
    <div class="documents-tabs">
      <button
        :class="['documents-tab-btn', { active: activeTab === 'templates' }]"
        @click="activeTab = 'templates'"
      >
        Шаблони
      </button>
      <button
        :class="['documents-tab-btn', { active: activeTab === 'history' }]"
        @click="activeTab = 'history'"
      >
        Історія документів
      </button>
    </div>

    <div class="documents-tab-content">
      <TemplatesView v-if="activeTab === 'templates'" />
      <DocumentHistoryView v-else-if="activeTab === 'history'" />
    </div>
  </div>
</template>

<style scoped>
.documents-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.documents-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.documents-tab-btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: var(--panel-bg);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.documents-tab-btn:hover {
  background: var(--hover-bg);
}

.documents-tab-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.documents-tab-content {
  flex: 1;
  overflow: auto;
}
</style>
