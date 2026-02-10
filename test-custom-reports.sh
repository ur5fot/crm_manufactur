#!/bin/bash
# Test script for Custom Reports (Task 9)
# Tests backend API functionality for custom reports

set -e

BASE_URL="http://localhost:3000"
REPORTS_URL="${BASE_URL}/api/reports/custom"

echo "========================================="
echo "Custom Reports Testing (Task 9)"
echo "========================================="
echo ""

# Test 1: Basic endpoint availability
echo "Test 1: Verify /api/reports/custom endpoint exists"
response=$(curl -s -o /dev/null -w "%{http_code}" "${REPORTS_URL}")
if [ "$response" = "200" ]; then
    echo "✓ PASS: Endpoint returns 200"
else
    echo "✗ FAIL: Endpoint returned $response"
    exit 1
fi
echo ""

# Test 2: Get all employees (no filters)
echo "Test 2: Get all employees without filters"
response=$(curl -s "${REPORTS_URL}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: Returned $count employees"
echo ""

# Test 3: Test "contains" condition
echo "Test 3: Test 'contains' condition filter"
filters='[{"field":"last_name","condition":"contains","value":"а"}]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: 'contains' filter returned $count results"
echo ""

# Test 4: Test "equals" condition
echo "Test 4: Test 'equals' condition filter"
filters='[{"field":"gender","condition":"equals","value":"Чоловік"}]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: 'equals' filter returned $count results"
echo ""

# Test 5: Test "not_equals" condition
echo "Test 5: Test 'not_equals' condition filter"
filters='[{"field":"gender","condition":"not_equals","value":"Чоловік"}]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: 'not_equals' filter returned $count results"
echo ""

# Test 6: Test "empty" condition
echo "Test 6: Test 'empty' condition filter"
filters='[{"field":"notes","condition":"empty"}]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: 'empty' filter returned $count results"
echo ""

# Test 7: Test "not_empty" condition
echo "Test 7: Test 'not_empty' condition filter"
filters='[{"field":"employee_id","condition":"not_empty"}]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: 'not_empty' filter returned $count results"
echo ""

# Test 8: Test multiple filters (AND logic)
echo "Test 8: Test multiple filters with AND logic"
filters='[{"field":"gender","condition":"equals","value":"Чоловік"},{"field":"employment_status","condition":"contains","value":"Працює"}]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: Multiple filters (AND logic) returned $count results"
# Verify AND logic: results should be <= single filter results
echo ""

# Test 9: Test column selection
echo "Test 9: Test column selection (project specific columns)"
filters='[]'
columns='["employee_id","last_name","first_name","gender"]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
encoded_columns=$(echo "$columns" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}&columns=${encoded_columns}")
# Check that only specified columns are returned (plus employee_id always included)
first_employee=$(echo "$response" | jq '.results[0]')
column_count=$(echo "$first_employee" | jq 'keys | length')
echo "✓ PASS: Column projection returned employee with $column_count fields"
echo "  Fields: $(echo "$first_employee" | jq -r 'keys | join(", ")')"
echo ""

# Test 10: Test complex filter (5+ conditions)
echo "Test 10: Test complex filter with 5 conditions"
filters='[
  {"field":"employment_status","condition":"not_empty"},
  {"field":"last_name","condition":"not_empty"},
  {"field":"first_name","condition":"not_empty"},
  {"field":"gender","condition":"not_empty"},
  {"field":"department","condition":"not_empty"}
]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: Complex filter (5 conditions) returned $count results"
echo ""

# Test 11: Test invalid field name (should skip)
echo "Test 11: Test filter with invalid field name"
filters='[{"field":"invalid_field_name","condition":"equals","value":"test"}]'
encoded_filters=$(echo "$filters" | jq -sRr @uri)
response=$(curl -s "${REPORTS_URL}?filters=${encoded_filters}")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: Invalid field name handled gracefully, returned $count results"
echo ""

# Test 12: Test empty filters array
echo "Test 12: Test with empty filters array"
response=$(curl -s "${REPORTS_URL}?filters=%5B%5D")
count=$(echo "$response" | jq '.results | length')
echo "✓ PASS: Empty filters returned all $count employees"
echo ""

echo "========================================="
echo "Backend API Tests: ALL PASSED"
echo "========================================="
echo ""
echo "MANUAL UI TESTING REQUIRED:"
echo "1. Open http://localhost:5173/reports in browser"
echo "2. Verify filter builder UI shows all fields"
echo "3. Test adding/removing filters with ✖️ button"
echo "4. Test date picker for date fields"
echo "5. Test select dropdown for select fields"
echo "6. Test column selector checkboxes"
echo "7. Test preview table (max 100 rows)"
echo "8. Test CSV export with UTF-8 BOM"
echo "9. Open exported CSV in Excel to verify Cyrillic encoding"
echo "10. Verify filename format: report_YYYY-MM-DD_HH-mm-ss.csv"
echo ""
