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

/**
 * Generate DOCX document from template
 *
 * @param {string} templatePath - Full path to template DOCX file
 * @param {object} data - Key-value pairs for placeholder replacement
 * @param {string} outputPath - Full path where generated DOCX will be saved
 * @returns {Promise<void>}
 * @throws {Error} If template doesn't exist or generation fails
 */
export async function generateDocx(templatePath, data, outputPath) {
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
    const preparedData = await prepareData(data);

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
 *
 * @param {object} data - Raw data object
 * @returns {Promise<object>} Prepared data object
 */
async function prepareData(data) {
  const prepared = {};

  // Handle user-provided data (null safety)
  for (const key in data) {
    const value = data[key];
    prepared[key] = (value === null || value === undefined) ? '' : String(value);
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
  const declinedNames = await generateDeclinedNames(data);
  Object.assign(prepared, declinedNames);

  // Add declined grade/position placeholders (all grammatical cases)
  const declinedGradePosition = await generateDeclinedGradePosition(data);
  Object.assign(prepared, declinedGradePosition);

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
 * Extract placeholders from DOCX template
 *
 * @param {string} templatePath - Full path to template DOCX file
 * @returns {Promise<string[]>} Array of unique placeholder names (without braces)
 * @throws {Error} If template doesn't exist or extraction fails
 */
export async function extractPlaceholders(templatePath) {
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

    // Return sorted array
    return Array.from(placeholders).sort();
  } catch (error) {
    throw new Error(`Placeholder extraction failed: ${error.message}`);
  }
}
