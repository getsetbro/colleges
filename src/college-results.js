const DIRECTIONS_ORIGIN = '45036';

const schoolType = (ownership) => ({ 1: 'Public', 2: 'Private nonprofit', 3: 'Private for-profit' })[ownership] ?? 'Unknown';
const formatNumber = (value) => value == null ? 'Not reported' : Number(value).toLocaleString();
const formatPercent = (value) => value == null ? 'Not reported' : `${Math.round(Number(value) * 100)}%`;
const formatCurrency = (value) => value == null ? 'Not reported' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

function safeUrl(value) {
  if (!value) return null;
  try { return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).href; } catch { return null; }
}

function directionsUrl(school) {
  const coordinates = [school['location.lat'], school['location.lon']];
  const destination = coordinates.every((value) => value != null) ? coordinates.join(',') : `${school['school.name']}, ${school['school.city']}, ${school['school.state']} ${school['school.zip']}`;
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', origin: DIRECTIONS_ORIGIN, destination, travelmode: 'driving' })}`;
}

function detailGroup(title, items) {
  return `<section class="detail-group"><h4>${title}</h4><dl>${items.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></section>`;
}

function compareNullable(a, b, direction = 1) {
  const aMissing = a == null || Number.isNaN(a);
  const bMissing = b == null || Number.isNaN(b);
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
  return (a - b) * direction;
}

class CollegeResults extends HTMLElement {
  #allResults = [];
  #currentResults = [];

  connectedCallback() {
    this.innerHTML = `
      <section class="results-section" aria-labelledby="results-title">
        <div class="section-heading results-heading"><div><span class="step">02</span><h2 id="results-title">Results</h2></div><button class="secondary export-button" type="button" hidden>Export CSV</button></div>
        <div class="status">Set your criteria and run a search.</div>
        <form class="result-controls" hidden>
          <label>Filter results<input class="result-query" type="search" placeholder="School, city, or state" autocomplete="off" /></label>
          <label>Ownership<select class="ownership-filter"><option value="">All types</option><option value="1">Public</option><option value="2">Private nonprofit</option><option value="3">Private for-profit</option></select></label>
          <label>Max in-state tuition<input class="in-state-tuition-filter" type="number" min="0" step="1000" placeholder="No maximum" inputmode="numeric" /></label>
          <label>Max out-of-state tuition<input class="out-of-state-tuition-filter" type="number" min="0" step="1000" placeholder="No maximum" inputmode="numeric" /></label>
          <label>Sort by<select class="result-sort"><option value="name-asc">Name: A–Z</option><option value="distance-asc">Distance: nearest first</option><option value="enrollment-asc">Enrollment: low to high</option><option value="enrollment-desc">Enrollment: high to low</option><option value="net-price-asc">Net price: low to high</option><option value="admission-rate-desc">Admission rate: high to low</option></select></label>
          <button class="secondary clear-filters" type="button">Reset</button>
        </form>
        <div class="results-grid" aria-live="polite"></div>
      </section>`;
    this.querySelector('.result-controls').addEventListener('submit', (event) => event.preventDefault());
    this.querySelector('.result-controls').addEventListener('input', () => this.#update());
    this.querySelector('.clear-filters').addEventListener('click', () => { this.querySelector('.result-controls').reset(); this.#update(); });
    this.querySelector('.export-button').addEventListener('click', () => this.#export());
  }

  set loading(value) {
    if (!value) return;
    const status = this.querySelector('.status');
    status.className = 'status loading';
    status.textContent = 'Querying College Scorecard…';
    this.querySelector('.results-grid').innerHTML = '';
    this.querySelector('.result-controls').hidden = true;
    this.querySelector('.export-button').hidden = true;
  }

  set results(value) {
    this.#allResults = [...value];
    const controls = this.querySelector('.result-controls');
    controls.reset();
    controls.hidden = value.length === 0;
    this.#update();
  }

  setError(message) {
    this.#allResults = [];
    this.#currentResults = [];
    const status = this.querySelector('.status');
    status.className = 'status error';
    status.textContent = message;
    this.querySelector('.results-grid').innerHTML = '';
    this.querySelector('.result-controls').hidden = true;
    this.querySelector('.export-button').hidden = true;
  }

  #update() {
    const query = this.querySelector('.result-query').value.trim().toLocaleLowerCase();
    const ownership = this.querySelector('.ownership-filter').value;
    const maxInStateTuition = this.#optionalNumber('.in-state-tuition-filter');
    const maxOutOfStateTuition = this.#optionalNumber('.out-of-state-tuition-filter');
    const [field, direction] = this.querySelector('.result-sort').value.split('-');
    const getter = { distance: (school) => school.distance, enrollment: (school) => school['latest.student.size'], 'net-price': (school) => school['latest.cost.avg_net_price.overall'], 'admission-rate': (school) => school['latest.admissions.admission_rate.overall'] }[field];
    const results = this.#allResults.filter((school) => {
      const searchable = [school['school.name'], school['school.city'], school['school.state']].filter(Boolean).join(' ').toLocaleLowerCase();
      const inStateTuition = school['latest.cost.tuition.in_state'];
      const outOfStateTuition = school['latest.cost.tuition.out_of_state'];
      return (!query || searchable.includes(query))
        && (!ownership || String(school['school.ownership']) === ownership)
        && (maxInStateTuition == null || (inStateTuition != null && Number(inStateTuition) <= maxInStateTuition))
        && (maxOutOfStateTuition == null || (outOfStateTuition != null && Number(outOfStateTuition) <= maxOutOfStateTuition));
    }).sort((a, b) => field === 'name' ? a['school.name'].localeCompare(b['school.name']) : compareNullable(getter(a), getter(b), direction === 'desc' ? -1 : 1) || a['school.name'].localeCompare(b['school.name']));
    this.#render(results);
  }

  #optionalNumber(selector) {
    const value = this.querySelector(selector).value;
    return value === '' ? null : Number(value);
  }

