<script setup>
import { ref } from "vue";
import { api } from "../api";

const loading = ref(false);
const errorMessage = ref("");
const importFile = ref(null);
const importResult = ref(null);
const importing = ref(false);

function onImportFileChange(event) {
  importFile.value = event.target.files?.[0] || null;
  importResult.value = null;
}

function resetImport() {
  importFile.value = null;
  importResult.value = null;
}

async function importEmployees() {
  if (!importFile.value) {
    return;
  }
  importing.value = true;
  errorMessage.value = "";
  try {
    const formData = new FormData();
    formData.append("file", importFile.value);
    const result = await api.importEmployees(formData);
    importResult.value = {
      added: result?.added ?? 0,
      skipped: result?.skipped ?? 0,
      errors: result?.errors || []
    };
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="layout-cards">
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Імпорт співробітників з CSV</div>
      </div>

      <div class="section">
        <div class="panel-header">
          <div class="section-title">Завантажити CSV файл</div>
          <a class="file-link" href="/api/download/import-template" download>
            Завантажити шаблон
          </a>
        </div>
        <div class="field">
          <label>CSV файл</label>
          <input type="file" accept=".csv,text/csv" @change="onImportFileChange" />
        </div>
        <div class="actions">
          <button
            class="primary"
            type="button"
            :disabled="!importFile || importing"
            @click="importEmployees"
          >
            {{ importing ? "Імпортуємо..." : "Імпортувати" }}
          </button>
          <button
            class="secondary"
            type="button"
            :disabled="!importFile && !importResult"
            @click="resetImport"
          >
            Очистити
          </button>
        </div>
        <div class="inline-note">
          CSV: UTF-8, роздільник ;, заголовки як у employees.csv. Прізвище або ім'я
          обов'язкові.
        </div>
        <div v-if="importFile" class="inline-note">Файл: {{ importFile.name }}</div>
        <div v-if="importResult" class="status-bar">
          Додано: {{ importResult.added }} · Пропущено: {{ importResult.skipped }}
        </div>
        <div
          v-if="importResult && importResult.errors && importResult.errors.length"
          class="inline-note"
        >
          Помилки (перші {{ importResult.errors.length }}):
        </div>
        <div
          v-if="importResult && importResult.errors && importResult.errors.length"
          class="table-list"
        >
          <div
            v-for="error in importResult.errors"
            :key="`${error.row}-${error.reason}`"
            class="error-row"
          >
            <div class="employee-name">Рядок {{ error.row }}</div>
            <div class="inline-note">{{ error.reason }}</div>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="alert">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>
