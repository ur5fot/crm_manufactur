/**
 * Ukrainian name declension module
 *
 * Uses shevchenko library to decline Ukrainian names (last_name, first_name,
 * middle_name, full_name) across all 7 grammatical cases.
 *
 * Generates placeholders with suffixes: _genitive, _dative, _accusative,
 * _vocative, _locative, _ablative
 */

import {
  inGenitive,
  inDative,
  inAccusative,
  inVocative,
  inLocative,
  inAblative,
  detectGender,
} from 'shevchenko';

const CASES = [
  { suffix: 'genitive', fn: inGenitive },
  { suffix: 'dative', fn: inDative },
  { suffix: 'accusative', fn: inAccusative },
  { suffix: 'vocative', fn: inVocative },
  { suffix: 'locative', fn: inLocative },
  { suffix: 'ablative', fn: inAblative },
];

/**
 * Map Ukrainian gender value to shevchenko gender string
 */
function mapGender(genderValue) {
  if (!genderValue) return null;
  const normalized = genderValue.trim().toLowerCase();
  if (normalized === 'чоловіча') return 'masculine';
  if (normalized === 'жіноча') return 'feminine';
  return null;
}

/**
 * Generate declined name placeholders for all grammatical cases.
 *
 * @param {object} data - Employee data with last_name, first_name, middle_name, gender fields
 * @returns {Promise<object>} Object with 24 declined name placeholders
 *   (6 cases x 4 name fields: last_name, first_name, middle_name, full_name)
 */
export async function generateDeclinedNames(data) {
  const result = {};
  const lastName = data.last_name || '';
  const firstName = data.first_name || '';
  const middleName = data.middle_name || '';
  const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ');

  // Per-field indeclinable flags
  const skipLastName = data.indeclinable_name === 'yes';
  const skipFirstName = data.indeclinable_first_name === 'yes';

  // If all name parts are indeclinable, return nominative for all cases
  if (skipLastName && skipFirstName) {
    for (const { suffix } of CASES) {
      result[`last_name_${suffix}`] = lastName;
      result[`first_name_${suffix}`] = firstName;
      result[`middle_name_${suffix}`] = middleName;
      result[`full_name_${suffix}`] = fullName;
    }
    return result;
  }

  // If no name parts provided, return empty placeholders
  if (!lastName && !firstName && !middleName) {
    for (const { suffix } of CASES) {
      result[`last_name_${suffix}`] = '';
      result[`first_name_${suffix}`] = '';
      result[`middle_name_${suffix}`] = '';
      result[`full_name_${suffix}`] = '';
    }
    return result;
  }

  // Determine gender
  let gender = mapGender(data.gender);

  if (!gender) {
    try {
      const nameInput = {};
      if (firstName) nameInput.givenName = firstName;
      if (middleName) nameInput.patronymicName = middleName;
      if (lastName) nameInput.familyName = lastName;
      gender = await detectGender(nameInput);
    } catch {
      // If detection fails, default to masculine
      gender = 'masculine';
    }
  }

  // Build shevchenko input only with declinable parts
  const shevchenkoInput = { gender };
  if (firstName && !skipFirstName) shevchenkoInput.givenName = firstName;
  if (middleName) shevchenkoInput.patronymicName = middleName;
  if (lastName && !skipLastName) shevchenkoInput.familyName = lastName;

  // Decline for each case
  for (const { suffix, fn } of CASES) {
    try {
      const declined = await fn(shevchenkoInput);
      result[`last_name_${suffix}`] = skipLastName ? lastName : (declined.familyName || lastName);
      result[`first_name_${suffix}`] = skipFirstName ? firstName : (declined.givenName || firstName);
      result[`middle_name_${suffix}`] = declined.patronymicName || middleName;

      // Build full_name in same order as nominative: last first middle
      const parts = [
        result[`last_name_${suffix}`],
        result[`first_name_${suffix}`],
        result[`middle_name_${suffix}`],
      ].filter(Boolean);
      result[`full_name_${suffix}`] = parts.join(' ');
    } catch {
      // On error, fall back to nominative form
      result[`last_name_${suffix}`] = lastName;
      result[`first_name_${suffix}`] = firstName;
      result[`middle_name_${suffix}`] = middleName;
      result[`full_name_${suffix}`] = [lastName, firstName, middleName].filter(Boolean).join(' ');
    }
  }

  return result;
}
