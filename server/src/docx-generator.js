/**
 * DOCX Template Generator Module
 *
 * Uses docxtemplater to generate DOCX files from templates by replacing placeholders
 * with actual data values.
 */

import fs from 'fs';
import path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { generateDeclinedNames, generateDeclinedGradePosition } from './declension.js';
import { buildFieldNameToIdMap, getFieldNameByRole, ROLES } from './field-utils.js';

/**
 * Generate DOCX document from template
 *
 * @param {string} templatePath - Full path to template DOCX file
 * @param {object} data - Key-value pairs for placeholder replacement
 * @param {string} outputPath - Full path where generated DOCX will be saved
 * @param {Array} [schema] - Optional field schema for field_id-based placeholders
 * @returns {Promise<void>}
 * @throws {Error} If template doesn't exist or generation fails
 */
export async function generateDocx(templatePath, data, outputPath, schema) {
  // Validate template exists
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  try {
    // Read template file
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Initialize docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Prepare data with null handling and special placeholders
    const preparedData = await prepareData(data, schema);

    // Render document
    doc.render(preparedData);

    // Generate output buffer
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(outputPath, buf);
  } catch (error) {
    throw new Error(`DOCX generation failed: ${error.message}`);
  }
}

/**
 * Prepare data for template rendering
 * - Convert undefined/null to empty string
 * - Add special placeholders
 * - When schema provided: generate both field_id keys (primary) and field_name keys (legacy)
 *
 * @param {object} data - Raw data object
 * @param {Array} [schema] - Optional field schema for field_id-based placeholders
 * @returns {Promise<object>} Prepared data object
 */
async function prepareData(data, schema) {
  const prepared = {};

  // Build field_name → field_id mapping if schema provided
  const nameToId = schema ? buildFieldNameToIdMap(schema) : null;
  // Resolve photo field name from schema to skip it
  const photoFieldName = schema ? (getFieldNameByRole(schema, ROLES.PHOTO) || 'photo') : 'photo';

  // Handle user-provided data (null safety)
  for (const key in data) {
    if (key === photoFieldName) continue; // Skip photo field (file path, not template data)
    const value = data[key];
    const safeValue = (value === null || value === undefined) ? '' : String(value);

    // Legacy key (field_name): always add for backwards compatibility
    prepared[key] = safeValue;

    // Primary key (field_id): add when schema is available
    if (nameToId) {
      const fieldId = nameToId.get(key);
      if (fieldId) {
        prepared[fieldId] = safeValue;
      }
    }
  }

  // Add special placeholders
  const now = new Date();

  // {current_date} - DD.MM.YYYY format
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  prepared.current_date = `${day}.${month}.${year}`;

  // {current_datetime} - DD.MM.YYYY HH:MM format
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  prepared.current_datetime = `${day}.${month}.${year} ${hours}:${minutes}`;

  // Add declined name placeholders (all grammatical cases)
  // When schema is provided, declension outputs keys based on current field_name (legacy)
  const declinedNames = await generateDeclinedNames(data, schema);
  Object.assign(prepared, declinedNames);

  // Add field_id-based declension keys (primary) when schema is available
  if (nameToId) {
    addFieldIdDeclensionKeys(prepared, declinedNames, nameToId, schema);
  }

  // Add declined grade/position placeholders (all grammatical cases)
  const declinedGradePosition = await generateDeclinedGradePosition(data, schema);
  Object.assign(prepared, declinedGradePosition);

  // Add field_id-based grade/position declension keys
  if (nameToId) {
    addFieldIdDeclensionKeys(prepared, declinedGradePosition, nameToId, schema);
  }

  // Add uppercase and capitalized variants for all text placeholders
  const caseVariants = {};
  for (const [key, value] of Object.entries(prepared)) {
    if (typeof value === 'string') {
      if (value.length > 0) {
        caseVariants[`${key}_upper`] = value.toUpperCase();
        caseVariants[`${key}_cap`] = value.charAt(0).toUpperCase() + value.slice(1);
      } else {
        caseVariants[`${key}_upper`] = '';
        caseVariants[`${key}_cap`] = '';
      }
    }
  }
  Object.assign(prepared, caseVariants);

  return prepared;
}

