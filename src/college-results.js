// @ts-check
import {
  OWNERSHIP,
  PREDOMINANT_DEGREE,
  HIGHEST_DEGREE,
  LOCALE,
  CARNEGIE_BASIC,
  CARNEGIE_UNDERGRAD,
  CARNEGIE_SIZE_SETTING,
  RELIGIOUS_AFFILIATION,
  TEST_REQUIREMENTS,
  CREDENTIAL_LEVEL,
  LATEST_ALIAS_NOTE,
  label,
  formatCurrency,
  formatCount,
  formatPercent,
  formatScore,
  formatRange,
  formatCoordinate,
  formatMiles,
  programFamilyKey,
  NOT_REPORTED
} from './scorecard-fields.js';

/** @typedef {import('./scorecard-fields.js').MappedSchool} MappedSchool */

const DIRECTIONS_ORIGIN = '45036';
const MAX_PROGRAM_ROWS = 15;

/** @param {*} value @returns {string} */
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>'"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character
  );

const ownershipLabel = (code) => label(OWNERSHIP, code);

/** @param {MappedSchool} school @returns {string} */
function directionsUrl(school) {
  const { lat, lon, city, state, zip } = school.location;
  const destination =
    lat != null && lon != null ? `${lat},${lon}` : `${school.name}, ${city ?? ''}, ${state ?? ''} ${zip ?? ''}`;
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', origin: DIRECTIONS_ORIGIN, destination, travelmode: 'driving' })}`;
}

/**
 * Render a labelled section. `items` are [label, value] pairs; a value may be
 * `{ html }` to inject already-safe markup (links, ranges) instead of escaped text.
 * When `collapsible` is set, only the title shows until the user clicks to reveal
 * the rows (native <details> disclosure).
 * @param {string} title
 * @param {Array<[string, string | { html: string }]>} items
 * @param {string} [source]
 * @param {{ collapsible?: boolean }} [options]
 * @returns {string}
 */
function detailGroup(title, items, source, options = {}) {
  const rows = items
    .map(([itemLabel, value]) => {
      const dd = typeof value === 'object' ? value.html : escapeHtml(value);
      return `<div><dt>${escapeHtml(itemLabel)}</dt><dd>${dd}</dd></div>`;
    })
    .join('');
  const caption = source ? `<p class="detail-source">Source: ${escapeHtml(source)}</p>` : '';
  if (options.collapsible) {
    return `<details class="detail-group detail-group-collapsible"><summary><h4>${escapeHtml(title)}</h4></summary><dl>${rows}</dl>${caption}</details>`;
  }
  return `<section class="detail-group"><h4>${escapeHtml(title)}</h4><dl>${rows}</dl>${caption}</section>`;
}

/** @param {string|undefined} url @param {string} text @returns {{ html: string }} */
function linkValue(url, text) {
  if (!url) return { html: escapeHtml(NOT_REPORTED) };
  return { html: `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(text)} ↗</a>` };
}

/** @param {MappedSchool} school @returns {string} */
function profileGroup(school) {
  const p = school.profile;
  return detailGroup(
    'School profile',
    [
      ['Ownership', ownershipLabel(p.ownership)],
      ['Predominant degree', label(PREDOMINANT_DEGREE, p.predominantDegree)],
      ['Highest degree', label(HIGHEST_DEGREE, p.highestDegree)],
      ['Carnegie classification', label(CARNEGIE_BASIC, p.carnegieBasic)],
      ['Undergraduate profile', label(CARNEGIE_UNDERGRAD, p.carnegieUndergrad)],
      ['Size & setting', label(CARNEGIE_SIZE_SETTING, p.carnegieSizeSetting)],
      ['Main campus', p.mainCampus === 1 ? 'Yes' : p.mainCampus === 0 ? 'No (branch)' : NOT_REPORTED],
      ['Branch campuses', formatCount(p.branches, { zeroOk: true })],
      ['Religious affiliation', label(RELIGIOUS_AFFILIATION, p.religiousAffiliation)],
      ['Website', linkValue(p.website, 'Homepage')],
      ['Net price calculator', linkValue(p.netPriceCalculatorUrl, 'Calculator')]
    ],
    'IPEDS'
  );
}

