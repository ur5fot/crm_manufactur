#!/bin/bash

# Task 4: Employee Cards View Testing
# This script tests all requirements for the employee cards view

BASE_URL="http://localhost:3000"
TEST_RESULTS="/tmp/task4-test-results.txt"
PASS=0
FAIL=0

log_test() {
  echo "[$1] $2" | tee -a "$TEST_RESULTS"
  if [ "$1" = "PASS" ]; then
    ((PASS++))
  else
    ((FAIL++))
  fi
}

echo "=== Task 4: Employee Cards View Testing ===" > "$TEST_RESULTS"
echo "Started: $(date)" >> "$TEST_RESULTS"
echo "" >> "$TEST_RESULTS"

# Test 1: GET /api/employees returns array with employees
echo "Test 1: Verify /api/employees returns employee array"
RESPONSE=$(curl -s "$BASE_URL/api/employees")
if echo "$RESPONSE" | jq -e '.employees | type == "array"' > /dev/null; then
  EMPLOYEE_COUNT=$(echo "$RESPONSE" | jq '.employees | length')
  log_test "PASS" "GET /api/employees returns array with $EMPLOYEE_COUNT employees"
  FIRST_ID=$(echo "$RESPONSE" | jq -r '.employees[0].employee_id')
else
  log_test "FAIL" "GET /api/employees did not return employees array"
  FIRST_ID="1"
fi

# Test 2: GET /api/employees/:id returns specific employee
echo "Test 2: Verify /api/employees/:id returns specific employee"
RESPONSE=$(curl -s "$BASE_URL/api/employees/$FIRST_ID")
if echo "$RESPONSE" | jq -e '.employee.employee_id' > /dev/null; then
  RETURNED_ID=$(echo "$RESPONSE" | jq -r '.employee.employee_id')
  if [ "$RETURNED_ID" = "$FIRST_ID" ]; then
    log_test "PASS" "GET /api/employees/$FIRST_ID returns correct employee"
  else
    log_test "FAIL" "GET /api/employees/$FIRST_ID returned ID $RETURNED_ID"
  fi
else
  log_test "FAIL" "GET /api/employees/$FIRST_ID did not return employee object"
fi

# Test 3: GET /api/fields-schema returns proper structure
echo "Test 3: Verify schema API returns groups, tableFields, allFields"
RESPONSE=$(curl -s "$BASE_URL/api/fields-schema")
if echo "$RESPONSE" | jq -e '.groups' > /dev/null && \
   echo "$RESPONSE" | jq -e '.tableFields' > /dev/null && \
   echo "$RESPONSE" | jq -e '.allFields' > /dev/null; then
  GROUP_COUNT=$(echo "$RESPONSE" | jq '.groups | length')
  log_test "PASS" "Schema API returns proper structure with $GROUP_COUNT groups"
else
  log_test "FAIL" "Schema API missing required fields (groups/tableFields/allFields)"
fi

# Test 4: Verify field types from schema
echo "Test 4: Verify schema field types"
FIELD_TYPES=$(curl -s "$BASE_URL/api/fields-schema" | jq -r '.allFields[] | "\(.key):\(.type)"' | head -10)
if echo "$FIELD_TYPES" | grep -q "text\|select\|textarea\|date\|file"; then
  log_test "PASS" "Schema contains various field types (text, select, date, file, etc.)"
else
  log_test "FAIL" "Schema missing expected field types"
fi

# Test 5: Create new employee (sequential numeric ID)
echo "Test 5: Create new employee with auto-generated ID"
NEW_EMPLOYEE='{
  "last_name": "Task4Test",
  "first_name": "Cards",
  "middle_name": "View",
  "employment_status": "Працює",
  "notes": "Created by Task 4 testing"
}'
RESPONSE=$(curl -s -X POST "$BASE_URL/api/employees" \
  -H "Content-Type: application/json" \
  -d "$NEW_EMPLOYEE")
