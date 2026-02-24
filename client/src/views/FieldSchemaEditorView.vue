<template>
  <div class="field-schema-editor">
    <div class="editor-header">
      <h3>Редактор схеми полів</h3>
      <div class="editor-actions">
        <button class="btn btn-secondary" @click="addField">+ Додати поле</button>
        <button class="btn btn-secondary" :disabled="!isDirty" @click="cancelEdits">Скасувати</button>
        <button
          class="btn btn-primary"
          :disabled="!isDirty || saving"
          @click="handleApply"
        >
          {{ renamedFields.length > 0 ? 'Переглянути зміни' : 'Зберегти' }}
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
    <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>

    <div v-if="loading" class="loading-text">Завантаження...</div>

    <div v-else class="schema-table-wrapper">
      <table class="table table-striped schema-table">
        <thead>
          <tr>
            <th class="col-order">#</th>
            <th class="col-id">field_id</th>
            <th class="col-name">field_name</th>
            <th class="col-label">field_label</th>
            <th class="col-type">Тип</th>
            <th class="col-group">Група</th>
            <th class="col-role">Роль</th>
            <th class="col-impact">Дані</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(field, index) in fields" :key="field.field_id" :class="{ 'row-changed': isFieldChanged(index) }">
            <td class="col-order">
              <input
                type="number"
                class="form-control form-control-sm order-input"
                v-model="field.field_order"
              />
            </td>
            <td class="col-id">
              <code>{{ field.field_id }}</code>
            </td>
            <td class="col-name">
              <input
                type="text"
                class="form-control form-control-sm"
                v-model="field.field_name"
                :class="{ 'input-changed': isNameChanged(index) }"
                :disabled="!!field.role"
                :title="field.role ? 'Системне поле не можна перейменувати' : ''"
              />
            </td>
            <td class="col-label">
              <input
                type="text"
                class="form-control form-control-sm"
                v-model="field.field_label"
                :class="{ 'input-changed': isLabelChanged(index) }"
              />
            </td>
            <td class="col-type">{{ field.field_type }}</td>
            <td class="col-group">
              <input
                type="text"
                class="form-control form-control-sm"
                v-model="field.field_group"
              />
            </td>
            <td class="col-role">
              <span v-if="field.role" class="role-badge">{{ field.role }}</span>
            </td>
            <td class="col-impact">
              <span class="impact-stat" title="Співробітники з даними">{{ field.impact?.employees || 0 }}</span>
            </td>
            <td class="col-actions">
              <button
                v-if="!field.role"
                class="btn btn-sm btn-danger"
                @click="removeField(index)"
                title="Видалити поле"
              >&times;</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Preview Modal -->
    <div v-if="showPreviewModal" class="vacation-notification-overlay" @click="showPreviewModal = false">
      <div class="vacation-notification-modal preview-modal" @click.stop>
        <div class="vacation-notification-header">
          <h3>Перегляд змін</h3>
          <button class="close-btn" @click="showPreviewModal = false">&times;</button>
        </div>
        <div class="preview-body">
          <div v-if="previewLoading" class="loading-text">Завантаження...</div>
          <div v-else-if="previewData && previewData.length > 0">
            <div v-for="item in previewData" :key="item.field_id" class="preview-rename-item">
              <div class="rename-header">
                <strong>{{ item.old_name }}</strong> &rarr; <strong>{{ item.new_name }}</strong>
              </div>
              <div class="rename-details">
                <span>Співробітники: {{ item.previewImpact.employees }}</span>
                <span>Шаблони: {{ item.previewImpact.templates }}</span>
                <span>Логи: {{ item.previewImpact.logs }}</span>
              </div>
              <div v-if="item.renames && item.renames.length > 1" class="rename-sub">
                <small>Також перейменується:</small>
                <ul>
                  <li v-for="r in item.renames.slice(1)" :key="r.old">{{ r.old }} &rarr; {{ r.new }}</li>
                </ul>
              </div>
            </div>
          </div>
          <div v-else>
            <p>Немає перейменувань полів.</p>
          </div>
        </div>
        <div class="preview-actions">
          <button class="btn btn-secondary" @click="showPreviewModal = false">Скасувати</button>
          <button class="btn btn-primary" :disabled="saving" @click="applyChanges">
            {{ saving ? 'Збереження...' : 'Застосувати' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useFieldSchemaEditor } from "../composables/useFieldSchemaEditor.js";

const {
  fields,
  originalFields,
  loading,
  saving,
  errorMessage,
  successMessage,
  isDirty,
  renamedFields,
  showPreviewModal,
  previewLoading,
  previewData,
  loadSchema,
  cancelEdits,
  previewChanges,
  applyChanges,
  addField,
  removeField
} = useFieldSchemaEditor();

function isFieldChanged(index) {
  const f = fields.value[index];
  const o = originalFields.value.find(orig => orig.field_id === f.field_id);
  if (!o) return true;
  return f.field_name !== o.field_name || f.field_label !== o.field_label ||
    f.field_order !== o.field_order || f.field_group !== o.field_group;
}

function isNameChanged(index) {
  const f = fields.value[index];
  const o = originalFields.value.find(orig => orig.field_id === f.field_id);
  return o && f.field_name !== o.field_name;
}

function isLabelChanged(index) {
  const f = fields.value[index];
  const o = originalFields.value.find(orig => orig.field_id === f.field_id);
  return o && f.field_label !== o.field_label;
}

async function handleApply() {
  if (renamedFields.value.length > 0) {
    await previewChanges();
  } else {
    await applyChanges();
  }
}

onMounted(() => {
  loadSchema();
});
</script>

<style scoped>
.field-schema-editor {
  padding: 1rem;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.editor-header h3 {
  margin: 0;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.schema-table-wrapper {
  overflow-x: auto;
}

.schema-table {
  font-size: 0.85rem;
}

.schema-table th {
  white-space: nowrap;
}

.col-order { width: 60px; }
.col-id { width: 150px; }
.col-name { width: 180px; }
.col-label { width: 180px; }
.col-type { width: 80px; }
.col-group { width: 150px; }
.col-role { width: 120px; }
.col-impact { width: 60px; text-align: center; }
.col-actions { width: 40px; }

.order-input {
  width: 55px;
  text-align: center;
}

.role-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  background: var(--accent, #0d6efd);
  color: white;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
}

.impact-stat {
  font-size: 0.85rem;
  color: var(--ink-secondary, #666);
}

.row-changed {
  background-color: rgba(255, 193, 7, 0.1) !important;
}

.input-changed {
  border-color: #ffc107 !important;
  background-color: rgba(255, 193, 7, 0.05);
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.alert-danger {
  background: #f8d7da;
  color: #842029;
  border: 1px solid #f5c2c7;
}

.alert-success {
  background: #d1e7dd;
  color: #0f5132;
  border: 1px solid #badbcc;
}

.loading-text {
  padding: 2rem;
  text-align: center;
  color: var(--ink-secondary, #666);
}

/* Preview modal */
.preview-modal {
  max-width: 600px;
  width: 90%;
}

.preview-body {
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.preview-rename-item {
  padding: 0.75rem;
  border: 1px solid var(--line, #ddd);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.rename-header {
  margin-bottom: 0.5rem;
}

.rename-details {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--ink-secondary, #666);
}

.rename-sub {
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.rename-sub ul {
  margin: 0.25rem 0 0 1.5rem;
  padding: 0;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--line, #ddd);
}

.btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--line, #ccc);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent, #0d6efd);
  color: white;
  border-color: var(--accent, #0d6efd);
}

.btn-secondary {
  background: var(--bg, #fff);
  color: var(--ink, #333);
}

.btn-danger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn-sm {
  padding: 0.15rem 0.4rem;
  font-size: 0.8rem;
}
</style>
