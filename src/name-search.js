// @ts-check
import './styles.css';
import './page-header.js';
import './theme-toggle.js';
import './name-search-form.js';
import './college-results.js';
import { searchByName, fetchSchoolDetails } from './scorecard-api.js';
import { mapSchool } from './scorecard-fields.js';

const API_KEY = import.meta.env.VITE_DATA_GOV_API_KEY;

const searchForm = /** @type {any} */ (document.querySelector('college-name-form'));
const collegeResults = /** @type {any} */ (document.querySelector('college-results'));

// A name search has no origin point, so distance is meaningless here.
collegeResults.hideDistance = true;
// A name search is already the user's targeted lookup — no result filter/sort controls.
collegeResults.hideControls = true;
// Full record for a school is fetched only when its "View all details" expands.
collegeResults.detailLoader = async (/** @type {string} */ id) => mapSchool(await fetchSchoolDetails(id, API_KEY));

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
      // The API's school.name search also matches city; keep only true name matches,
      // plus schools whose alias (former/alternate name) contains the term.
      .filter(
        (school) =>
          school.name.toLocaleLowerCase().includes(term) ||
          (school.profile.alias ?? '').toLocaleLowerCase().includes(term)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    collegeResults.setError(error instanceof Error ? error.message : String(error));
  } finally {
    searchForm.loading = false;
  }
});
