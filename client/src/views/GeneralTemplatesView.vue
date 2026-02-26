<template>
  <div class="layout-table">
    <div class="panel table-panel">
      <div class="view-header">
        <div class="panel-title">Загальні шаблони</div>
        <button class="secondary" type="button" @click="loadGeneralTemplates">
          🔄 Оновити
        </button>
      </div>

      <div v-if="loading" style="padding: 24px; text-align: center;">
        Завантаження...
      </div>

      <div v-else-if="generalTemplates.length === 0" class="empty-state">
        <p>Загальних шаблонів немає. Позначте шаблон як загальний у вкладці «Шаблони».</p>
      </div>

      <div v-else class="templates-table-container">
        <table class="templates-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Назва</th>
              <th>Тип</th>
              <th>Файл DOCX</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in generalTemplates" :key="template.template_id">
              <td style="text-align: center;">{{ template.template_id }}</td>
              <td>{{ template.template_name }}</td>
              <td>
                <span class="template-type-badge" :data-type="template.template_type">
                  {{ template.template_type }}
                </span>
              </td>
              <td>
                <span v-if="template.docx_filename" class="file-uploaded">
                  ✓ {{ template.docx_filename }}
                </span>
                <span v-else class="file-missing">
                  ⚠ Файл відсутній
                </span>
              </td>
              <td>
                <button
                  class="primary small"
                  type="button"
                  :disabled="!template.docx_filename || generating === template.template_id"
                  @click="generateDocument(template)"
                >
                  {{ generating === template.template_id ? 'Генерація...' : 'Створити документ' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api";

const generalTemplates = ref([]);
const loading = ref(false);
const generating = ref(null);

async function loadGeneralTemplates() {
  loading.value = true;
  try {
    const data = await api.getTemplates();
    generalTemplates.value = (data.templates || []).filter(t => t.is_general === 'yes');
  } catch (error) {
    console.error('Failed to load general templates:', error);
  } finally {
    loading.value = false;
  }
}

async function generateDocument(template) {
  if (!template.docx_filename) {
    alert('Помилка: для цього шаблону не завантажено файл DOCX');
    return;
  }

  generating.value = template.template_id;
  try {
    const result = await api.generateGeneralDocument(template.template_id);
    const downloadUrl = api.downloadDocument(result.document_id);
    window.open(downloadUrl, '_blank');
    alert(`✓ Документ "${template.template_name}" успішно згенеровано`);
  } catch (error) {
    alert('Помилка генерування документа: ' + error.message);
  } finally {
    generating.value = null;
  }
}

onMounted(() => {
  loadGeneralTemplates();
});
</script>
