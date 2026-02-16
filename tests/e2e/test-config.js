/**
 * Shared test configuration for E2E tests
 * Provides base URLs for API and frontend
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

module.exports = {
  API_URL,
  BASE_URL
};
