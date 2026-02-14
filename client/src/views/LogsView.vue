<script setup>
import { ref, computed, onMounted } from "vue";
import { api } from "../api";

const loading = ref(false);
const errorMessage = ref("");
const logs = ref([]);
const logsSearchTerm = ref("");

const allFieldsSchema = ref([]);

const fieldLabels = computed(() => {
  const map = {};
  allFieldsSchema.value.forEach(f => {
    map[f.key] = f.label;
  });
  return map;
});

const filteredLogs = computed(() => {
  const query = logsSearchTerm.value.trim().toLowerCase();
  if (!query) {
    return logs.value;
  }
  return logs.value.filter((log) => {
    const haystack = [
      log.action,
      log.employee_id,
      log.employee_name,
      log.field_name,
      log.old_value,
      log.new_value,
      log.details,
      log.timestamp
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
});

function getFieldLabel(fieldName) {
  if (!fieldName) return "";
  const label = fieldLabels.value[fieldName] || fieldName;
  return `${label} (${fieldName})`;
}

function getDetailLabel(detail) {
  if (!detail) return "";
  const match = detail.match(/Изменено поле: (\w+)/);
  if (match) {
    const fieldName = match[1];
    const label = fieldLabels.value[fieldName] || fieldName;
    return `Змінено поле: ${label} (${fieldName})`;
  }
  return detail;
}

async function loadSchema() {
  try {
    const data = await api.getFieldsSchema();
    allFieldsSchema.value = (data.allFields || []).map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
    }));
  } catch (error) {
    console.error("Failed to load schema:", error);
  }
}

async function loadLogs() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await api.getLogs();
    logs.value = data.logs || [];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadSchema(), loadLogs()]);
});
</script>

<template>
  <div class="layout-table">
    <div class="panel table-panel">
      <div class="panel-header">
        <div class="panel-title">Журнал змін</div>
        <div class="actions">
          <button class="secondary" type="button" @click="loadLogs">
            Оновити
          </button>
          <div class="status-bar">
            <span v-if="loading">Завантаження...</span>
            <span v-else>{{ filteredLogs.length }} записів</span>
          </div>
        </div>
      </div>

      <input
        v-model="logsSearchTerm"
        class="search-input"
        type="search"
        placeholder="Пошук за ПІБ, дією, полем або значенням"
      />

      <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>

      <div class="table-container">
        <table class="summary-table logs-table">
          <thead>
            <tr>
              <th>Дата і час</th>
              <th>Дія</th>
              <th>ID</th>
              <th>Співробітник</th>
              <th>Поле</th>
              <th>Старе значення</th>
              <th>Нове значення</th>
              <th>Деталі</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in filteredLogs" :key="log.log_id">
              <td class="log-timestamp">
                {{ new Date(log.timestamp).toLocaleString('ru-RU') }}
              </td>
              <td>
                <span
                  class="log-action"
                  :class="{
                    'action-create': log.action === 'CREATE',
                    'action-update': log.action === 'UPDATE',
                    'action-delete': log.action === 'DELETE'
                  }"
                >
                  {{ log.action }}
                </span>
              </td>
              <td class="id-cell">{{ log.employee_id }}</td>
              <td>{{ log.employee_name }}</td>
              <td>{{ getFieldLabel(log.field_name) }}</td>
              <td class="log-value">{{ log.old_value || '—' }}</td>
              <td class="log-value">{{ log.new_value || '—' }}</td>
              <td class="log-details">{{ getDetailLabel(log.details) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
