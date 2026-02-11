# Plan: Document Templates System

## Validation Commands
- `cd server && npm install`
- `cd client && npm install`
- `./run.sh`
- `curl -s http://localhost:3000/api/templates | jq .`
- `ls -la data/templates.csv data/generated_documents.csv`
- `ls -la files/templates/ files/documents/`

### Task 1: Backend CSV Infrastructure
- [x] Create data/templates.csv (8 columns: template_id, template_name, template_type, docx_filename, placeholder_fields, description, created_date, active)
- [x] Create data/generated_documents.csv (7 columns: document_id, template_id, employee_id, docx_filename, generation_date, generated_by, data_snapshot)
- [x] Add loadTemplates() to server/src/store.js with CSV reading
- [x] Add saveTemplates() to server/src/store.js with write lock pattern
- [x] Add loadGeneratedDocuments() to server/src/store.js
- [x] Add saveGeneratedDocuments() to server/src/store.js with write lock
- [x] Test CSV creation with UTF-8 BOM and semicolon delimiter

### Task 2: DOCX Generator Module
- [x] Install npm packages: docxtemplater, pizzip
- [x] Create server/src/docx-generator.js module
- [x] Implement generateDocx(templatePath, data, outputPath) function
- [x] Add null value handling (replace undefined with empty string)
- [x] Add special placeholders: {current_date}, {current_datetime}
- [x] Implement extractPlaceholders(templatePath) function using regex /\{([a-zA-Z0-9_]+)\}/g
- [x] Test generation with sample DOCX template
- [x] Verify generated DOCX opens in Microsoft Word

### Task 3: Templates CRUD API
- [x] Add GET /api/templates route (return active templates)
- [x] Add GET /api/templates/:id route
- [x] Add POST /api/templates route (auto-increment ID)
- [x] Add PUT /api/templates/:id route
- [x] Add DELETE /api/templates/:id route (soft delete: active='no')
- [x] Add audit logging (CREATE_TEMPLATE, UPDATE_TEMPLATE, DELETE_TEMPLATE)
- [x] Test endpoints with curl
- [x] Verify 404 errors for non-existent IDs

### Task 4: Template DOCX Upload API
- [x] Create files/templates/ directory
- [x] Add POST /api/templates/:id/upload route with multer
- [x] Validate .docx extension
- [x] Check file size against max_file_upload_mb from config.csv
- [x] Save as template_{id}_{timestamp}.docx
- [x] Extract placeholders and update template record
- [x] Return JSON with filename and placeholders
- [x] Test upload with valid/invalid files

### Task 5: Document Generation API
- [x] Create files/documents/ directory
- [x] Add POST /api/templates/:id/generate route
- [x] Load template and employee data
- [x] Validate template has docx_filename
- [x] Prepare data with employee fields + special placeholders
- [x] Call generateDocx() and save to files/documents/
- [x] Create record in generated_documents.csv with data_snapshot
- [x] Add audit log (GENERATE_DOCUMENT)
- [x] Return JSON: {document_id, filename, download_url}

### Task 6: Document Download API
- [x] Add GET /api/documents/:id/download route
- [x] Load document from generated_documents.csv
- [x] Validate document and file exist (404 if not)
- [x] Use res.download() to send DOCX file
- [x] Set proper Content-Type and Content-Disposition headers
- [x] Test download with curl

### Task 7: Frontend API Client
- [x] Add getTemplates() to client/src/api.js
- [x] Add getTemplate(id)
- [x] Add createTemplate(payload)
- [x] Add updateTemplate(id, payload)
- [x] Add deleteTemplate(id)
- [x] Add uploadTemplateFile(id, formData)
- [x] Add generateDocument(templateId, employeeId, customData)
- [x] Add downloadDocument(documentId) returning URL

### Task 8: Templates View Navigation
- [x] Add {key: 'templates', label: 'Шаблони'} to tabs in App.vue
- [x] Add route handling in currentView computed
- [x] Add case in switchView function
- [x] Add reactive refs: templates, showTemplateDialog, templateDialogMode, templateForm
- [x] Add Templates view section in template
- [x] Add view-header with title and "+ Новий шаблон" button
- [x] Add empty state message
- [x] Test navigation to /templates

### Task 9: Templates List Table
- [x] Add table with columns: ID, Назва, Тип, Файл DOCX, Плейсхолдери, Створено, Дії
- [x] Add loadTemplates() function calling API
- [x] Display template type badge with colors
- [x] Show file status: "✓ filename" or "⚠ Файл відсутній"
- [x] Display placeholders as code
- [x] Add action buttons: ✎ (edit), 📁 (upload), 🗑 (delete)
- [x] Call loadTemplates() when entering view
- [x] Test table displays data correctly

### Task 10: Create/Edit Template Modal
- [x] Add modal HTML with form fields
- [x] Add template_name (text, required)
- [x] Add template_type select (Заявка, Службова записка, Доповідь/Звіт, Інше)
- [x] Add description textarea
- [x] Show placeholders field (read-only)
- [x] Implement openCreateTemplateDialog()
- [x] Implement editTemplate(template)
- [x] Implement saveTemplate() calling API
- [x] Implement closeTemplateDialog()
- [x] Show success alert
- [x] Test create and edit flows

### Task 11: Upload DOCX Modal
- [x] Add upload modal with file picker (accept=".docx")
- [x] Add help box with template instructions
- [x] Implement uploadTemplateFile(template) to open modal
- [x] Implement onTemplateFileSelected(event)
- [x] Implement uploadTemplateDocx() calling API
- [x] Show alert with extracted placeholders
- [x] Refresh table after upload
- [x] Test upload and error handling

### Task 12: Delete Template
- [x] Implement deleteTemplate(template)
- [x] Add confirmation dialog
- [x] Call api.deleteTemplate(id) if confirmed
- [x] Refresh table after deletion
- [x] Show success alert
- [x] Test deletion

### Task 13: Document Generation in Employee Card
- [ ] Add "Генерування документів" section after Documents in Cards view
- [ ] Add grid layout for template cards
- [ ] Display cards with icon, name, description, button
- [ ] Disable button if no DOCX file (show warning)
- [ ] Disable if employee not saved
- [ ] Implement generateDocumentForEmployee(template)
- [ ] Auto-download using window.open(downloadUrl)
- [ ] Show success alert
- [ ] Test generation from card

### Task 14: CSS Styling
- [ ] Add .templates-table-container, .templates-table styles
- [ ] Add .template-type-badge with colors
- [ ] Add .file-uploaded (green), .file-missing (yellow)
- [ ] Add .placeholders-cell code style
- [ ] Add .actions-cell, .icon-btn with hover
- [ ] Add .empty-state style
- [ ] Add .template-dialog, .help-box modal styles
- [ ] Add .document-generation-grid, .template-card
- [ ] Add .template-card.disabled, .warning-text
- [ ] Test all styles

### Task 15: End-to-End Testing
- [ ] Test template CRUD flow
- [ ] Test placeholder extraction
- [ ] Test document generation
- [ ] Verify DOCX opens in Word
- [ ] Check CSV files have UTF-8 BOM and semicolon
- [ ] Test write locks prevent data corruption
- [ ] Test error handling (invalid file, missing data)
- [ ] Verify audit logs
- [ ] Check data_snapshot in generated_documents.csv
- [ ] Performance test: generation < 5 seconds
