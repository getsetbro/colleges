// @ts-check
// College Scorecard schools-endpoint access: field selection and pagination.
import { INSTITUTION_FIELDS, PROGRAM_FIELDS } from './scorecard-fields.js';

const API_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools.json';

// Institution fields plus nested field-of-study data. all_programs_nested=true
// returns latest.programs.cip_4_digit as a proper array per school.
const FIELDS = [...INSTITUTION_FIELDS, ...PROGRAM_FIELDS].join(',');

/**
 * @typedef {{ zip: string, radius: number, minStudents: number, maxStudents: number }} SearchCriteria
 */

/**
 * Fetch a single page of results.
 * @param {SearchCriteria} criteria
 * @param {number} page
 * @param {string} apiKey
 * @returns {Promise<{ metadata: { total: number, per_page: number }, results: Array<Record<string, *>> }>}
 */
async function fetchPage(criteria, page, apiKey) {
  const parameters = new URLSearchParams({
    api_key: apiKey,
    zip: criteria.zip,
    distance: `${criteria.radius}mi`,
    'latest.student.size__range': `${criteria.minStudents}..${criteria.maxStudents - 1}`,
    'school.operating': '1',
    all_programs_nested: 'true',
    fields: FIELDS,
    per_page: '100',
    page: String(page)
  });
  const response = await fetch(`${API_URL}?${parameters}`);
  if (!response.ok) {
    throw new Error(
      response.status === 403 ? 'The API key was rejected.' : `College Scorecard returned HTTP ${response.status}.`
    );
  }
  return response.json();
}

/**
 * Fetch every page of results for the given criteria.
 * @param {SearchCriteria} criteria
 * @param {string} apiKey
 * @returns {Promise<Array<Record<string, *>>>}
 */
export async function search(criteria, apiKey) {
  const firstPage = await fetchPage(criteria, 0, apiKey);
  const pageCount = Math.ceil(firstPage.metadata.total / firstPage.metadata.per_page);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchPage(criteria, index + 1, apiKey))
  );
  return [firstPage, ...remaining].flatMap((page) => page.results);
}
