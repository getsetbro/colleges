// @ts-check
import './styles.css';
import './name-search-form.js';
import './college-results.js';
import { searchByName } from './scorecard-api.js';
import { mapSchool } from './scorecard-fields.js';

const API_KEY = import.meta.env.VITE_DATA_GOV_API_KEY;

const searchForm = /** @type {any} */ (document.querySelector('college-name-form'));
const collegeResults = /** @type {any} */ (document.querySelector('college-results'));

// A name search has no origin point, so distance is meaningless here.
collegeResults.hideDistance = true;

searchForm.addEventListener('namesearch', async (/** @type {CustomEvent} */ event) => {
  if (!API_KEY) {
    collegeResults.setError('Missing VITE_DATA_GOV_API_KEY. Add it to .env and rebuild.');
    return;
  }
  searchForm.loading = true;
  collegeResults.loading = true;
  try {
    const term = String(event.detail.name).trim().toLocaleLowerCase();
    const schools = await searchByName(event.detail.name, API_KEY);
    collegeResults.results = schools
      .map((school) => mapSchool(school))
      // The API's school.name search also matches city; keep only true name matches.
      .filter((school) => school.name.toLocaleLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    collegeResults.setError(error instanceof Error ? error.message : String(error));
  } finally {
    searchForm.loading = false;
  }
});
