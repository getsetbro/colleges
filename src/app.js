// @ts-check
import './styles.css';
import './page-header.js';
import './search-form.js';
import './college-results.js';
import { search, fetchSchoolDetails } from './scorecard-api.js';
import { mapSchool } from './scorecard-fields.js';

const API_KEY = import.meta.env.VITE_DATA_GOV_API_KEY;

const searchForm = /** @type {any} */ (document.querySelector('college-search-form'));
const collegeResults = /** @type {any} */ (document.querySelector('college-results'));

// Full record for a school is fetched only when its "View all details" expands.
collegeResults.detailLoader = async (/** @type {string} */ id) => mapSchool(await fetchSchoolDetails(id, API_KEY));

/**
 * Great-circle distance in miles between two [lat, lon] points.
 * @param {[number, number]|null} origin
 * @param {[number|undefined, number|undefined]} destination
 * @returns {number|null}
 */
function haversineMiles(origin, destination) {
  if (!origin || destination.some((coordinate) => coordinate == null)) return null;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const [lat1, lon1] = origin.map(radians);
  const [lat2, lon2] = /** @type {[number, number]} */ (destination).map(radians);
  const value = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(value));
}

/**
 * Resolve a ZIP code to its coordinates and state via zippopotam.us. Results are
 * effectively static, so they're cached per-ZIP in sessionStorage. A 404 (unknown
 * ZIP) is cached too; transient network errors are not.
 * @param {string} zip
 * @returns {Promise<{ coordinates: [number, number], state: string|null }|null>}
 */
async function getZipLocation(zip) {
  const cacheKey = `zip:${zip}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached != null) return JSON.parse(cached);
  } catch {
    // sessionStorage unavailable — fall through to the network.
  }
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!response.ok) {
      if (response.status === 404) cacheZipLocation(cacheKey, null);
      return null;
    }
    const data = await response.json();
    const place = data.places[0];
    const result = {
      coordinates: /** @type {[number, number]} */ ([Number(place.latitude), Number(place.longitude)]),
      state: place['state abbreviation'] ?? null
    };
    cacheZipLocation(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

/** @param {string} key @param {object|null} value */
function cacheZipLocation(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage unavailable or full — skip caching.
  }
}

searchForm.addEventListener('search', async (/** @type {CustomEvent} */ event) => {
  if (!API_KEY) {
    collegeResults.setError('Missing VITE_DATA_GOV_API_KEY. Add it to .env and rebuild.');
    return;
  }
  searchForm.loading = true;
  collegeResults.loading = true;
  try {
    const [schools, zipLocation] = await Promise.all([search(event.detail, API_KEY), getZipLocation(event.detail.zip)]);
    const origin = zipLocation?.coordinates ?? null;
    // A field of study entered in the search form matches against a school's full
    // list of fields of study (programs), distinct from the results' popular-program filter.
    const fieldOfStudy = String(event.detail.fieldOfStudy ?? '').toLocaleLowerCase();
    collegeResults.originState = zipLocation?.state ?? null;
    // Rank the Relevance sort by this field of study; must be set before `results`.
    collegeResults.relevanceTerm = fieldOfStudy;
    collegeResults.results = schools
      .map((school) => {
        const lat = Number(school['location.lat']);
        const lon = Number(school['location.lon']);
        const distance = haversineMiles(origin, [
          Number.isFinite(lat) ? lat : undefined,
          Number.isFinite(lon) ? lon : undefined
        ]);
        return mapSchool(school, distance);
      })
      .filter(
        (school) =>
          !fieldOfStudy || school.academics.programs.some((p) => p.title?.toLocaleLowerCase().includes(fieldOfStudy))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    collegeResults.setError(error instanceof Error ? error.message : String(error));
  } finally {
    searchForm.loading = false;
  }
});
