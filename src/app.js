import './styles.css';
import './search-form.js';
import './college-results.js';

const API_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools.json';
const API_KEY = import.meta.env.VITE_DATA_GOV_API_KEY;
const FIELDS = [
  'id', 'school.name', 'school.city', 'school.state', 'school.zip', 'school.ownership',
  'school.school_url', 'school.degrees_awarded.predominant', 'school.locale',
  'school.carnegie_basic', 'school.religious_affiliation', 'latest.student.size',
  'latest.student.part_time_share', 'latest.student.demographics.men',
  'latest.student.demographics.women', 'latest.student.demographics.race_ethnicity.white',
  'latest.student.demographics.race_ethnicity.black', 'latest.student.demographics.race_ethnicity.hispanic',
  'latest.student.demographics.race_ethnicity.asian', 'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.average.overall', 'latest.admissions.act_scores.midpoint.cumulative',
  'latest.cost.tuition.in_state', 'latest.cost.tuition.out_of_state', 'latest.cost.avg_net_price.overall',
  'latest.cost.roomboard.oncampus', 'latest.aid.pell_grant_rate', 'latest.aid.federal_loan_rate',
  'latest.aid.median_debt.completers.overall', 'latest.completion.completion_rate_4yr_150nt',
  'latest.completion.retention_rate.four_year.full_time', 'latest.earnings.10_yrs_after_entry.median',
  'location.lat', 'location.lon'
].join(',');

const searchForm = document.querySelector('college-search-form');
const collegeResults = document.querySelector('college-results');

function haversineMiles(origin, destination) {
  if (!origin || destination.some((coordinate) => coordinate == null)) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const [lat1, lon1] = origin.map(radians);
  const [lat2, lon2] = destination.map(radians);
  const value = Math.sin((lat2 - lat1) / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(value));
}

async function getZipCoordinates(zip) {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!response.ok) return null;
    const data = await response.json();
    return [Number(data.places[0].latitude), Number(data.places[0].longitude)];
  } catch { return null; }
}

async function fetchPage(criteria, page) {
  const parameters = new URLSearchParams({
    api_key: API_KEY, zip: criteria.zip, distance: `${criteria.radius}mi`,
    'latest.student.size__range': `1..${criteria.maxStudents - 1}`,
    'school.operating': '1', fields: FIELDS, per_page: '100', page: String(page)
  });
  const response = await fetch(`${API_URL}?${parameters}`);
  if (!response.ok) throw new Error(response.status === 403 ? 'The API key was rejected.' : `College Scorecard returned HTTP ${response.status}.`);
  return response.json();
}

async function search(criteria) {
  const firstPage = await fetchPage(criteria, 0);
  const pageCount = Math.ceil(firstPage.metadata.total / firstPage.metadata.per_page);
  const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(criteria, index + 1)));
  return [firstPage, ...remaining].flatMap((page) => page.results);
}

searchForm.addEventListener('search', async (event) => {
  if (!API_KEY) { collegeResults.setError('Missing VITE_DATA_GOV_API_KEY. Add it to .env and rebuild.'); return; }
  searchForm.loading = true;
  collegeResults.loading = true;
  try {
    const [schools, origin] = await Promise.all([search(event.detail), getZipCoordinates(event.detail.zip)]);
    collegeResults.results = schools
      .filter((school) => school['school.degrees_awarded.predominant'] === 3)
      .map((school) => ({ ...school, distance: haversineMiles(origin, [school['location.lat'], school['location.lon']]) }))
      .sort((a, b) => a['school.name'].localeCompare(b['school.name']));
  } catch (error) {
    collegeResults.setError(error.message);
  } finally {
    searchForm.loading = false;
  }
});