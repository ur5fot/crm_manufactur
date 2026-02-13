# Test: Delete Template Functionality

## Manual Test Steps

### Prerequisites
- Server running on http://localhost:3000
- At least one active template exists

### Test Case 1: Successful Deletion
1. Navigate to Templates view
2. Click delete button (🗑) on any template
3. Verify confirmation dialog appears with template name
4. Click OK/Confirm
5. Verify success alert appears: "Шаблон успішно видалено"
6. Verify template is removed from the list
7. Verify template still exists in templates.csv with active='no'

### Test Case 2: Cancel Deletion
1. Click delete button on any template
2. Click Cancel in confirmation dialog
3. Verify template remains in the list
4. Verify no changes to templates.csv

### Test Case 3: API Error Handling
1. Stop the server
2. Click delete button on any template
3. Click OK/Confirm
4. Verify error alert appears with error message

## Automated API Tests

### Test 1: Delete Existing Template
```bash
# Create a test template
TEMPLATE_ID=$(curl -s -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{"template_name":"Delete Test","template_type":"Заявка","description":"For testing"}' \
  | jq -r '.template_id')

echo "Created template ID: $TEMPLATE_ID"

# Delete it
curl -s -X DELETE http://localhost:3000/api/templates/$TEMPLATE_ID -w "\nHTTP_CODE: %{http_code}\n"

# Verify it's not in active list
curl -s http://localhost:3000/api/templates | jq ".templates[] | select(.template_id == \"$TEMPLATE_ID\")"

# Verify it's in CSV with active='no'
grep "^$TEMPLATE_ID;" data/templates.csv
```

### Test 2: Delete Non-Existent Template
```bash
curl -s -X DELETE http://localhost:3000/api/templates/999999 -w "\nHTTP_CODE: %{http_code}\n"
# Expected: 404 with error message
```

## Test Results

### API Tests (2026-02-11)
- ✓ Template 11 successfully deleted via API
- ✓ Returns HTTP 204 No Content on success
- ✓ Template removed from active list
- ✓ Template marked as active='no' in CSV
- ✓ Returns HTTP 404 for non-existent template
- ✓ Error message: "Шаблон не найден"

### Frontend Tests
- Pending manual verification

### Automated Test Results (2026-02-11)
```
Created template ID: 12
---
Deleting template...

HTTP_CODE: 204
---
Checking if template is in active list:
✓ Template not in active list
---
Checking CSV file:
12;Delete Test Auto;Заявка;;;For automated testing;2026-02-11;no
```

### Audit Log Verification
- ✓ DELETE_TEMPLATE entries found in logs.csv
- ✓ Most recent: template 12 "Delete Test Auto"
- ✓ Log format: log_id;timestamp;DELETE_TEMPLATE;template_id;template_name;...;Видалено шаблон: {name}

## Conclusion
All automated tests pass. The delete template functionality is working correctly:
- Soft delete (active='no' in CSV)
- Proper HTTP responses (204 on success, 404 on not found)
- Audit logging
- Template removed from active list
- Error handling for non-existent templates
