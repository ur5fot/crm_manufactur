<template>
  <div class="layout-table">
    <div class="panel table-panel">
      <div class="view-header">
        <div class="panel-title">Історія згенерованих документів</div>
        <button class="secondary" type="button" @click="loadDocumentHistory">
          🔄 Оновити
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-grid">
          <div class="field">
            <label>Шаблон</label>
            <select v-model="documentHistoryFilters.template_id">
              <option value="">Всі шаблони</option>
              <option v-for="template in templates" :key="template.template_id" :value="template.template_id">
                {{ template.template_name }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>Пошук співробітника</label>
            <input
              type="text"
              v-model="documentHistorySearchTerm"
              placeholder="Введіть ПІБ або ID..."
            />
          </div>

          <div class="field">
            <label>Дата від</label>
            <input type="date" v-model="documentHistoryFilters.start_date" />
          </div>

          <div class="field">
            <label>Дата до</label>
            <input type="date" v-model="documentHistoryFilters.end_date" />
          </div>
        </div>

        <div class="filters-actions">
          <button class="primary" type="button" @click="loadDocumentHistory">
            Застосувати фільтри
          </button>
          <button class="secondary" type="button" @click="clearDocumentHistoryFilters">
            Очистити фільтри
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <div v-if="documentHistoryLoading" style="padding: 24px; text-align: center;">
          Завантаження...
        </div>

        <div v-else-if="documentHistoryError" class="error-message" style="padding: 16px; background: #fee; color: #c00; border-radius: 8px; margin-bottom: 16px;">
          {{ documentHistoryError }}
        </div>

        <div v-else-if="filteredDocuments.length === 0" style="padding: 24px; text-align: center; color: #666;">
          Немає згенерованих документів
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Шаблон</th>
              <th>Співробітник</th>
              <th>Дата генерації</th>
              <th>Згенеровано</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in filteredDocuments" :key="doc.document_id">
              <td>{{ doc.document_id }}</td>
              <td>{{ doc.template_name || 'N/A' }}</td>
              <td>
                <template v-if="!doc.employee_id">
                  <span class="general-badge">Загальний</span>
                </template>
                <template v-else>
                  {{ doc.employee_name || `ID: ${doc.employee_id}` }}
                </template>
              </td>
              <td>{{ doc.generation_date ? new Date(doc.generation_date).toLocaleDateString('uk-UA') : 'N/A' }}</td>
              <td>{{ doc.generated_by || 'Система' }}</td>
              <td>
                <button
                  class="primary small"
                  type="button"
                  @click="downloadGeneratedDocument(doc.document_id)"
                  title="Завантажити документ"
                >
                  ⬇ Завантажити
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!documentHistoryLoading && filteredDocuments.length > 0" class="pagination" style="display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px;">
        <button
          class="secondary small"
          type="button"
          @click="goToDocumentHistoryPage(documentHistoryCurrentPage - 1)"
          :disabled="documentHistoryCurrentPage === 1"
        >
          ← Попередня
        </button>

        <span v-if="documentHistorySearchTerm">
          Знайдено: {{ filteredDocuments.length }} з {{ generatedDocuments.length }} на сторінці
        </span>
        <span v-else>
          Сторінка {{ documentHistoryCurrentPage }} з {{ documentHistoryTotalPages }}
          (всього: {{ documentHistoryPagination.total }} документів)
        </span>

        <button
          class="secondary small"
          type="button"
          @click="goToDocumentHistoryPage(documentHistoryCurrentPage + 1)"
          :disabled="documentHistoryCurrentPage >= documentHistoryTotalPages"
        >
          Наступна →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { api } from "../api";

// Document history management
const generatedDocuments = ref([]);
const templates = ref([]);
const documentHistoryLoading = ref(false);
const documentHistoryError = ref('');
const documentHistoryFilters = reactive({
  template_id: '',
  employee_id: '',
  start_date: '',
  end_date: ''
});
const documentHistoryPagination = reactive({
  offset: 0,
  limit: 50,
  total: 0
});
const documentHistorySearchTerm = ref('');

// Load templates for filter dropdown
async function loadTemplates() {
  try {
    const data = await api.getTemplates();
    templates.value = data.templates || [];
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

// Document history functions
async function loadDocumentHistory() {
  documentHistoryLoading.value = true;
  documentHistoryError.value = "";
  try {
    const filters = {
      template_id: documentHistoryFilters.template_id || undefined,
      employee_id: documentHistoryFilters.employee_id || undefined,
      start_date: documentHistoryFilters.start_date || undefined,
      end_date: documentHistoryFilters.end_date || undefined,
      offset: documentHistoryPagination.offset,
      limit: documentHistoryPagination.limit
    };

    const data = await api.getGeneratedDocuments(filters);
    generatedDocuments.value = data.documents || [];
    documentHistoryPagination.total = data.total || 0;
  } catch (error) {
    documentHistoryError.value = error.message;
    generatedDocuments.value = [];
    documentHistoryPagination.total = 0;
  } finally {
    documentHistoryLoading.value = false;
  }
}

function clearDocumentHistoryFilters() {
  documentHistoryFilters.template_id = '';
  documentHistoryFilters.employee_id = '';
  documentHistoryFilters.start_date = '';
  documentHistoryFilters.end_date = '';
  documentHistorySearchTerm.value = '';
  documentHistoryPagination.offset = 0;
  loadDocumentHistory();
}

function goToDocumentHistoryPage(page) {
  documentHistoryPagination.offset = (page - 1) * documentHistoryPagination.limit;
  loadDocumentHistory();
}

function downloadGeneratedDocument(documentId) {
  const downloadUrl = api.downloadDocument(documentId);
  window.open(downloadUrl, '_blank');
}

// Computed values for document history
const filteredDocuments = computed(() => {
  if (!documentHistorySearchTerm.value) {
    return generatedDocuments.value;
  }
  const search = documentHistorySearchTerm.value.toLowerCase();
  return generatedDocuments.value.filter(doc => {
    return (
      (doc.template_name && doc.template_name.toLowerCase().includes(search)) ||
      (doc.employee_name && doc.employee_name.toLowerCase().includes(search)) ||
      (doc.document_id && doc.document_id.toString().includes(search))
    );
  });
});

const documentHistoryCurrentPage = computed(() => {
  return Math.floor(documentHistoryPagination.offset / documentHistoryPagination.limit) + 1;
});

const documentHistoryTotalPages = computed(() => {
  return Math.ceil(documentHistoryPagination.total / documentHistoryPagination.limit);
});

// Initialize on mount
onMounted(() => {
  loadTemplates();
  loadDocumentHistory();
});
</script>
