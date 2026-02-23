/**
 * Ukrainian name declension module
 *
 * Uses shevchenko library to decline Ukrainian names (last_name, first_name,
 * middle_name, full_name) across all 7 grammatical cases.
 *
 * Generates placeholders with suffixes: _genitive, _dative, _accusative,
 * _vocative, _locative, _ablative
 */

import shevchenko from 'shevchenko';
import { militaryExtension } from 'shevchenko-ext-military';
import { ROLES, getFieldNameByRole } from './field-utils.js';

const {
  inGenitive,
  inDative,
  inAccusative,
  inVocative,
  inLocative,
  inAblative,
  detectGender,
  registerExtension,
} = shevchenko;

// Register military extension for grade/position declension
registerExtension(militaryExtension);

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
 * @param {object} data - Employee data object
 * @param {Array} [schema] - Optional field schema for role-based field resolution
 * @returns {Promise<object>} Object with 24 declined name placeholders
 *   (6 cases x 4 name fields: last_name, first_name, middle_name, full_name)
 */
export async function generateDeclinedNames(data, schema) {
  const result = {};

  // Resolve field names from schema roles (with hardcoded fallbacks)
  const lastNameField = (schema && getFieldNameByRole(schema, ROLES.LAST_NAME)) || 'last_name';
  const firstNameField = (schema && getFieldNameByRole(schema, ROLES.FIRST_NAME)) || 'first_name';
  const middleNameField = (schema && getFieldNameByRole(schema, ROLES.MIDDLE_NAME)) || 'middle_name';
  const genderField = (schema && getFieldNameByRole(schema, ROLES.GENDER)) || 'gender';
  const indeclNameField = (schema && getFieldNameByRole(schema, ROLES.INDECL_NAME)) || 'indeclinable_name';
  const indeclFirstField = (schema && getFieldNameByRole(schema, ROLES.INDECL_FIRST)) || 'indeclinable_first_name';

  const lastName = data[lastNameField] || '';
  const firstName = data[firstNameField] || '';
  const middleName = data[middleNameField] || '';
  const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ');

  // Per-field indeclinable flags
  const skipLastName = data[indeclNameField] === 'yes';
  const skipFirstName = data[indeclFirstField] === 'yes';

  // If both last and first names are indeclinable AND no middle name exists, return early
  // (middle_name is always declined, so if it exists we can't take the early return)
  if (skipLastName && skipFirstName && !middleName) {
    for (const { suffix } of CASES) {
      result[`${lastNameField}_${suffix}`] = lastName;
      result[`${firstNameField}_${suffix}`] = firstName;
      result[`${middleNameField}_${suffix}`] = '';
      result[`full_name_${suffix}`] = fullName;
    }
    return result;
  }

  // If no name parts provided, return empty placeholders
  if (!lastName && !firstName && !middleName) {
    for (const { suffix } of CASES) {
      result[`${lastNameField}_${suffix}`] = '';
      result[`${firstNameField}_${suffix}`] = '';
      result[`${middleNameField}_${suffix}`] = '';
      result[`full_name_${suffix}`] = '';
    }
    return result;
  }

  // Determine gender
  let gender = mapGender(data[genderField]);

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
      result[`${lastNameField}_${suffix}`] = skipLastName ? lastName : (declined.familyName || lastName);
      result[`${firstNameField}_${suffix}`] = skipFirstName ? firstName : (declined.givenName || firstName);
      result[`${middleNameField}_${suffix}`] = declined.patronymicName || middleName;

      // Build full_name in same order as nominative: last first middle
      const parts = [
        result[`${lastNameField}_${suffix}`],
        result[`${firstNameField}_${suffix}`],
        result[`${middleNameField}_${suffix}`],
      ].filter(Boolean);
      result[`full_name_${suffix}`] = parts.join(' ');
    } catch {
      // On error, fall back to nominative form
      result[`${lastNameField}_${suffix}`] = lastName;
      result[`${firstNameField}_${suffix}`] = firstName;
      result[`${middleNameField}_${suffix}`] = middleName;
      result[`full_name_${suffix}`] = [lastName, firstName, middleName].filter(Boolean).join(' ');
    }
  }

  return result;
}

/**
 * Generate declined grade (Посада) and position (Звання) placeholders.
 *
 * Uses shevchenko-ext-military extension:
 *   grade -> militaryAppointment
 *   position -> militaryRank
 *
 * @param {object} data - Employee data object
 * @param {Array} [schema] - Optional field schema for role-based field resolution
 * @returns {Promise<object>} Object with 12 declined placeholders
 *   (6 cases x 2 fields: grade, position)
 */
export async function generateDeclinedGradePosition(data, schema) {
  const result = {};

  // Resolve field names from schema roles (with hardcoded fallbacks)
  const gradeField = (schema && getFieldNameByRole(schema, ROLES.GRADE)) || 'grade';
  const positionField = (schema && getFieldNameByRole(schema, ROLES.POSITION)) || 'position';
  const genderField = (schema && getFieldNameByRole(schema, ROLES.GENDER)) || 'gender';
  const indeclGradeField = (schema && getFieldNameByRole(schema, ROLES.INDECL_GRADE)) || 'indeclinable_grade';
  const indeclPositionField = (schema && getFieldNameByRole(schema, ROLES.INDECL_POSITION)) || 'indeclinable_position';

  const grade = data[gradeField] || '';
  const position = data[positionField] || '';

  const skipGrade = data[indeclGradeField] === 'yes';
  const skipPosition = data[indeclPositionField] === 'yes';

  // If both are empty, return empty placeholders
  if (!grade && !position) {
    for (const { suffix } of CASES) {
      result[`${gradeField}_${suffix}`] = '';
      result[`${positionField}_${suffix}`] = '';
    }
    return result;
  }

  // If all non-empty fields are indeclinable, return nominative for all cases
  if ((!grade || skipGrade) && (!position || skipPosition)) {
    for (const { suffix } of CASES) {
      result[`${gradeField}_${suffix}`] = grade;
      result[`${positionField}_${suffix}`] = position;
    }
    return result;
  }

  // Determine gender for declension
  let gender = mapGender(data[genderField]);
  if (!gender) gender = 'masculine';

  // Build input with only declinable fields
  const input = { gender };
  if (grade && !skipGrade) input.militaryAppointment = grade;
  if (position && !skipPosition) input.militaryRank = position;

  for (const { suffix, fn } of CASES) {
    try {
      const declined = await fn(input);
      result[`${gradeField}_${suffix}`] = skipGrade ? grade : (declined.militaryAppointment || grade);
      result[`${positionField}_${suffix}`] = skipPosition ? position : (declined.militaryRank || position);
    } catch {
      result[`${gradeField}_${suffix}`] = grade;
      result[`${positionField}_${suffix}`] = position;
    }
  }

  return result;
}
