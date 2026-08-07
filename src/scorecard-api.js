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
 * Query parameters shared by every schools-endpoint request.
 * @param {string} apiKey
 * @param {number} page
 * @returns {Record<string, string>}
 */
function baseParams(apiKey, page) {
  return {
    api_key: apiKey,
    'school.operating': '1',
    all_programs_nested: 'true',
    fields: FIELDS,
    per_page: '100',
    page: String(page)
  };
}

/**
 * Fetch a single page for an arbitrary set of query parameters.
 * @param {URLSearchParams} parameters
 * @returns {Promise<{ metadata: { total: number, per_page: number }, results: Array<Record<string, *>> }>}
 */
async function fetchPage(parameters) {
  const response = await fetch(`${API_URL}?${parameters}`);
  if (!response.ok) {
    throw new Error(
      response.status === 403 ? 'The API key was rejected.' : `College Scorecard returned HTTP ${response.status}.`
    );
  }
  return response.json();
}

/**
 * Fetch every page for a query. `makeParams(page)` builds the params for a page.
 * @param {(page: number) => URLSearchParams} makeParams
 * @returns {Promise<Array<Record<string, *>>>}
 */
async function fetchAllPages(makeParams) {
  const firstPage = await fetchPage(makeParams(0));
  const pageCount = Math.ceil(firstPage.metadata.total / firstPage.metadata.per_page);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchPage(makeParams(index + 1)))
  );
  return [firstPage, ...remaining].flatMap((page) => page.results);
}

/**
 * Search by location and enrollment (ZIP + radius + size range).
 * @param {SearchCriteria} criteria
 * @param {string} apiKey
 * @returns {Promise<Array<Record<string, *>>>}
 */
export function search(criteria, apiKey) {
  return fetchAllPages(
    (page) =>
      new URLSearchParams({
        ...baseParams(apiKey, page),
        zip: criteria.zip,
        distance: `${criteria.radius}mi`,
        'latest.student.size__range': `${criteria.minStudents}..${criteria.maxStudents - 1}`
      })
  );
}

/**
 * Search by institution name, anywhere in the country. Note the API's school.name
 * search also matches city, so callers should filter results down to true name
 * matches (see name-search.js).
 * @param {string} name
 * @param {string} apiKey
 * @returns {Promise<Array<Record<string, *>>>}
 */
export function searchByName(name, apiKey) {
  return fetchAllPages((page) => new URLSearchParams({ ...baseParams(apiKey, page), 'school.name': name }));
}