/** @param {MappedSchool} school @returns {string} */
function locationGroup(school) {
  const l = school.location;
  const items = /** @type {Array<[string, string | { html: string }]>} */ ([
    ['City', l.city ?? NOT_REPORTED],
    ['State', l.state ?? NOT_REPORTED],
    ['ZIP code', l.zip ?? NOT_REPORTED],
    ['Setting (locale)', label(LOCALE, l.locale)],
    ['Latitude', formatCoordinate(l.lat)],
    ['Longitude', formatCoordinate(l.lon)]
  ]);
  if (l.distance != null) items.push(['Distance from search ZIP', formatMiles(l.distance)]);
  return detailGroup('Location', items, 'IPEDS');
}

/** @param {MappedSchool} school @returns {string} */
function enrollmentGroup(school) {
  const e = school.enrollment;
  const d = e.demographics;
  return detailGroup(
    'Enrollment',
    [
      ['Undergraduates (degree-seeking)', formatCount(e.size)],
      ['All undergraduates', formatCount(e.total)],
      ['Undergrad (12-month)', formatCount(e.undergrad12mo)],
      ['Graduate (12-month)', formatCount(e.grad12mo)],
      ['Part-time share', formatPercent(e.partTimeShare)],
      ['Aged 25 and older', formatPercent(e.share25older)],
      ['Men', formatPercent(d.men)],
      ['Women', formatPercent(d.women)],
      ['White', formatPercent(d.white)],
      ['Black', formatPercent(d.black)],
      ['Hispanic', formatPercent(d.hispanic)],
      ['Asian', formatPercent(d.asian)],
      ['American Indian/Alaska Native', formatPercent(d.aian)],
      ['Native Hawaiian/Pacific Islander', formatPercent(d.nhpi)],
      ['Two or more races', formatPercent(d.twoOrMore)],
      ['Non-resident', formatPercent(d.nonResidentAlien)],
      ['Race/ethnicity unknown', formatPercent(d.unknown)]
    ],
    'IPEDS'
  );
}

/** @param {MappedSchool} school @returns {string} */
function admissionsGroup(school) {
  const a = school.admissions;
  const openAdmissions = a.admissionRate === 1 ? ' (open admissions)' : '';
  return detailGroup(
    'Admissions',
    [
      ['Admission rate', a.admissionRate == null ? NOT_REPORTED : `${formatPercent(a.admissionRate)}${openAdmissions}`],
      ['Admission rate (all campuses)', formatPercent(a.admissionRateOpe)],
      ['Test policy', label(TEST_REQUIREMENTS, a.testRequirements)],
      ['SAT average', formatScore(a.satAverage)],
      ['SAT reading (25th–75th)', { html: escapeHtml(formatRange(a.satReading[0], a.satReading[1])) }],
      ['SAT math (25th–75th)', { html: escapeHtml(formatRange(a.satMath[0], a.satMath[1])) }],
      ['ACT cumulative (25th–75th)', { html: escapeHtml(formatRange(a.act[0], a.act[1])) }],
      ['ACT midpoint', formatScore(a.actMidpoint)]
    ],
    'IPEDS'
  );
}

