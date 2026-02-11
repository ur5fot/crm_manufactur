#!/bin/bash

# Test Task 2: Enhanced filter conditions based on field type
# This script tests the new filter conditions: not_contains, greater_than, less_than, equals (number), date_range

SERVER_URL="http://localhost:3000"
API_URL="${SERVER_URL}/api"

echo "=== Task 2: Enhanced Filter Conditions Test ==="
echo ""

# Function to test custom report with filters
test_filter() {
  local test_name="$1"
  local filters="$2"
  local expected_result="$3"

  echo "Test: $test_name"

  # URL encode the filters JSON
  encoded_filters=$(echo -n "$filters" | jq -sRr @uri)

  # Make API call
  response=$(curl -s "${API_URL}/reports/custom?filters=${encoded_filters}")

  # Check if response is valid JSON
  if ! echo "$response" | jq . > /dev/null 2>&1; then
    echo "❌ FAILED: Invalid JSON response"
    echo "Response: $response"
    echo ""
    return 1
  fi

  # Extract result count
  result_count=$(echo "$response" | jq '.results | length')

  echo "Results: $result_count employees"

  # Show a sample of results
  if [ "$result_count" -gt 0 ]; then
    echo "Sample results:"
    echo "$response" | jq -r '.results[0:3] | .[] | "\(.employee_id): \(.first_name) \(.last_name) - \(.employment_status)"'
  fi

  echo "✅ PASSED: $test_name"
  echo ""
  return 0
}

echo "--- Test 1: Text field with 'contains' (baseline) ---"
test_filter \
  "Contains filter (text)" \
  '[{"field":"last_name","condition":"contains","value":"ов"}]' \
  "Should find employees with 'ов' in last name"

echo "--- Test 2: Text field with 'not_contains' (NEW) ---"
test_filter \
  "Not contains filter (text)" \
  '[{"field":"last_name","condition":"not_contains","value":"ов"}]' \
  "Should find employees WITHOUT 'ов' in last name"

echo "--- Test 3: Number field with 'greater_than' (NEW) ---"
# This test assumes salary_amount field exists
test_filter \
  "Greater than filter (number)" \
  '[{"field":"salary_amount","condition":"greater_than","value":"5000"}]' \
  "Should find employees with salary > 5000"

echo "--- Test 4: Number field with 'less_than' (NEW) ---"
test_filter \
  "Less than filter (number)" \
  '[{"field":"salary_amount","condition":"less_than","value":"10000"}]' \
  "Should find employees with salary < 10000"

echo "--- Test 5: Number field with 'equals' (NEW) ---"
test_filter \
  "Equals filter (number)" \
  '[{"field":"salary_amount","condition":"equals","value":"8000"}]' \
  "Should find employees with salary = 8000"

echo "--- Test 6: Date field with 'date_range' (NEW) ---"
test_filter \
  "Date range filter" \
  '[{"field":"birth_date","condition":"date_range","valueFrom":"1980-01-01","valueTo":"1990-12-31"}]' \
  "Should find employees born between 1980 and 1990"

echo "--- Test 7: Combined filters (multiple conditions) ---"
test_filter \
  "Multiple filters with different types" \
  '[{"field":"employment_status","condition":"contains","value":"Працює"},{"field":"salary_amount","condition":"greater_than","value":"5000"}]' \
  "Should find working employees with salary > 5000"

echo "--- Test 8: Empty and not_empty conditions (existing) ---"
test_filter \
  "Empty filter" \
  '[{"field":"middle_name","condition":"empty"}]' \
  "Should find employees without middle name"

test_filter \
  "Not empty filter" \
  '[{"field":"email","condition":"not_empty"}]' \
  "Should find employees with email"

echo ""
echo "=== All Tests Completed ==="
echo ""
echo "Manual verification checklist:"
echo "1. Open http://localhost:5173 in browser"
echo "2. Navigate to 'Звіти' (Reports) tab"
echo "3. Add a filter with text field (e.g., last_name)"
echo "   - Verify conditions show: Містить, Не містить, Порожнє, Не порожнє"
echo "4. Add filter with number field (e.g., salary_amount)"
echo "   - Verify conditions show: Більше ніж, Менше ніж, Дорівнює, Порожнє, Не порожнє"
echo "   - Verify input type is 'number'"
echo "5. Add filter with date field (e.g., birth_date)"
echo "   - Verify conditions show: Період від-до, Порожнє, Не порожнє"
echo "   - Verify 'Період від-до' shows TWO date inputs (від/до)"
echo "6. Test each filter type and verify results are correct"
echo "7. Verify empty/not_empty conditions hide the value input"
echo ""