/**
 * Add field_id-based declension placeholder keys to prepared data.
 * For example, if declension output has `last_name_genitive` and field_id for `last_name` is `f_last_name`,
 * this adds `f_last_name_genitive` with the same value.
 * Also handles `full_name_*` → `f_full_name_*` mapping.
 */
function addFieldIdDeclensionKeys(prepared, declinedOutput, nameToId, schema) {
  for (const [key, value] of Object.entries(declinedOutput)) {
    // Match keys like `{fieldName}_{caseSuffix}` (e.g., last_name_genitive, full_name_dative)
    const suffixMatch = key.match(/^(.+)_(genitive|dative|accusative|vocative|locative|ablative)$/);
    if (suffixMatch) {
      const baseFieldName = suffixMatch[1];
      const caseSuffix = suffixMatch[2];

      // Look up field_id for the base field name
      const fieldId = nameToId.get(baseFieldName);
      if (fieldId) {
        prepared[`${fieldId}_${caseSuffix}`] = value;
      }

      // Handle full_name specially: it's a computed field, not in the schema
      // Map it to f_full_name if not already handled
      if (baseFieldName === 'full_name' && !nameToId.has('full_name')) {
        prepared[`f_full_name_${caseSuffix}`] = value;
      }
    }
  }
}

/**
 * Extract placeholders from DOCX template
 *
 * @param {string} templatePath - Full path to template DOCX file
 * @param {Array} [schema] - Optional field schema for validation (flags unknown placeholders)
 * @returns {Promise<{placeholders: string[], unknown: string[]}>} When schema provided, returns object with placeholders and unknown lists. Without schema, returns plain array for backwards compatibility.
 * @throws {Error} If template doesn't exist or extraction fails
 */
export async function extractPlaceholders(templatePath, schema) {
  // Validate template exists
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  try {
    // Read template file
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Use Docxtemplater's getFullText() to get merged plain text.
    // This handles cases where Word splits {placeholder} across multiple XML runs.
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    const fullText = doc.getFullText();

    // Extract placeholders using regex on merged text
    const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
    const placeholders = new Set();
    let match;

    while ((match = placeholderRegex.exec(fullText)) !== null) {
      placeholders.add(match[1]);
    }

    const sorted = Array.from(placeholders).sort();

    // When schema is provided, validate placeholders against known field_ids and field_names
    if (schema) {
      const nameToId = buildFieldNameToIdMap(schema);
      const knownNames = new Set(schema.map(f => f.field_name));
      const knownIds = new Set(schema.map(f => f.field_id).filter(Boolean));

      // Special placeholders and common suffixes that are always valid
      const specialNames = new Set(['current_date', 'current_datetime', 'full_name', 'f_full_name']);
      const caseSuffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative', 'upper', 'cap'];

      const unknown = sorted.filter(p => {
        // Direct match against field_name or field_id
        if (knownNames.has(p) || knownIds.has(p)) return false;
        // Special placeholders
        if (specialNames.has(p)) return false;
        // Check if it's a known base + case/variant suffix
        for (const suffix of caseSuffixes) {
          if (p.endsWith(`_${suffix}`)) {
            const base = p.slice(0, -(suffix.length + 1));
            if (knownNames.has(base) || knownIds.has(base) || specialNames.has(base)) return false;
            // Check deeper suffixes like full_name_genitive_upper
            for (const innerSuffix of caseSuffixes) {
              if (base.endsWith(`_${innerSuffix}`)) {
                const innerBase = base.slice(0, -(innerSuffix.length + 1));
                if (knownNames.has(innerBase) || knownIds.has(innerBase) || specialNames.has(innerBase)) return false;
              }
            }
          }
        }
        return true;
      });

      return { placeholders: sorted, unknown };
    }

    // Without schema, return plain array for backwards compatibility
    return sorted;
  } catch (error) {
    throw new Error(`Placeholder extraction failed: ${error.message}`);
  }
}