/** @param {MappedSchool} school @returns {string} */
function costGroup(school) {
  const c = school.cost;
  const income = c.netPriceByIncome.public;
  const privateIncome = c.netPriceByIncome.private;
  // Net price by income: public and private are mutually exclusive by ownership.
  const bracket = (key) => formatCurrency(income[key] ?? privateIncome[key]);
  return detailGroup(
    'Costs & aid',
    [
      ['In-state tuition & fees', formatCurrency(c.tuitionInState)],
      ['Out-of-state tuition & fees', formatCurrency(c.tuitionOutOfState)],
      ['Total cost of attendance (year)', formatCurrency(c.attendanceAcademicYear)],
      ['On-campus room & board', formatCurrency(c.roomBoardOnCampus)],
      ['Books & supplies', formatCurrency(c.bookSupply)],
      ['Average net price', formatCurrency(c.netPriceOverall)],
      ['Net price · income $0–30K', bracket('0-30000')],
      ['Net price · $30K–48K', bracket('30001-48000')],
      ['Net price · $48K–75K', bracket('48001-75000')],
      ['Net price · $75K–110K', bracket('75001-110000')],
      ['Net price · $110K+', bracket('110001-plus')],
      ['Pell Grant recipients', formatPercent(school.aid.pellRate)],
      ['Federal loan recipients', formatPercent(school.aid.federalLoanRate)],
      ['Median debt (completers)', formatCurrency(school.aid.medianDebtCompleters)],
      ['Est. monthly loan payment', formatCurrency(school.aid.medianDebtMonthly)]
    ],
    'IPEDS; aid & debt from NSLDS'
  );
}

/** @param {MappedSchool} school @returns {string} */
function outcomesGroup(school) {
  const o = school.outcomes;
  return detailGroup(
    'Outcomes',
    [
      ['Retention — 4yr, full-time', formatPercent(o.retentionFourYearFull)],
      ['Retention — <4yr, full-time', formatPercent(o.retentionLtFourYearFull)],
      ['Retention — 4yr, part-time', formatPercent(o.retentionFourYearPart)],
      ['Completion — 4yr (150% time)', formatPercent(o.completion4yr150)],
      ['Completion — <4yr (150% time)', formatPercent(o.completionLt4yr150)],
      ['Completion — 4yr (100% time)', formatPercent(o.completion4yr100)],
      ['Transfer rate — 4yr, full-time', formatPercent(o.transfer4yr)],
      ['Median earnings — 6 yrs after entry', formatCurrency(o.earnings6yr)],
      ['Median earnings — 10 yrs after entry', formatCurrency(o.earnings10yr)],
      ['Earning above HS-grad threshold (10 yr)', formatPercent(o.shareEarningAboveHsGrad)],
      ['HS-grad earnings benchmark', formatCurrency(o.hsGradEarningsThreshold)],
      ['Loans repaid & declining (3 yr)', formatPercent(o.repaymentRate3yr)],
      ['Default rate (2 yr cohort)', formatPercent(o.defaultRate2yr)],
      ['Default rate (3 yr cohort)', formatPercent(o.defaultRate3yr)]
    ],
    'IPEDS; earnings from U.S. Treasury; repayment from NSLDS; default rates from Federal Student Aid',
    { collapsible: true }
  );
}

/** @param {MappedSchool} school @returns {string} */
function academicsGroup(school) {
  const top = school.academics.topPrograms.slice(0, 6);
  const items = top.length
    ? /** @type {Array<[string, string | { html: string }]>} */ (
        top.map((program) => [program.label, formatPercent(program.share)])
      )
    : /** @type {Array<[string, string | { html: string }]>} */ ([['Popular programs', NOT_REPORTED]]);
  return detailGroup('Popular programs (share of degrees)', items, 'IPEDS');
}

/** @param {MappedSchool} school @returns {string} */
function programsTable(school) {
  const programs = school.academics.programs
    .slice()
    .sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')));
  if (!programs.length) return '';
  const total = programs.length;
  // Rows past the cap are rendered but hidden until the user expands (CSS toggle).
  const rows = programs
    .map((program, index) => {
      const credential =
        program.credentialTitle != null
          ? String(program.credentialTitle)
          : label(CREDENTIAL_LEVEL, program.credentialLevel);
      const overflow = index >= MAX_PROGRAM_ROWS ? ' class="program-overflow"' : '';
      return `<tr${overflow}><td>${escapeHtml(program.title ?? NOT_REPORTED)}</td><td>${escapeHtml(credential)}</td><td>${escapeHtml(formatCount(program.awards, { zeroOk: true }))}</td><td>${escapeHtml(formatCurrency(program.earnings1yr))}</td><td>${escapeHtml(formatCurrency(program.medianDebt))}</td></tr>`;
    })
    .join('');
  let checkbox = '';
  let toggleLabels = '';
  if (total > MAX_PROGRAM_ROWS) {
    const toggleId = `programs-toggle-${escapeHtml(school.id)}`;
    checkbox = `<input type="checkbox" id="${toggleId}" class="program-toggle" hidden />`;
    toggleLabels = `<label class="program-toggle-label more" for="${toggleId}">Show all ${total} fields of study →</label><label class="program-toggle-label less" for="${toggleId}">Show fewer ↑</label>`;
  }
  return `<section class="detail-group program-table"><h4>Fields of study</h4>${checkbox}<table><thead><tr><th>Program</th><th>Credential</th><th>Awards</th><th>Median earnings (1 yr)</th><th>Median debt</th></tr></thead><tbody>${rows}</tbody></table>${toggleLabels}<p class="detail-source">Sorted alphabetically. Source: IPEDS; program earnings &amp; debt from U.S. Treasury &amp; NSLDS</p></section>`;
}