  #render(results) {
    this.#currentResults = results;
    this.querySelector('.export-button').hidden = results.length === 0;
    const status = this.querySelector('.status');
    status.className = 'status';
    status.textContent = results.length !== this.#allResults.length ? `${results.length} of ${this.#allResults.length} schools shown` : `${results.length} ${results.length === 1 ? 'school' : 'schools'} found`;
    const output = this.querySelector('.results-grid');
    if (!results.length) {
      output.innerHTML = this.#allResults.length ? '<div class="empty"><strong>No schools match these filters.</strong><span>Change or reset the result filters to see more schools.</span></div>' : '<div class="empty"><strong>No matching colleges found.</strong><span>Try increasing the radius or maximum enrollment.</span></div>';
      return;
    }
    output.innerHTML = results.map((school, index) => this.#card(school, index)).join('');
  }

  #card(school, index) {
    const website = safeUrl(school['school.school_url']);
    const distance = school.distance == null ? 'Within radius' : `${Math.round(school.distance)} mi`;
    const locationClass = school['school.state']?.toUpperCase() === 'OH' ? '' : ' out-of-state';
    const groups = [
      detailGroup('Institution', [['Ownership', schoolType(school['school.ownership'])], ['ZIP code', school['school.zip']], ['Locale code', school['school.locale']], ['Carnegie classification', school['school.carnegie_basic']], ['Religious affiliation code', school['school.religious_affiliation']]]),
      detailGroup('Admissions', [['Admission rate', formatPercent(school['latest.admissions.admission_rate.overall'])], ['Average SAT', formatNumber(school['latest.admissions.sat_scores.average.overall'])], ['ACT midpoint', formatNumber(school['latest.admissions.act_scores.midpoint.cumulative'])]]),
      detailGroup('Costs', [['In-state tuition', formatCurrency(school['latest.cost.tuition.in_state'])], ['Out-of-state tuition', formatCurrency(school['latest.cost.tuition.out_of_state'])], ['Average net price', formatCurrency(school['latest.cost.avg_net_price.overall'])], ['On-campus room & board', formatCurrency(school['latest.cost.roomboard.oncampus'])]]),
      detailGroup('Aid & debt', [['Pell Grant recipients', formatPercent(school['latest.aid.pell_grant_rate'])], ['Federal loan recipients', formatPercent(school['latest.aid.federal_loan_rate'])], ['Median completer debt', formatCurrency(school['latest.aid.median_debt.completers.overall'])]]),
      detailGroup('Outcomes', [['150% completion rate', formatPercent(school['latest.completion.completion_rate_4yr_150nt'])], ['Full-time retention', formatPercent(school['latest.completion.retention_rate.four_year.full_time'])], ['Median earnings after 10 years', formatCurrency(school['latest.earnings.10_yrs_after_entry.median'])]]),
      detailGroup('Students', [['Undergraduates', formatNumber(school['latest.student.size'])], ['Part-time', formatPercent(school['latest.student.part_time_share'])], ['Men', formatPercent(school['latest.student.demographics.men'])], ['Women', formatPercent(school['latest.student.demographics.women'])], ['White', formatPercent(school['latest.student.demographics.race_ethnicity.white'])], ['Black', formatPercent(school['latest.student.demographics.race_ethnicity.black'])], ['Hispanic', formatPercent(school['latest.student.demographics.race_ethnicity.hispanic'])], ['Asian', formatPercent(school['latest.student.demographics.race_ethnicity.asian'])]]),
      detailGroup('Academics', [['Predominant degree code', school['school.degrees_awarded.predominant']]])
    ].join('');
    return `<article class="result-card${locationClass}"><div class="rank">${String(index + 1).padStart(2, '0')}</div><div class="school-info"><div class="badges"><span>${distance}</span><span>${schoolType(school['school.ownership'])}</span></div><h3>${escapeHtml(school['school.name'])}</h3><p>${escapeHtml(school['school.city'])}, ${escapeHtml(school['school.state'])}</p></div><div class="enrollment"><strong>${formatNumber(school['latest.student.size'])}</strong><span>undergrads</span></div><div class="card-links">${website ? `<a href="${website}" target="_blank" rel="noreferrer">Website ↗</a>` : ''}<a href="${directionsUrl(school)}" target="_blank" rel="noreferrer">Directions ↗</a></div><details class="school-details"><summary>View all details</summary><div class="detail-grid">${groups}</div></details></article>`;
  }

  #export() {
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [['Institution', 'City', 'State', 'Undergraduates', 'Approx. Distance (mi)', 'Admission Rate', 'In-State Tuition', 'Out-of-State Tuition', 'Average Net Price', 'Pell Grant Rate', 'Median Debt', 'Completion Rate', 'Retention Rate', '10-Year Median Earnings', 'Website', 'Directions'], ...this.#currentResults.map((school) => [school['school.name'], school['school.city'], school['school.state'], school['latest.student.size'], school.distance?.toFixed(1), school['latest.admissions.admission_rate.overall'], school['latest.cost.tuition.in_state'], school['latest.cost.tuition.out_of_state'], school['latest.cost.avg_net_price.overall'], school['latest.aid.pell_grant_rate'], school['latest.aid.median_debt.completers.overall'], school['latest.completion.completion_rate_4yr_150nt'], school['latest.completion.retention_rate.four_year.full_time'], school['latest.earnings.10_yrs_after_entry.median'], safeUrl(school['school.school_url']), directionsUrl(school)])];
    const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\n')], { type: 'text/csv' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'college-results.csv' });
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

customElements.define('college-results', CollegeResults);