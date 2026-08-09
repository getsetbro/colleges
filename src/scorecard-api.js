// @ts-check
// College Scorecard schools-endpoint access: field selection and pagination.
import { INSTITUTION_FIELDS, PROGRAM_FIELDS, SUMMARY_FIELDS } from './scorecard-fields.js';

const API_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools.json';

// Lean field set for result lists (no nested field-of-study data).
const SUMMARY_FIELD_LIST = SUMMARY_FIELDS.join(',');
// Full field set: institution fields plus nested field-of-study data. Requested
// only for a single school's detail view (fetchSchoolDetails), and for list
// searches that filter/rank by field of study (which needs the nested programs).
const FULL_FIELD_LIST = [...INSTITUTION_FIELDS, ...PROGRAM_FIELDS].join(',');

/**
 * @typedef {{ zip: string, radius: number, minStudents: number, maxStudents: number, fieldOfStudy?: string }} SearchCriteria
 */

/**
 * Query parameters shared by every schools-endpoint request. `nested` adds the
 * per-school field-of-study list (all_programs_nested); omit it for lean lists.
 * @param {string} apiKey
 * @param {number} page
 * @param {{ fields?: string, nested?: boolean }} [options]
 * @returns {Record<string, string>}
 */
function baseParams(apiKey, page, options = {}) {
  const params = {
    api_key: apiKey,
    'school.operating': '1',
    fields: options.fields ?? SUMMARY_FIELD_LIST,
    per_page: '100',
    page: String(page)
  };
  if (options.nested) params.all_programs_nested = 'true';
  return params;
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
  // A field-of-study search filters/ranks by each school's program titles, which
  // only the nested program list carries — so request it (and PROGRAM_FIELDS)
  // then. Plain location browsing needs neither and stays lean.
  const options = criteria.fieldOfStudy
    ? { fields: [...SUMMARY_FIELDS, ...PROGRAM_FIELDS].join(','), nested: true }
    : undefined;
  return fetchAllPages(
    (page) =>
      new URLSearchParams({
        ...baseParams(apiKey, page, options),
        zip: criteria.zip,
        distance: `${criteria.radius}mi`,
        'latest.student.size__range': `${criteria.minStudents}..${criteria.maxStudents - 1}`
      })
  );
}

/**
 * Fetch one school's complete record — every institution field plus the nested
 * field-of-study list — for the on-demand "View all details" view. Returns the
 * single raw record.
 * @param {string} id
 * @param {string} apiKey
 * @returns {Promise<Record<string, *>>}
 */
export async function fetchSchoolDetails(id, apiKey) {
  const page = await fetchPage(
    new URLSearchParams({ ...baseParams(apiKey, 0, { fields: FULL_FIELD_LIST, nested: true }), id })
  );
  const record = page.results[0];
  if (!record) throw new Error('Details for this school are unavailable.');
  return record;
}

/**
 * Fetch a specific set of schools by their Scorecard id (the favorites list),
 * using the lean summary field set — full detail is loaded per card on demand.
 * Requested one id per request (rather than a single comma-separated OR filter)
 * and run in parallel; results are flattened in id order. Returns [] for an
 * empty id list.
 * @param {string[]} ids
 * @param {string} apiKey
 * @returns {Promise<Array<Record<string, *>>>}
 */
export async function searchByIds(ids, apiKey) {
  if (!ids.length) return [];
  const pages = await Promise.all(ids.map((id) => fetchPage(new URLSearchParams({ ...baseParams(apiKey, 0), id }))));
  return pages.flatMap((page) => page.results);
}

/**
 * Search by institution name, anywhere in the country. Queries both the official
 * name and known aliases (former/alternate names) and merges the two result sets,
 * deduped by id. Note the API's school.name search also matches city, so callers
 * should filter results down to true name/alias matches (see name-search.js).
 * The alias query is best-effort: if it fails, name results are still returned.
 * @param {string} name
 * @param {string} apiKey
 * @returns {Promise<Array<Record<string, *>>>}
 */
export async function searchByName(name, apiKey) {
  const byName = fetchAllPages((page) => new URLSearchParams({ ...baseParams(apiKey, page), 'school.name': name }));
  const byAlias = fetchAllPages(
    (page) => new URLSearchParams({ ...baseParams(apiKey, page), 'school.alias': name })
  ).catch(() => /** @type {Array<Record<string, *>>} */ ([]));
  const [nameResults, aliasResults] = await Promise.all([byName, byAlias]);
  const merged = new Map(nameResults.map((school) => [school.id, school]));
  for (const school of aliasResults) if (!merged.has(school.id)) merged.set(school.id, school);
  return [...merged.values()];
}