if echo "$RESPONSE" | jq -e '.employee_id' > /dev/null; then
  NEW_ID=$(echo "$RESPONSE" | jq -r '.employee_id')
  # Verify ID is numeric
  if [[ "$NEW_ID" =~ ^[0-9]+$ ]]; then
    log_test "PASS" "Created employee with sequential numeric ID: $NEW_ID"
  else
    log_test "FAIL" "Created employee but ID is not numeric: $NEW_ID"
  fi
else
  log_test "FAIL" "Failed to create employee: $RESPONSE"
  NEW_ID=""
fi

# Test 6: Update employee (verify changes persist)
if [ -n "$NEW_ID" ]; then
  echo "Test 6: Update employee and verify changes persist"
  UPDATE_DATA="{
    \"employee_id\": \"$NEW_ID\",
    \"last_name\": \"Task4Test\",
    \"first_name\": \"CardsUpdated\",
    \"middle_name\": \"View\",
    \"employment_status\": \"Працює\",
    \"notes\": \"Updated by Task 4 testing\"
  }"
  RESPONSE=$(curl -s -X PUT "$BASE_URL/api/employees/$NEW_ID" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_DATA")
  if echo "$RESPONSE" | jq -e '.employee.first_name' > /dev/null; then
    UPDATED_NAME=$(echo "$RESPONSE" | jq -r '.employee.first_name')
    if [ "$UPDATED_NAME" = "CardsUpdated" ]; then
      log_test "PASS" "Updated employee and changes persisted"
    else
      log_test "FAIL" "Updated employee but first_name is: $UPDATED_NAME"
    fi
  else
    log_test "FAIL" "Failed to update employee $NEW_ID"
  fi
fi

# Test 7: Verify update logged to logs.csv
if [ -n "$NEW_ID" ]; then
  echo "Test 7: Verify update logged to audit log"
  RESPONSE=$(curl -s "$BASE_URL/api/logs")
  if echo "$RESPONSE" | jq -e '.logs' > /dev/null; then
    RECENT_LOG=$(echo "$RESPONSE" | jq -r '.logs[0] | "\(.action) \(.employee_id) \(.field_name)"')
    if echo "$RECENT_LOG" | grep -q "UPDATE $NEW_ID"; then
      log_test "PASS" "Employee update logged to audit trail"
    else
      log_test "FAIL" "Update not found in audit log (most recent: $RECENT_LOG)"
    fi
  else
    log_test "FAIL" "Could not retrieve audit logs"
  fi
fi

# Test 8: Verify dropdown options from schema (no hardcoded values)
echo "Test 8: Verify dropdown options come from schema"
RESPONSE=$(curl -s "$BASE_URL/api/fields-schema")
EMPLOYMENT_OPTIONS=$(echo "$RESPONSE" | jq -r '.allFields[] | select(.key == "employment_status") | .options | join("|")')
if [ -n "$EMPLOYMENT_OPTIONS" ] && [ "$EMPLOYMENT_OPTIONS" != "null" ] && [ "$EMPLOYMENT_OPTIONS" != "" ]; then
  log_test "PASS" "Employment status options loaded from schema: $EMPLOYMENT_OPTIONS"
else
  log_test "FAIL" "Employment status options not found in schema"
fi

# Test 9: Verify positional convention for employment_status (options[0] = working)
echo "Test 9: Verify positional convention for employment_status"
FIRST_OPTION=$(echo "$EMPLOYMENT_OPTIONS" | cut -d'|' -f1)
if echo "$FIRST_OPTION" | grep -q "Працює\|Работает\|Active"; then
  log_test "PASS" "employment_status options[0] is working status: $FIRST_OPTION"
else
  log_test "FAIL" "employment_status options[0] unexpected: $FIRST_OPTION"
fi

# Test 10: Verify file fields in schema have type=file
echo "Test 10: Verify file fields in schema"
FILE_FIELDS=$(echo "$RESPONSE" | jq -r '.allFields[] | select(.type == "file") | .key' | wc -l | tr -d ' ')
if [ "$FILE_FIELDS" -gt 0 ]; then
  log_test "PASS" "Schema contains $FILE_FIELDS file fields"
else
  log_test "FAIL" "No file fields found in schema"
fi

# Test 11: Delete employee (verify removal)
if [ -n "$NEW_ID" ]; then
  echo "Test 11: Delete employee and verify removal"
  RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/employees/$NEW_ID")
  # Check if response indicates success (either explicit success or no error other than "not found")
  if echo "$RESPONSE" | jq -e '.success' > /dev/null || echo "$RESPONSE" | jq -e '.message' > /dev/null; then
    # Verify employee no longer exists
    CHECK=$(curl -s "$BASE_URL/api/employees/$NEW_ID")
    if echo "$CHECK" | jq -e '.error' > /dev/null; then
      log_test "PASS" "Employee deleted successfully and no longer exists"
    else
      log_test "FAIL" "Employee deleted but still retrievable"
    fi
  else
    # If response has error, that's also OK if employee was deleted
    CHECK=$(curl -s "$BASE_URL/api/employees/$NEW_ID")
    if echo "$CHECK" | jq -e '.error' > /dev/null; then
      log_test "PASS" "Employee no longer exists (already deleted)"
    else
      log_test "FAIL" "Failed to delete employee $NEW_ID: $RESPONSE"
    fi
  fi
fi

# Test 12: Verify delete logged to logs.csv
if [ -n "$NEW_ID" ]; then
  echo "Test 12: Verify deletion logged to audit log"
  RESPONSE=$(curl -s "$BASE_URL/api/logs")
  RECENT_DELETE=$(echo "$RESPONSE" | jq -r '.logs[0] | "\(.action) \(.employee_id)"')
  if echo "$RECENT_DELETE" | grep -q "DELETE $NEW_ID"; then
    log_test "PASS" "Employee deletion logged to audit trail"
  else
    log_test "FAIL" "Deletion not found in audit log"
  fi
fi

# Test 13: Verify field groups exist
echo "Test 13: Verify field groups for form sections"
GROUPS=$(curl -s "$BASE_URL/api/fields-schema" | jq -r '.groups | keys[]' | wc -l | tr -d ' ')
if [ "$GROUPS" -gt 0 ]; then
  log_test "PASS" "Schema defines $GROUPS field groups for form sections"
else
  log_test "FAIL" "No field groups found in schema"
fi

# Test 14: Verify table columns configuration
echo "Test 14: Verify table columns configuration"
TABLE_FIELDS=$(curl -s "$BASE_URL/api/fields-schema" | jq -r '.tableFields | length')
if [ "$TABLE_FIELDS" -gt 0 ]; then
  log_test "PASS" "Schema defines $TABLE_FIELDS table columns (show_in_table=yes)"
else
  log_test "FAIL" "No table columns configured in schema"
fi

# Test 15: Verify editable fields configuration
echo "Test 15: Verify editable fields configuration"
EDITABLE=$(curl -s "$BASE_URL/api/fields-schema" | jq -r '.allFields[] | select(.editableInTable == true) | .key' | wc -l | tr -d ' ')
if [ "$EDITABLE" -gt 0 ]; then
  log_test "PASS" "Schema defines $EDITABLE editable fields (editableInTable=true)"
else
  log_test "FAIL" "No editable fields configured in schema"
fi

# Summary
echo "" >> "$TEST_RESULTS"
echo "=== Test Summary ===" >> "$TEST_RESULTS"
echo "PASSED: $PASS" >> "$TEST_RESULTS"
echo "FAILED: $FAIL" >> "$TEST_RESULTS"
echo "Completed: $(date)" >> "$TEST_RESULTS"

cat "$TEST_RESULTS"

if [ "$FAIL" -eq 0 ]; then
  exit 0
else
  exit 1
fi
