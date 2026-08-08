// @ts-check
import './styles.css';
import './page-header.js';
import { FAVORITES_KEY } from './college-results.js';
import { searchByIds } from './scorecard-api.js';
import { mapSchool } from './scorecard-fields.js';

const API_KEY = import.meta.env.VITE_DATA_GOV_API_KEY;

const collegeResults = /** @type {any} */ (document.querySelector('college-results'));

// The favorites page has no search origin, so distance is meaningless here.
collegeResults.hideDistance = true;
collegeResults.emptyMessage = 'No saved schools yet. Select “Save” on any result to collect it here.';

/** @returns {string[]} the favorited school ids from localStorage */
function favoriteIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

async function loadFavorites() {
  const ids = favoriteIds();
  if (!ids.length) {
    collegeResults.results = [];
    return;
  }
  if (!API_KEY) {
    collegeResults.setError('Missing VITE_DATA_GOV_API_KEY. Add it to .env and rebuild.');
    return;
  }
  collegeResults.loading = true;
  try {
    const schools = await searchByIds(ids, API_KEY);
    collegeResults.results = schools.map((school) => mapSchool(school)).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    collegeResults.setError(error instanceof Error ? error.message : String(error));
  }
}

loadFavorites();
