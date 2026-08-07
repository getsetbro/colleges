// @ts-check
import './styles.css';
import './search-form.js';
import './college-results.js';
import { search } from './scorecard-api.js';
import { mapSchool } from './scorecard-fields.js';

const API_KEY = import.meta.env.VITE_DATA_GOV_API_KEY;

const searchForm = /** @type {any} */ (document.querySelector('college-search-form'));
const collegeResults = /** @type {any} */ (document.querySelector('college-results'));

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
 * Resolve a ZIP code to its coordinates and state via zippopotam.us.
 * @param {string} zip
 * @returns {Promise<{ coordinates: [number, number], state: string|null }|null>}
 */
async function getZipLocation(zip) {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!response.ok) return null;
    const data = await response.json();
    const place = data.places[0];
    return {
      coordinates: [Number(place.latitude), Number(place.longitude)],
      state: place['state abbreviation'] ?? null
    };
  } catch {
    return null;
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
    const [schools, zipLocation] = await Promise.all([
      search(event.detail, API_KEY),
      getZipLocation(event.detail.zip)
    ]);
    const origin = zipLocation?.coordinates ?? null;
    collegeResults.originState = zipLocation?.state ?? null;
    collegeResults.results = schools
      // Keep predominantly bachelor's-degree-granting institutions.
      .filter((school) => Number(school['school.degrees_awarded.predominant']) === 3)
      .map((school) => {
        const lat = Number(school['location.lat']);
        const lon = Number(school['location.lon']);
        const distance = haversineMiles(origin, [
          Number.isFinite(lat) ? lat : undefined,
          Number.isFinite(lon) ? lon : undefined
        ]);
        return mapSchool(school, distance);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    collegeResults.setError(error instanceof Error ? error.message : String(error));
  } finally {
    searchForm.loading = false;
  }
});
