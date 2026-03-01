<template>
  <div class="layout-table">
    <div class="panel table-panel">
      <div class="view-header">
        <div class="panel-title">Шаблони документів</div>
        <div class="button-group">
          <button class="primary" type="button" @click="openCreateTemplateDialog">
            ➕ Новий шаблон
          </button>
          <button class="secondary" type="button" @click="router.push({ name: 'placeholder-reference' })">
            Довідник плейсхолдерів
          </button>
        </div>
      </div>

      <div v-if="templates.length === 0 && !loading" class="empty-state">
        <p>Немає шаблонів. Створіть перший шаблон для генерації документів.</p>
      </div>

      <div v-else class="templates-table-container">
        <table class="templates-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Назва</th>
              <th>Тип</th>
              <th>Файл DOCX</th>
              <th>Плейсхолдери</th>
              <th>Створено</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in templates" :key="template.template_id">
              <td style="text-align: center;">{{ template.template_id }}</td>
              <td>
                {{ template.template_name }}
                <span v-if="template.is_general === 'yes'" class="general-badge">Загальний</span>
              </td>
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
              <td class="placeholders-cell">
                <code v-if="template.placeholder_fields">{{ template.placeholder_fields }}</code>
                <span v-else>—</span>
              </td>
              <td>{{ template.created_date || '—' }}</td>
              <td class="actions-cell">
                <button class="icon-btn" title="Редагувати" @click="editTemplate(template)">
                  ✎
                </button>
                <button class="icon-btn" title="Открыть DOCX" @click="openTemplateDocx(template)" :disabled="!template.docx_filename">
                  📄
                </button>
                <button class="icon-btn" title="Завантажити DOCX" @click="uploadTemplateFile(template)">
                  📁
                </button>
                <button class="icon-btn" title="Видалити" @click="deleteTemplate(template)">
                  🗑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Template Create/Edit Dialog -->
    <div v-if="showTemplateDialog" class="vacation-notification-overlay" @click="closeTemplateDialog">
      <div class="vacation-notification-modal" @click.stop style="max-width: 600px;">
        <div class="vacation-notification-header">
          <h3>{{ templateDialogMode === 'create' ? 'Новий шаблон' : 'Редагувати шаблон' }}</h3>
          <button class="close-btn" @click="closeTemplateDialog">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <div class="form-group">
            <label for="template-name">Назва шаблону <span style="color: red;">*</span></label>
            <input
              id="template-name"
              v-model="templateForm.template_name"
              type="text"
              required
              placeholder="Наприклад: Заявка на відпустку"
            />
          </div>

          <div class="form-group">
            <label for="template-type">Тип документа <span style="color: red;">*</span></label>
            <select id="template-type" v-model="templateForm.template_type" required>
              <option value="">Оберіть тип</option>
              <option value="Заявка">Заявка</option>
              <option value="Службова записка">Службова записка</option>
              <option value="Доповідь/Звіт">Доповідь/Звіт</option>
              <option value="Інше">Інше</option>
            </select>
          </div>

          <div class="form-group">
            <label for="template-description">Опис</label>
            <textarea
              id="template-description"
              v-model="templateForm.description"
              rows="3"
              placeholder="Опис шаблону та його призначення"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="templateForm.is_general"
                true-value="yes"
                false-value="no"
              />
              Загальний шаблон (не прив'язаний до співробітника)
            </label>
          </div>

          <div v-if="templateForm.placeholder_fields || templateForm.docx_filename" class="form-group">
            <label>Плейсхолдери (автоматично з DOCX)</label>
            <input
              v-model="templateForm.placeholder_fields"
              type="text"
              readonly
              class="readonly-input"
            />
            <button
              v-if="templateDialogMode === 'edit' && templateForm.docx_filename"
              class="secondary small"
              type="button"
              style="margin-top: 6px;"
              @click="reextractTemplatePlaceholders"
            >
              Оновити плейсхолдери
            </button>
          </div>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="closeTemplateDialog">Скасувати</button>
          <button
            class="primary"
            type="button"
            @click="saveTemplate"
            :disabled="!templateForm.template_name || !templateForm.template_type"
          >
            {{ templateDialogMode === 'create' ? 'Створити' : 'Зберегти' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Template Upload DOCX Dialog -->
    <div v-if="showUploadTemplateModal" class="vacation-notification-overlay" @click="closeUploadTemplateModal">
      <div class="vacation-notification-modal" @click.stop style="max-width: 550px;">
        <div class="vacation-notification-header">
          <h3>Завантаження DOCX шаблону</h3>
          <button class="close-btn" @click="closeUploadTemplateModal">&times;</button>
        </div>
        <div class="vacation-notification-body">
          <p style="margin-bottom: 15px;">
            <strong>{{ uploadTemplateName }}</strong>
          </p>

          <div class="help-box">
            <h4 style="margin-top: 0; margin-bottom: 10px;">📋 Інструкція зі створення шаблону</h4>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Створіть DOCX файл у Microsoft Word або LibreOffice</li>
              <li>Використовуйте плейсхолдери у форматі <code>{{'{'}}field_name{{'}'}}</code></li>
              <li>Доступні поля співробітника: <code>{{'{'}}last_name{{'}'}}</code>, <code>{{'{'}}first_name{{'}'}}</code>, <code>{{'{'}}position{{'}'}}</code>, та ін.</li>
              <li>Спеціальні плейсхолдери: <code>{{'{'}}current_date{{'}'}}</code>, <code>{{'{'}}current_datetime{{'}'}}</code></li>
              <li>
                Відмінювання ПІБ — додайте суфікс падежу до <code>last_name</code>, <code>first_name</code>, <code>middle_name</code>, <code>full_name</code>:
                <br/>
                <code style="font-size: 0.85em;">_genitive</code> (родовий: Іванова),
                <code style="font-size: 0.85em;">_dative</code> (давальний: Іванову),
                <code style="font-size: 0.85em;">_accusative</code> (знахідний),
                <code style="font-size: 0.85em;">_vocative</code> (кличний),
                <code style="font-size: 0.85em;">_locative</code> (місцевий),
                <code style="font-size: 0.85em;">_ablative</code> (орудний)
              </li>
              <li>Приклад: "Надати <code>{{'{'}}full_name_dative{{'}'}}</code> відпустку" → "Надати Іванову Петру Миколайовичу відпустку"</li>
            </ul>
          </div>

          <div class="form-group">
            <label for="template-file-input">Оберіть DOCX файл <span style="color: red;">*</span></label>
            <input
              id="template-file-input"
              type="file"
              accept=".docx"
              @change="onTemplateFileSelected"
            />
            <p v-if="selectedTemplateFile" style="margin-top: 10px; color: #28a745;">
              ✓ Обрано: {{ selectedTemplateFile.name }}
            </p>
          </div>
        </div>
        <div class="vacation-notification-footer status-change-footer">
          <button class="secondary" type="button" @click="closeUploadTemplateModal">Скасувати</button>
          <button
            class="primary"
            type="button"
            @click="uploadTemplateDocx(loadTemplates)"
            :disabled="!selectedTemplateFile"
          >
            Завантажити
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTemplatesManagement } from "../composables/useTemplatesManagement";
import { useTemplateUpload } from "../composables/useTemplateUpload";

const router = useRouter();

const {
  templates,
  loading,
  showTemplateDialog,
  templateDialogMode,
  templateForm,
  loadTemplates,
  openCreateTemplateDialog,
  editTemplate,
  saveTemplate,
  closeTemplateDialog,
  deleteTemplate,
  openTemplateDocx,
  reextractTemplatePlaceholders,
} = useTemplatesManagement();

const {
  showUploadTemplateModal,
  uploadTemplateName,
  selectedTemplateFile,
  uploadTemplateFile,
  closeUploadTemplateModal,
  onTemplateFileSelected,
  uploadTemplateDocx,
} = useTemplateUpload();

// Initialize on mount
onMounted(() => {
  loadTemplates();
});
</script>