function compareNullable(a, b, direction = 1) {
  const aMissing = a == null || Number.isNaN(a);
  const bMissing = b == null || Number.isNaN(b);
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
  return (a - b) * direction;
}

class CollegeResults extends HTMLElement {
  /** @type {MappedSchool[]} */
  #allResults = [];
  /** @type {MappedSchool[]} */
  #currentResults = [];
  /** @type {string|null} state abbreviation of the searched ZIP; schools elsewhere render as out-of-state */
  #originState = null;

  connectedCallback() {
    this.innerHTML = `
      <section class="results-section" aria-labelledby="results-title">
        <div class="section-heading results-heading"><div><span class="step">02</span><h2 id="results-title">Results</h2></div><button class="secondary export-button" type="button" hidden>Export CSV</button></div>
        <div class="status">Set your criteria and run a search.</div>
        <form class="result-controls" hidden>
          <label>Filter results<input class="result-query" type="search" placeholder="School, city, or state" autocomplete="off" /></label>
          <label>Field of study<input class="program-filter" type="search" placeholder="e.g. Nursing, Computer Science" autocomplete="off" /></label>
          <label>Sort by<select class="result-sort"><option value="relevance" hidden>Relevance</option><option value="name-asc" selected>Name: A–Z</option><option value="distance-asc">Distance: nearest first</option><option value="enrollment-asc">Enrollment: low to high</option><option value="enrollment-desc">Enrollment: high to low</option><option value="net-price-asc">Net price: low to high</option><option value="admission-rate-desc">Admission rate: high to low</option></select></label>
          <button class="secondary clear-filters" type="button">Reset</button>
        </form>
        <div class="results-grid" aria-live="polite"></div>
      </section>`;
    const controls = /** @type {HTMLFormElement} */ (this.querySelector('.result-controls'));
    controls.addEventListener('submit', (event) => event.preventDefault());
    // Entering a field of study switches sorting to Relevance (popular-program
    // matches first); clearing it drops back to Name. Runs in the target phase,
    // before the form-level input handler below re-filters, so #update() sees it.
    this.querySelector('.program-filter')?.addEventListener('input', (event) => {
      const sort = /** @type {HTMLSelectElement} */ (this.querySelector('.result-sort'));
      const relevance = /** @type {HTMLOptionElement} */ (sort.querySelector('option[value="relevance"]'));
      const hasProgram = Boolean(/** @type {HTMLInputElement} */ (event.currentTarget).value.trim());
      relevance.hidden = !hasProgram;
      if (hasProgram) sort.value = 'relevance';
      else if (sort.value === 'relevance') sort.value = 'name-asc';
    });
    controls.addEventListener('input', () => this.#update());
    this.querySelector('.clear-filters')?.addEventListener('click', () => {
      this.#resetControls();
      this.#update();
    });
    this.querySelector('.export-button')?.addEventListener('click', () => this.#export());
  }

  set loading(value) {
    if (!value) return;
    const status = /** @type {HTMLElement} */ (this.querySelector('.status'));
    status.className = 'status loading';
    status.textContent = 'Querying College Scorecard…';
    this.#grid().innerHTML = '';
    this.#controls().hidden = true;
    this.#exportButton().hidden = true;
  }

  /** @param {string|null} value state abbreviation of the searched ZIP */
  set originState(value) {
    this.#originState = value ? value.toUpperCase() : null;
  }

  /** @param {MappedSchool[]} value */
  set results(value) {
    this.#allResults = [...value];
    this.#resetControls();
    this.#controls().hidden = value.length === 0;
    this.#update();
  }

  /** Reset filter/sort controls to their defaults and re-hide the Relevance sort. */
  #resetControls() {
    this.#controls().reset();
    const relevance = /** @type {HTMLOptionElement|null} */ (this.querySelector('.result-sort option[value="relevance"]'));
    if (relevance) relevance.hidden = true;
  }

  /** @param {string} message */
  setError(message) {
    this.#allResults = [];
    this.#currentResults = [];
    const status = /** @type {HTMLElement} */ (this.querySelector('.status'));
    status.className = 'status error';
    status.textContent = message;
    this.#grid().innerHTML = '';
    this.#controls().hidden = true;
    this.#exportButton().hidden = true;
  }

  /** @returns {HTMLFormElement} */
  #controls() {
    return /** @type {HTMLFormElement} */ (this.querySelector('.result-controls'));
  }

