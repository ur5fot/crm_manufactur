<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "../api";

const router = useRouter();
const route = useRoute();

// State
const placeholderRefData = ref(null);
const placeholderRefLoading = ref(false);
const placeholderRefError = ref('');
const placeholderRefSearch = ref('');

// Computed filtered placeholders
const filteredPlaceholders = computed(() => {
  if (!placeholderRefData.value) return [];
  const items = placeholderRefData.value.placeholders || [];
  if (!placeholderRefSearch.value) return items;
  const term = placeholderRefSearch.value.toLowerCase();
  return items.filter(p =>
    p.placeholder.toLowerCase().includes(term) ||
    p.label.toLowerCase().includes(term) ||
    p.value.toLowerCase().includes(term)
  );
});

// Load placeholder preview data
async function loadPlaceholderPreview() {
  placeholderRefLoading.value = true;
  placeholderRefError.value = '';
  try {
    const employeeId = route.params.employeeId || undefined;
    placeholderRefData.value = await api.getPlaceholderPreview(employeeId);
  } catch (error) {
    placeholderRefError.value = error.message;
    placeholderRefData.value = null;
  } finally {
    placeholderRefLoading.value = false;
  }
}

// Copy placeholder to clipboard
function copyPlaceholder(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// Lifecycle
onMounted(() => {
  loadPlaceholderPreview();
});
</script>

<template>
  <div class="layout-table">
    <div class="panel table-panel">
      <div class="view-header">
        <div class="panel-title">Довідник плейсхолдерів</div>
        <button class="secondary" type="button" @click="router.back()">← Назад</button>
      </div>

      <div v-if="placeholderRefLoading" class="loading-message">Завантаження...</div>
      <div v-else-if="placeholderRefError" class="error-message">{{ placeholderRefError }}</div>
      <template v-else-if="placeholderRefData">
        <div class="placeholder-ref-info">
          Дані співробітника: <strong>{{ placeholderRefData.employee_name }}</strong>
        </div>

        <div class="filter-row" style="margin-bottom: 12px;">
          <input
            type="text"
            class="form-control"
            v-model="placeholderRefSearch"
            placeholder="Пошук плейсхолдера..."
          />
        </div>

        <table class="table table-striped">
          <thead>
            <tr>
              <th>Плейсхолдер</th>
              <th>Опис</th>
              <th>Приклад значення</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in ['fields', 'declension', 'declension_fields', 'special', 'case_variants']" :key="group">
              <tr v-if="filteredPlaceholders.some(p => p.group === group)" class="placeholder-group-header">
                <td colspan="3">
                  {{ group === 'fields' ? 'Поля співробітника' : group === 'declension' ? 'Відмінювання імен' : group === 'declension_fields' ? 'Відмінювання посади та звання' : group === 'case_variants' ? 'Варіанти регістру' : 'Спеціальні' }}
                </td>
              </tr>
              <tr
                v-for="item in filteredPlaceholders.filter(p => p.group === group)"
                :key="item.placeholder"
              >
                <td
                  class="placeholder-cell"
                  @click="copyPlaceholder(item.placeholder)"
                  :title="'Натисніть, щоб скопіювати ' + item.placeholder"
                >{{ item.placeholder }}</td>
                <td>{{ item.label }}</td>
                <td>{{ item.value }}</td>
              </tr>
            </template>
          </tbody>
        </table>

        <div v-if="filteredPlaceholders.length === 0" class="empty-state">
          Нічого не знайдено за запитом "{{ placeholderRefSearch }}"
        </div>
      </template>
    </div>
  </div>
</template>