  /** @returns {HTMLElement} */
  #grid() {
    return /** @type {HTMLElement} */ (this.querySelector('.results-grid'));
  }

  /** @returns {HTMLButtonElement} */
  #exportButton() {
    return /** @type {HTMLButtonElement} */ (this.querySelector('.export-button'));
  }

  #update() {
    const query = /** @type {HTMLInputElement} */ (this.querySelector('.result-query')).value
      .trim()
      .toLocaleLowerCase();
    const program = /** @type {HTMLInputElement} */ (this.querySelector('.program-filter')).value
      .trim()
      .toLocaleLowerCase();
    const sort = /** @type {HTMLSelectElement} */ (this.querySelector('.result-sort')).value;
    const [field, direction] = sort.split('-');
    /** @type {Record<string, (school: MappedSchool) => number|undefined>} */
    const getters = {
      distance: (school) => school.location.distance,
      enrollment: (school) => school.enrollment.size,
      'net-price': (school) => school.cost.netPriceOverall,
      'admission-rate': (school) => school.admissions.admissionRate
    };
    const getter = getters[field];
    const results = this.#allResults
      .filter((school) => {
        const searchable = [school.name, school.location.city, school.location.state]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        return (
          (!query || searchable.includes(query)) &&
          (!program || school.academics.programs.some((p) => p.title?.toLocaleLowerCase().includes(program)))
        );
      })
      .sort((a, b) => {
        // Relevance: alphabetical, but schools offering the field as one of their
        // popular programs rank ahead of those that merely offer it.
        if (sort === 'relevance') {
          return (
            this.#popularProgramRank(a, program) - this.#popularProgramRank(b, program) ||
            a.name.localeCompare(b.name)
          );
        }
        return field === 'name'
          ? a.name.localeCompare(b.name)
          : compareNullable(getter?.(a), getter?.(b), direction === 'desc' ? -1 : 1) || a.name.localeCompare(b.name);
      });
    this.#render(results);
  }

  /**
   * Rank for relevance sorting: 0 when the queried field of study is one of the
   * school's popular programs (matched CIP program rolls up into a reported
   * popular-programs family), 1 otherwise.
   * @param {MappedSchool} school
   * @param {string} program lowercased field-of-study query
   * @returns {0 | 1}
   */
  #popularProgramRank(school, program) {
    if (!program) return 1;
    const popular = new Set(school.academics.topPrograms.map((entry) => entry.key));
    const isPopular = school.academics.programs.some(
      (p) => p.title?.toLocaleLowerCase().includes(program) && popular.has(programFamilyKey(p.code))
    );
    return isPopular ? 0 : 1;
  }

  /** @param {MappedSchool} school @returns {boolean} true when the school sits outside the searched ZIP's state */
  #isOutOfState(school) {
    return Boolean(this.#originState) && school.location.state?.toUpperCase() !== this.#originState;
  }

  /** @param {MappedSchool[]} results */
  #render(results) {
    this.#currentResults = results;
    this.#exportButton().hidden = results.length === 0;
    const status = /** @type {HTMLElement} */ (this.querySelector('.status'));
    status.className = 'status';
    status.textContent =
      results.length !== this.#allResults.length
        ? `${results.length} of ${this.#allResults.length} schools shown`
        : `${results.length} ${results.length === 1 ? 'school' : 'schools'} found`;
    const output = this.#grid();
    if (!results.length) {
      output.innerHTML = this.#allResults.length
        ? '<div class="empty"><strong>No schools match these filters.</strong><span>Change or reset the result filters to see more schools.</span></div>'
        : '<div class="empty"><strong>No matching colleges found.</strong><span>Try increasing the radius or maximum enrollment.</span></div>';
      return;
    }
    output.innerHTML = results.map((school, index) => this.#card(school, index)).join('');
  }

  /** @param {MappedSchool} school @param {number} index @returns {string} */
  #card(school, index) {
    const distance = school.location.distance == null ? 'Within radius' : `${Math.round(school.location.distance)} mi`;
    const locationClass = this.#isOutOfState(school) ? ' out-of-state' : '';
    const designationBadges = school.profile.designations
      .map((d) => `<span title="${escapeHtml(d.title)}">${escapeHtml(d.label)}</span>`)
      .join('');
    const groups = [
      profileGroup(school),
      locationGroup(school),
      enrollmentGroup(school),
      admissionsGroup(school),
      costGroup(school),
      academicsGroup(school),
      outcomesGroup(school),
      programsTable(school)
    ].join('');
    return `<article class="result-card${locationClass}"><div class="rank">${String(index + 1).padStart(2, '0')}</div><div class="school-info"><div class="badges"><span>${escapeHtml(distance)}</span><span>${escapeHtml(ownershipLabel(school.ownershipCode))}</span>${designationBadges}</div><h3>${escapeHtml(school.name)}</h3><p>${escapeHtml(school.location.city ?? '')}, ${escapeHtml(school.location.state ?? '')}</p></div><div class="enrollment"><strong>${escapeHtml(formatCount(school.enrollment.size))}</strong><span>undergrads</span></div><div class="card-links">${school.profile.website ? `<a href="${escapeHtml(school.profile.website)}" target="_blank" rel="noreferrer">Website ↗</a>` : ''}<a href="${escapeHtml(directionsUrl(school))}" target="_blank" rel="noreferrer">Directions ↗</a></div><details class="school-details"><summary>View all details</summary><div class="detail-grid">${groups}</div><p class="detail-note">${escapeHtml(LATEST_ALIAS_NOTE)}</p></details></article>`;
  }

  #export() {
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const header = [
      'Institution',
      'City',
      'State',
      'Undergraduates',
      'Approx. Distance (mi)',
      'Admission Rate',
      'In-State Tuition',
      'Out-of-State Tuition',
      'Total Cost of Attendance',
      'Average Net Price',
      'Pell Grant Rate',
      'Median Debt',
      'Completion Rate 4yr',
      'Retention Rate 4yr',
      '10-Year Median Earnings',
      'Website'
    ];
    const rows = [
      header,
      ...this.#currentResults.map((school) => [
        school.name,
        school.location.city,
        school.location.state,
        school.enrollment.size,
        school.location.distance?.toFixed(1),
        school.admissions.admissionRate,
        school.cost.tuitionInState,
        school.cost.tuitionOutOfState,
        school.cost.attendanceAcademicYear,
        school.cost.netPriceOverall,
        school.aid.pellRate,
        school.aid.medianDebtCompleters,
        school.outcomes.completion4yr150,
        school.outcomes.retentionFourYearFull,
        school.outcomes.earnings10yr,
        school.profile.website
      ])
    ];
    const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\n')], { type: 'text/csv' });
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'college-results.csv'
    });
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

customElements.define('college-results', CollegeResults);
