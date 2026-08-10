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
  fieldMatches,
  firstWordLabel,
  label,
  formatCurrency,
  formatCount,
  formatPercent,
  formatScore,
  formatRange,
  NOT_REPORTED
} from './scorecard-fields.js';

/** @typedef {import('./scorecard-fields.js').MappedSchool} MappedSchool */

const DIRECTIONS_ORIGIN = '45036';
const MAX_PROGRAM_ROWS = 15;
// localStorage key for the user's per-section collapse/expand choices.
const SECTION_STATE_KEY = 'college-section-states';
// localStorage key for the user's favorited schools (an array of school ids).
export const FAVORITES_KEY = 'college-favorites';
// Shared with search-form.js: the user's last-used ZIP.
const LAST_ZIP_KEY = 'college-last-zip';

/** @returns {string|null} the stored last-used ZIP, if a valid 5-digit one exists */
function storedZip() {
  try {
    const zip = localStorage.getItem(LAST_ZIP_KEY);
    return zip && /^\d{5}$/.test(zip) ? zip : null;
  } catch {
    return null;
  }
}

// Predominant-degree filter options: "Any" plus each coded degree, defaulting to
// bachelor's (code 3). Empty value means no degree restriction.
const PREDOMINANT_FILTER_OPTIONS =
  '<option value="">Any predominant degree</option>' +
  Object.entries(PREDOMINANT_DEGREE)
    .map(([code, name]) => `<option value="${code}"${code === '3' ? ' selected' : ''}>${name}</option>`)
    .join('');

/** Stable data-section key for a detail group, derived from its title. @param {string} title @returns {string} */
const sectionKey = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** @param {*} value @returns {string} */
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>'"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character
  );

const ownershipLabel = (code) => label(OWNERSHIP, code);

/** @param {boolean} favorited @returns {string} inner markup (the star glyph) for a favorite toggle */
const favoriteButtonInner = (favorited) =>
  `<span class="favorite-star" aria-hidden="true">${favorited ? '★' : '☆'}</span>`;

/** @param {MappedSchool} school @returns {string} a lat,lon pair or a human-readable address */
function directionsDestination(school) {
  const { lat, lon, city, state, zip } = school.location;
  return lat != null && lon != null ? `${lat},${lon}` : `${school.name}, ${city ?? ''}, ${state ?? ''} ${zip ?? ''}`;
}

/** @param {string} destination @param {string} origin @returns {string} */
function directionsUrl(destination, origin) {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', origin, destination, travelmode: 'driving' })}`;
}

/**
 * Render a labelled section as a native <details> disclosure. `items` are
 * [label, value] pairs; a value may be `{ html }` to inject already-safe markup
 * (links, ranges) instead of escaped text. Collapsed by default; the user's
 * choice is persisted and re-applied per section (see #applyStoredSectionStates).
 * @param {string} title
 * @param {Array<[string, string | { html: string }]>} items
 * @param {string} [source]
 * @param {boolean} [sorted] when true (default), rows are ordered alphabetically by label
 * @returns {string}
 */
function detailGroup(title, items, source, sorted = true) {
  const ordered = sorted ? items.slice().sort(([a], [b]) => a.localeCompare(b)) : items;
  const rows = ordered
    .map(([itemLabel, value]) => {
      const dd = typeof value === 'object' ? value.html : escapeHtml(value);
      return `<div><dt>${escapeHtml(itemLabel)}</dt><dd>${dd}</dd></div>`;
    })
    .join('');
  const caption = source ? `<p class="detail-source">Source: ${escapeHtml(source)}</p>` : '';
  return `<details class="detail-group detail-group-collapsible" data-section="${sectionKey(title)}"><summary><h4>${escapeHtml(title)}</h4></summary><dl>${rows}</dl>${caption}</details>`;
}

/** @param {string|undefined} url @param {string} text @returns {{ html: string }} */
function linkValue(url, text) {
  if (!url) return { html: escapeHtml(NOT_REPORTED) };
  return { html: `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(text)} ↗</a>` };
}

/**
 * Pull the residential descriptor out of a Carnegie size & setting label (only
 * four-year size-settings carry one). @param {string} sizeSetting @returns {string}
 */
function residentialCharacter(sizeSetting) {
  const l = sizeSetting.toLowerCase();
  if (l.includes('highly residential')) return 'Highly residential';
  if (l.includes('nonresidential')) return 'Primarily nonresidential';
  if (l.includes('residential')) return 'Primarily residential';
  return NOT_REPORTED;
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
      ['Setting (locale)', label(LOCALE, school.location.locale)],
      ['Residential character', residentialCharacter(label(CARNEGIE_SIZE_SETTING, p.carnegieSizeSetting))],
      ['Main campus', p.mainCampus === 1 ? 'Yes' : p.mainCampus === 0 ? 'No (branch)' : NOT_REPORTED],
      ['Branch campuses', formatCount(p.branches, { zeroOk: true })],
      ['Religious affiliation', label(RELIGIOUS_AFFILIATION, p.religiousAffiliation)]
    ],
    'IPEDS'
  );
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
    'IPEDS',
    false
  );
}

/** @param {MappedSchool} school @returns {string} */
function facultyGroup(school) {
  const f = school.faculty;
  const d = f.demographics;
  const index = diversityIndex(d);
  return detailGroup(
    'Faculty',
    [
      ['Students per faculty member', f.studentRatio == null ? NOT_REPORTED : `${Math.round(f.studentRatio)}:1`],
      ['Average faculty salary (monthly)', formatCurrency(f.salaryMonthly)],
      ['Faculty that are full-time', formatPercent(f.fullTimeRate)],
      ['Part-time/adjunct (approx.)', formatPercent(f.fullTimeRate == null ? null : 1 - f.fullTimeRate)],
      ['Faculty diversity', index == null ? NOT_REPORTED : `${ratingLabel(index)} (${Math.round(index * 100)}%)`],
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
    'IPEDS Human Resources; full-time nonmedical instructional staff',
    false
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
      ['Off-campus room & board', formatCurrency(c.roomBoardOffCampus)],
      ['On-campus other expenses', formatCurrency(c.otherExpenseOnCampus)],
      ['Off-campus other expenses', formatCurrency(c.otherExpenseOffCampus)],
      ['Other expenses (with family)', formatCurrency(c.otherExpenseWithFamily)],
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
      ['Est. monthly loan payment', formatCurrency(school.aid.medianDebtMonthly)],
      ['Net price calculator', linkValue(school.profile.netPriceCalculatorUrl, 'Calculator')]
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
    'IPEDS; earnings from U.S. Treasury; repayment from NSLDS; default rates from Federal Student Aid'
  );
}

// Which CREDENTIAL_LEVEL codes the fields-of-study table shows for each selected
// predominant degree. Selections not listed (Any, Not classified) show every level.
/** @type {Record<string, number[]>} */
const PREDOMINANT_TO_CREDENTIALS = {
  1: [1], // Predominantly certificates → undergraduate certificate/diploma
  2: [2], // Predominantly associate's → associate's degree
  3: [3], // Predominantly bachelor's → bachelor's degree
  4: [4, 5, 6, 7, 8] // Entirely graduate → post-bacc cert, master's, doctoral, first professional, grad cert
};

/**
 * Eligible fields of study, each annotated with its share of the school's total
 * awards. `allowedCredentials` (a Set of CREDENTIAL_LEVEL codes, or null for all)
 * limits which credential levels are counted and shown; shares are relative to
 * that set. Shared by the table display and the Relevance sort so they agree.
 * @param {MappedSchool} school
 * @param {Set<number>|null} [allowedCredentials]
 */
function programsWithShare(school, allowedCredentials = null) {
  const eligible = school.academics.programs.filter(
    (program) => !allowedCredentials || allowedCredentials.has(Number(program.credentialLevel))
  );
  const totalAwards = eligible.reduce((sum, program) => sum + (program.awards ?? 0), 0);
  return eligible.map((program) => ({
    ...program,
    share: program.awards != null && totalAwards > 0 ? program.awards / totalAwards : null
  }));
}

/** @param {MappedSchool} school @param {Set<number>|null} allowedCredentials @returns {string} */
function programsTable(school, allowedCredentials) {
  // Sorted by share so the biggest programs lead.
  const programs = programsWithShare(school, allowedCredentials).sort(
    (a, b) => compareNullable(a.share, b.share, -1) || String(a.title ?? '').localeCompare(String(b.title ?? ''))
  );
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
      return `<tr${overflow}><td>${escapeHtml(program.title ?? NOT_REPORTED)}</td><td>${escapeHtml(credential)}</td><td>${escapeHtml(program.share == null ? NOT_REPORTED : formatPercent(program.share))}</td><td>${escapeHtml(formatCount(program.awards, { zeroOk: true }))}</td><td>${escapeHtml(formatCurrency(program.earnings1yr))}</td><td>${escapeHtml(formatCurrency(program.medianDebt))}</td></tr>`;
    })
    .join('');
  let checkbox = '';
  let toggleLabels = '';
  if (total > MAX_PROGRAM_ROWS) {
    const toggleId = `programs-toggle-${escapeHtml(school.id)}`;
    checkbox = `<input type="checkbox" id="${toggleId}" class="program-toggle" hidden />`;
    toggleLabels = `<label class="program-toggle-label more" for="${toggleId}">Show all ${total} fields of study →</label><label class="program-toggle-label less" for="${toggleId}">Show fewer ↑</label>`;
  }
  return `<details class="detail-group detail-group-collapsible program-table" data-section="fields-of-study" open><summary><h4>Fields of study</h4></summary>${checkbox}<table><thead><tr><th>Program</th><th>Credential</th><th>% of degrees</th><th>Awards</th><th>Median earnings (1 yr)</th><th>Median debt</th></tr></thead><tbody>${rows}</tbody></table>${toggleLabels}<p class="detail-source">Sorted by share of degrees. Source: IPEDS</p></details>`;
}

function compareNullable(a, b, direction = 1) {
  const aMissing = a == null || Number.isNaN(a);
  const bMissing = b == null || Number.isNaN(b);
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
  return (a - b) * direction;
}

/**
 * Simpson diversity index (0–1) over reported race/ethnicity shares: the
 * probability that two randomly chosen members are from different groups. Shares
 * are normalized over the reported groups (unknown race excluded). Null when the
 * data is too sparse to rate. Works for either student or faculty demographics.
 * @param {MappedSchool['enrollment']['demographics']} demographics
 * @returns {number|null}
 */
function diversityIndex(demographics) {
  const d = demographics;
  const shares = [d.white, d.black, d.hispanic, d.asian, d.aian, d.nhpi, d.twoOrMore, d.nonResidentAlien].filter(
    (share) => typeof share === 'number'
  );
  const total = shares.reduce((sum, share) => sum + share, 0);
  // Need the reported groups to cover most of the population to be meaningful.
  if (shares.length < 2 || total < 0.5) return null;
  return 1 - shares.reduce((sum, share) => sum + (share / total) ** 2, 0);
}

/** @param {number} value 0–1 score @returns {string} High/Mid/Low label */
function ratingLabel(value) {
  if (value >= 0.6) return 'High';
  if (value >= 0.4) return 'Mid';
  return 'Low';
}

/** @param {number} rate 0–1 full-time faculty rate @returns {string} High/Mid/Low label */
function ftFacultyRating(rate) {
  if (rate >= 0.8) return 'High';
  if (rate >= 0.6) return 'Mid';
  return 'Low';
}

/** @param {MappedSchool} school @returns {string} High/Mid/Low; a missing score counts as Low */
function diversityRating(school) {
  const index = diversityIndex(school.enrollment.demographics);
  return index == null ? 'Low' : ratingLabel(index);
}

/** @param {number} rate 0–1 admission rate @returns {string} selectivity label (lower rate ⇒ more selective) */
function selectivityLabel(rate) {
  if (rate >= 1) return 'Open';
  if (rate <= 0.1) return 'Elite';
  if (rate <= 0.25) return 'V-high';
  if (rate <= 0.5) return 'High';
  if (rate <= 0.75) return 'Mid';
  return 'Low';
}

/** @param {MappedSchool} school @returns {string} a selectivity tile for the result card */
function selectivityTile(school) {
  const rate = school.admissions.admissionRate;
  // An explicit open-admissions policy is authoritative — a school can report a
  // sub-100% admission rate yet still admit all eligible applicants.
  if (school.profile.openAdmissionsPolicy === 1) {
    const title = `Open admissions — admits all eligible applicants${rate == null ? '' : ` (accepts ${formatPercent(rate)})`}`;
    return `<div class="selectivity" data-tip="${escapeHtml(title)}"><strong>Open</strong><span>selective</span></div>`;
  }
  if (rate == null)
    return `<div class="selectivity"><strong>${escapeHtml(NOT_REPORTED)}</strong><span>selective</span></div>`;
  const title = `Accepts ${formatPercent(rate)} of applicants`;
  return `<div class="selectivity" data-tip="${escapeHtml(title)}"><strong>${escapeHtml(selectivityLabel(rate))}</strong><span>selective</span></div>`;
}

/** @param {MappedSchool} school @returns {string} a diversity tile for the result card */
function diversityTile(school) {
  const index = diversityIndex(school.enrollment.demographics);
  const title =
    index == null
      ? 'No race/ethnicity data reported — treated as low diversity'
      : 'Diversity index — the chance two random students differ in race/ethnicity. Higher is more diverse.';
  const value = index == null ? NOT_REPORTED : `${Math.round(index * 100)}%`;
  return `<div class="diversity" data-tip="${escapeHtml(title)}"><strong>${escapeHtml(value)}</strong><span>diversity</span></div>`;
}

/** @param {MappedSchool} school @returns {string} a residential-character tile for the result card */
function residentialTile(school) {
  const descriptor = residentialCharacter(label(CARNEGIE_SIZE_SETTING, school.profile.carnegieSizeSetting));
  // Carnegie residential character reflects the share of undergraduates living on
  // campus (and attending full-time) — spell that out in the tooltip.
  const meta = {
    'Highly residential': {
      short: 'High',
      tip: 'Highly residential: at least half of undergraduates live on campus and most attend full-time — a traditional residential campus.'
    },
    'Primarily residential': {
      short: 'Mid',
      tip: 'Primarily residential: 25–49% of undergraduates live on campus, with at least half attending full-time.'
    },
    'Primarily nonresidential': {
      short: 'Non',
      tip: 'Primarily nonresidential: fewer than 25% of undergraduates live on campus — largely a commuter school.'
    }
  }[descriptor];
  if (!meta)
    return `<div class="residential"><strong>${escapeHtml(NOT_REPORTED)}</strong><span>residential</span></div>`;
  return `<div class="residential" data-tip="${escapeHtml(meta.tip)}"><strong>${escapeHtml(meta.short)}</strong><span>residential</span></div>`;
}

/** @param {MappedSchool} school @returns {string} a student-to-faculty ratio tile for the result card */
function facultyRatioTile(school) {
  const ratio = school.faculty.studentRatio;
  if (ratio == null)
    return `<div class="faculty-ratio"><strong>${escapeHtml(NOT_REPORTED)}</strong><span>teacher</span></div>`;
  return `<div class="faculty-ratio" data-tip="Student-to-faculty ratio: about 1 faculty member for every ${Math.round(ratio)} undergraduates."><strong>1:${Math.round(ratio)}</strong><span>teacher</span></div>`;
}

/** @param {MappedSchool} school @returns {string} a full-time faculty tile for the result card */
function facultyFtTile(school) {
  const rate = school.faculty.fullTimeRate;
  if (rate == null)
    return `<div class="faculty-ft"><strong>${escapeHtml(NOT_REPORTED)}</strong><span>FT faculty</span></div>`;
  return `<div class="faculty-ft" data-tip="Share of faculty employed full-time"><strong>${Math.round(rate * 100)}%</strong><span>FT faculty</span></div>`;
}

class CollegeResults extends HTMLElement {
  /** @type {MappedSchool[]} */
  #allResults = [];
  /** @type {MappedSchool[]} */
  #currentResults = [];
  /** @type {string|null} state abbreviation of the searched ZIP; schools in it render highlighted (in-state) */
  #originState = null;
  /** @type {boolean} hide the distance badge and distance sort (e.g. for name searches with no origin) */
  #hideDistance = false;
  /** @type {boolean} hide the filter/sort controls entirely and show every result unfiltered (e.g. name & favorites pages) */
  #hideControls = false;
  /** @type {string[]} fields of study from the search, used to rank the Relevance sort */
  #relevanceTerms = [];
  /** @type {Set<string>} upper-cased state abbreviations to exclude from the results */
  #excludedStates = new Set();
  /** @type {Set<string>} school ids the user has favorited; loaded from and persisted to localStorage */
  #favorites = new Set();
  /** @type {string|null} overrides the default "no results at all" empty message (e.g. the favorites page) */
  #emptyMessage = null;
  /**
   * Loads one school's full record on demand (when its "View all details" is
   * expanded). Set by the host page; when null, detail groups can't be fetched.
   * @type {((id: string) => Promise<MappedSchool>) | null}
   */
  detailLoader = null;
  /** @type {Map<string, MappedSchool>} full records fetched for expanded cards, keyed by id (survives re-renders) */
  #detailCache = new Map();

  connectedCallback() {
    this.innerHTML = `
      <section class="results-section" aria-labelledby="results-title">
        <div class="section-heading results-heading"><div><h2 id="results-title">Results</h2></div><div class="results-actions"><button class="secondary print-button" type="button" hidden>Print</button><button class="secondary export-button" type="button" hidden>Export CSV</button></div></div>
        <div class="status">Set your criteria and run a search.</div>
        <form class="result-controls" hidden>
          <label>Filter results<input class="result-query" type="search" placeholder="School or city" autocomplete="off" /></label>
          <label>Predominant degree<select class="predominant-filter">${PREDOMINANT_FILTER_OPTIONS}</select></label>
          <label>Sort by<select class="result-sort"><option value="admission-rate-desc">Admission rate: high to low</option><option value="distance-asc">Distance: nearest first</option><option value="enrollment-desc">Enrollment: high to low</option><option value="enrollment-asc">Enrollment: low to high</option><option value="name-asc">Name: A–Z</option><option value="net-price-asc">Net price: low to high</option><option value="relevance" selected>Relevance</option><option value="ratio-desc">Student-to-faculty ratio: high to low</option></select></label>
          <label class="religion-field" hidden>Religious affiliation<details class="religion-filter">
            <summary><span class="religion-summary">All</span></summary>
            <div class="religion-panel"></div>
          </details></label>
          <div class="attr-exclude">
            <span class="attr-exclude-label">Hide</span>
            <label class="attr-chip"><input type="checkbox" class="hide-nonresidential" checked />Non-residential</label>
            <label class="attr-chip"><input type="checkbox" class="hide-low-diversity" checked />Low diversity</label>
            <label class="attr-chip"><input type="checkbox" class="hide-low-ft" checked />Low FT faculty</label>
            <label class="attr-chip"><input type="checkbox" class="hide-noncoed" checked />Non-coed</label>
          </div>
          <div class="controls-footer">
            <div class="state-exclude" hidden></div>
            <button class="secondary clear-filters" type="button">Reset</button>
          </div>
        </form>
        <div class="results-grid" aria-live="polite"></div>
      </section>`;
    this.#favorites = this.#loadFavorites();
    const controls = /** @type {HTMLFormElement} */ (this.querySelector('.result-controls'));
    controls.addEventListener('submit', (event) => event.preventDefault());
    controls.addEventListener('input', () => this.#update());
    // Religious-affiliation multi-select: enforce the All/None/Only exclusivity
    // and refresh the summary label, then re-filter.
    this.querySelector('.religion-panel')?.addEventListener('change', (event) => this.#handleReligionChange(event));
    // Close the affiliation dropdown when clicking anywhere outside it.
    document.addEventListener('click', (event) => {
      const details = /** @type {HTMLDetailsElement|null} */ (this.querySelector('.religion-filter'));
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    });
    // Exclude-states checkboxes live outside the controls form.
    this.querySelector('.state-exclude')?.addEventListener('change', () => {
      const checked = this.querySelectorAll('.state-exclude input:checked');
      this.#excludedStates = new Set([...checked].map((box) => /** @type {HTMLInputElement} */ (box).value));
      this.#update();
    });
    this.querySelector('.clear-filters')?.addEventListener('click', () => {
      this.#resetControls();
      this.#update();
    });
    this.querySelector('.export-button')?.addEventListener('click', () => this.#export());
    this.querySelector('.print-button')?.addEventListener('click', () => window.print());
    // Directions links have no origin on a name search; prompt for a ZIP on click.
    this.#grid().addEventListener('click', (event) => this.#handleDirectionsClick(event));
    // Favorite (star) toggles, delegated from the grid.
    this.#grid().addEventListener('click', (event) => this.#handleFavoriteClick(event));
    // Retry button shown when a card's detail fetch fails.
    this.#grid().addEventListener('click', (event) => this.#handleDetailRetry(event));
    // Persist each section's collapse/expand choice. `toggle` doesn't bubble, so
    // listen in the capture phase to catch it from any card's <details>.
    this.#grid().addEventListener('toggle', (event) => this.#handleSectionToggle(event), true);
    // Lazily fetch and render a card's detail groups the first time its
    // "View all details" disclosure is opened.
    this.#grid().addEventListener('toggle', (event) => this.#handleDetailsExpand(event), true);
  }

  /**
   * When a detail section is toggled, remember the choice and mirror it onto the
   * same section in every other result card.
   * @param {Event} event
   */
  #handleSectionToggle(event) {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.dataset.section) return;
    const section = details.dataset.section;
    const open = details.open;
    const states = this.#sectionStates();
    if (states[section] === open) return; // already in sync (e.g. programmatic set) — avoid re-work
    states[section] = open;
    this.#saveSectionStates(states);
    this.#grid()
      .querySelectorAll(`details[data-section="${section}"]`)
      .forEach((el) => {
        const other = /** @type {HTMLDetailsElement} */ (el);
        if (other !== details && other.open !== open) other.open = open;
      });
  }

  /**
   * On first open of a card's "View all details", fetch and render its detail
   * groups. Ignores the inner section toggles (those carry a data-section, this
   * fires only for the outer .school-details) and any re-open once loaded.
   * @param {Event} event
   */
  #handleDetailsExpand(event) {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.matches('.school-details') || !details.open) return;
    if (details.dataset.loaded === 'true' || details.dataset.loading === 'true') return;
    this.#loadDetails(details);
  }

  /**
   * Fetch (or reuse a cached) full record for a card and render its detail
   * groups. Cache hits render synchronously; misses show a placeholder while the
   * host page's detailLoader runs, and a retryable message on failure.
   * @param {HTMLDetailsElement} details
   */
  async #loadDetails(details) {
    const id = details.dataset.id;
    const grid = /** @type {HTMLElement|null} */ (details.querySelector('.detail-grid'));
    if (!grid) return;
    if (!id || !this.detailLoader) {
      grid.innerHTML = '<p class="detail-status detail-error">Details are unavailable.</p>';
      return;
    }
    const cached = this.#detailCache.get(id);
    if (cached) {
      grid.innerHTML = this.#detailGroupsHtml(cached, this.#allowedCredentials());
      details.dataset.loaded = 'true';
      this.#applyStoredSectionStates(grid);
      return;
    }
    details.dataset.loading = 'true';
    grid.innerHTML = '<p class="detail-status">Loading details…</p>';
    try {
      const school = await this.detailLoader(id);
      this.#detailCache.set(id, school);
      grid.innerHTML = this.#detailGroupsHtml(school, this.#allowedCredentials());
      details.dataset.loaded = 'true';
      this.#applyStoredSectionStates(grid);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load details.';
      grid.innerHTML = `<p class="detail-status detail-error">${escapeHtml(message)}</p><button type="button" class="secondary detail-retry">Retry</button>`;
      // Leave `loaded` unset so re-opening or Retry attempts the fetch again.
    } finally {
      delete details.dataset.loading;
    }
  }

  /** @param {MouseEvent} event retry the detail fetch when the in-card Retry button is clicked */
  #handleDetailRetry(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('.detail-retry');
    if (!button) return;
    const details = button.closest('.school-details');
    if (details instanceof HTMLDetailsElement) this.#loadDetails(details);
  }

  /** @returns {Record<string, boolean>} */
  #sectionStates() {
    try {
      return JSON.parse(localStorage.getItem(SECTION_STATE_KEY) ?? '{}') ?? {};
    } catch {
      return {};
    }
  }

  /** @param {Record<string, boolean>} states */
  #saveSectionStates(states) {
    try {
      localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(states));
    } catch {
      // Storage unavailable (private mode / quota) — the choice just won't persist.
    }
  }

  /**
   * Override each rendered section's default open state with the user's stored
   * choice. Scoped to `root` (defaults to the whole grid) so it can be re-run for
   * a single card after its detail groups are lazily injected.
   * @param {ParentNode} [root]
   */
  #applyStoredSectionStates(root = this.#grid()) {
    const states = this.#sectionStates();
    root.querySelectorAll('details[data-section]').forEach((el) => {
      const details = /** @type {HTMLDetailsElement} */ (el);
      const key = details.dataset.section;
      if (key && key in states) details.open = states[key];
    });
  }

  /** @returns {Set<string>} the persisted favorite school ids */
  #loadFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
      return new Set(Array.isArray(stored) ? stored.map(String) : []);
    } catch {
      return new Set();
    }
  }

  #saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...this.#favorites]));
    } catch {
      // Storage unavailable (private mode / quota) — favorites just won't persist.
    }
  }

  /**
   * Toggle a card's favorite state. Persists immediately, then updates the
   * button in place to avoid re-rendering the grid.
   * @param {MouseEvent} event
   */
  #handleFavoriteClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('.favorite-toggle');
    if (!(button instanceof HTMLElement)) return;
    const id = button.dataset.id;
    if (!id) return;
    const favorited = !this.#favorites.has(id);
    if (favorited) this.#favorites.add(id);
    else this.#favorites.delete(id);
    this.#saveFavorites();
    button.classList.toggle('is-favorite', favorited);
    button.setAttribute('aria-pressed', String(favorited));
    const buttonLabel = favorited ? 'Remove from favorites' : 'Save to favorites';
    button.dataset.tip = buttonLabel;
    button.setAttribute('aria-label', buttonLabel);
    button.innerHTML = favoriteButtonInner(favorited);
  }

  /** @param {MouseEvent} event */
  #handleDirectionsClick(event) {
    const link = /** @type {HTMLElement} */ (event.target).closest('.directions-link');
    if (!(link instanceof HTMLElement)) return;
    event.preventDefault();
    // Reuse the user's stored ZIP; only prompt when there is none saved.
    const origin = storedZip() ?? this.#promptForOrigin();
    if (!origin) return;
    window.open(directionsUrl(link.dataset.destination ?? '', origin), '_blank', 'noopener');
  }

  /** Ask for a 5-digit ZIP to route directions from, saving it for next time. @returns {string|null} */
  #promptForOrigin() {
    const zip = window.prompt('Enter your ZIP code to get directions from:');
    if (zip == null) return null;
    const trimmed = zip.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      window.alert('Please enter a valid 5-digit ZIP code.');
      return null;
    }
    try {
      localStorage.setItem(LAST_ZIP_KEY, trimmed);
    } catch {
      // localStorage unavailable — the ZIP just won't persist.
    }
    return trimmed;
  }

  set loading(value) {
    if (!value) return;
    const status = /** @type {HTMLElement} */ (this.querySelector('.status'));
    status.className = 'status loading';
    status.textContent = 'Querying College Scorecard…';
    this.#grid().innerHTML = '';
    this.#controls().hidden = true;
    /** @type {HTMLElement} */ (this.querySelector('.state-exclude')).hidden = true;
    this.#exportButton().hidden = true;
    this.#printButton().hidden = true;
  }

  /**
   * Override the message shown when there are no results at all (as opposed to
   * results hidden by filters). Used by the favorites page for a friendlier
   * "you haven't saved anything yet" prompt.
   * @param {string|null} value
   */
  set emptyMessage(value) {
    this.#emptyMessage = value ? String(value) : null;
  }

  /** @param {string|null} value state abbreviation of the searched ZIP */
  set originState(value) {
    this.#originState = value ? value.toUpperCase() : null;
  }

  /** @param {boolean} value when true, omit the per-card distance badge and the distance/relevance sorts */
  set hideDistance(value) {
    this.#hideDistance = Boolean(value);
    const sort = /** @type {HTMLSelectElement} */ (this.querySelector('.result-sort'));
    // Relevance (ranks by field of study + distance) and Distance both need an
    // origin/search term the name-search page lacks — hide them and fall back to name.
    for (const value of ['relevance', 'distance-asc']) {
      const option = /** @type {HTMLOptionElement|null} */ (sort.querySelector(`option[value="${value}"]`));
      if (option) option.hidden = this.#hideDistance;
    }
    if (this.#hideDistance && (sort.value === 'relevance' || sort.value === 'distance-asc')) sort.value = 'name-asc';
    // A name search matches regardless of degree type, so default to no restriction.
    if (this.#hideDistance) {
      const predominant = /** @type {HTMLSelectElement|null} */ (this.querySelector('.predominant-filter'));
      if (predominant) predominant.value = '';
    }
  }

  /**
   * When true, hide the filter/sort controls (and the state/affiliation choosers)
   * and show every result unfiltered — used by the name and favorites pages,
   * where filtering the list would be surprising.
   * @param {boolean} value
   */
  set hideControls(value) {
    this.#hideControls = Boolean(value);
    this.#controls().hidden = this.#hideControls || this.#allResults.length === 0;
    if (this.#hideControls) {
      /** @type {HTMLElement} */ (this.querySelector('.state-exclude')).hidden = true;
    }
  }

  /**
   * Fields of study from the search; the Relevance sort ranks schools by how many
   * of them they offer, then by combined share. Set before `results` so the first
   * sort sees it.
   * @param {string[]} value
   */
  set relevanceTerms(value) {
    this.#relevanceTerms = (Array.isArray(value) ? value : []).map(String).filter(Boolean);
  }

  /**
   * Credential levels the fields-of-study table shows, based on the predominant
   * degree filter. Null means show every level (e.g. "Any predominant degree").
   * @returns {Set<number>|null}
   */
  #allowedCredentials() {
    const predominant = /** @type {HTMLSelectElement} */ (this.querySelector('.predominant-filter')).value;
    const levels = PREDOMINANT_TO_CREDENTIALS[predominant];
    return levels ? new Set(levels) : null;
  }

  /**
   * Largest share of degrees among a school's programs matching one selected field
   * of study. Null when no program matches.
   * @param {MappedSchool} school
   * @param {string} term a selected program title
   * @param {Set<number>|null} allowedCredentials
   * @returns {number|null}
   */
  #termShare(school, term, allowedCredentials) {
    let max = -1;
    for (const program of programsWithShare(school, allowedCredentials)) {
      if (fieldMatches(program.title, term)) max = Math.max(max, program.share ?? 0);
    }
    return max < 0 ? null : max;
  }

  /**
   * Relevance score for sorting: how many of the selected fields of study a school
   * offers (`count`) and their combined share (`share`). Schools offering more of
   * the chosen programs rank first, then those with a larger combined share.
   * @param {MappedSchool} school
   * @param {Set<number>|null} allowedCredentials
   * @returns {{ count: number, share: number }}
   */
  #relevanceScore(school, allowedCredentials) {
    let count = 0;
    let share = 0;
    for (const term of this.#relevanceTerms) {
      const termShare = this.#termShare(school, term, allowedCredentials);
      if (termShare != null) {
        count += 1;
        share += termShare;
      }
    }
    return { count, share };
  }

  /**
   * One tile per selected field of study, each showing that program's share of a
   * school's degrees. Empty string when nothing was searched (e.g. name-search).
   * @param {MappedSchool} school
   * @param {Set<number>|null} allowedCredentials
   * @returns {string}
   */
  #fieldShareTiles(school, allowedCredentials) {
    return this.#relevanceTerms
      .map((term) => {
        const share = this.#termShare(school, term, allowedCredentials);
        const value = share == null ? NOT_REPORTED : `${Math.round(share * 100)}%`;
        // The tile is narrow, so show just the program's first word; the full name
        // stays in the tooltip.
        return `<div class="field-share" data-tip="Share of degrees in ${escapeHtml(term)}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(firstWordLabel(term))}</span></div>`;
      })
      .join('');
  }

  /** @param {MappedSchool[]} value */
  set results(value) {
    this.#allResults = [...value];
    this.#resetControls();
    if (!this.#hideControls) {
      this.#renderStateChips();
      this.#renderReligionOptions();
    }
    this.#controls().hidden = this.#hideControls || value.length === 0;
    this.#update();
  }

  /** Reset filter/sort controls to their defaults. */
  #resetControls() {
    this.#controls().reset();
    // form.reset() restores each affiliation checkbox to its default (All checked).
    this.#updateReligionSummary();
    // Restore the state-exclude default: all states except the user's own checked
    // (see #renderStateChips). When called before the chips exist (initial results
    // load), there are no boxes yet and #renderStateChips sets this up instead.
    const origin = this.#originState;
    const boxes = /** @type {HTMLInputElement[]} */ ([...this.querySelectorAll('.state-exclude input')]);
    const defaultToOrigin = Boolean(origin) && boxes.some((box) => box.value === origin);
    boxes.forEach((box) => {
      box.checked = defaultToOrigin && box.value !== origin;
    });
    this.#excludedStates = new Set(boxes.filter((box) => box.checked).map((box) => box.value));
    // On the name-search page, relevance/distance sorts and degree restrictions don't apply.
    if (this.#hideDistance) {
      const sort = /** @type {HTMLSelectElement} */ (this.querySelector('.result-sort'));
      if (sort.value === 'relevance' || sort.value === 'distance-asc') sort.value = 'name-asc';
      /** @type {HTMLSelectElement} */ (this.querySelector('.predominant-filter')).value = '';
    }
  }

  /** Build one "exclude" checkbox per state present in the results (hidden when only one). */
  #renderStateChips() {
    const container = /** @type {HTMLElement} */ (this.querySelector('.state-exclude'));
    const states = [
      ...new Set(
        this.#allResults
          .map((school) => school.location.state)
          .filter(Boolean)
          .map((s) => String(s).toUpperCase())
      )
    ].sort();
    if (states.length <= 1) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    container.hidden = false;
    // Default to excluding every state except the user's own — but only when that
    // state is actually among the results; otherwise excluding all others would
    // leave nothing, so fall back to excluding none.
    const origin = this.#originState;
    const defaultToOrigin = Boolean(origin) && states.includes(/** @type {string} */ (origin));
    container.innerHTML =
      '<span class="state-exclude-label">Exclude states</span>' +
      states
        .map(
          (state) =>
            `<label class="state-chip"><input type="checkbox" value="${escapeHtml(state)}"${defaultToOrigin && state !== origin ? ' checked' : ''} />${escapeHtml(state)}</label>`
        )
        .join('');
    this.#excludedStates = new Set(defaultToOrigin ? states.filter((state) => state !== origin) : []);
  }

  /**
   * Build the religious-affiliation multi-select from the affiliations present in
   * the current results. Three meta options lead: All (no filter, default), None
   * (secular only), and Any religious; each distinct affiliation follows. Hidden
   * when no result reports a known affiliation.
   */
  #renderReligionOptions() {
    const field = /** @type {HTMLElement} */ (this.querySelector('.religion-field'));
    const details = /** @type {HTMLDetailsElement} */ (this.querySelector('.religion-filter'));
    const panel = /** @type {HTMLElement} */ (this.querySelector('.religion-panel'));
    const codes = [
      ...new Set(
        this.#allResults
          .map((school) => school.profile.religiousAffiliation)
          .filter((code) => code != null && label(RELIGIOUS_AFFILIATION, code) !== NOT_REPORTED)
          .map(String)
      )
    ].sort((a, b) => label(RELIGIOUS_AFFILIATION, a).localeCompare(label(RELIGIOUS_AFFILIATION, b)));
    details.open = false;
    if (!codes.length) {
      field.hidden = true;
      panel.innerHTML = '';
      return;
    }
    field.hidden = false;
    const option = (value, text, checked) =>
      `<label class="religion-option"><input type="checkbox" class="religion-check" value="${escapeHtml(value)}"${checked ? ' checked' : ''} />${escapeHtml(text)}</label>`;
    panel.innerHTML =
      option('all', 'All', true) +
      option('none', 'None (secular)', false) +
      option('only', 'Any religious', false) +
      codes.map((code) => option(code, label(RELIGIOUS_AFFILIATION, code), false)).join('');
    this.#updateReligionSummary();
  }

  /**
   * Keep the affiliation checkboxes coherent: checking "All" clears the rest;
   * checking anything else clears "All"; clearing everything falls back to "All".
   * @param {Event} event
   */
  #handleReligionChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains('religion-check')) return;
    const checks = /** @type {HTMLInputElement[]} */ ([...this.querySelectorAll('.religion-check')]);
    const all = checks.find((box) => box.value === 'all');
    if (target.value === 'all' && target.checked) {
      checks.forEach((box) => {
        if (box !== all) box.checked = false;
      });
    } else if (target.value !== 'all' && target.checked && all) {
      all.checked = false;
    }
    if (!checks.some((box) => box.checked) && all) all.checked = true;
    this.#updateReligionSummary();
    this.#update();
  }

  /** Reflect the current affiliation selection in the dropdown's summary label. */
  #updateReligionSummary() {
    const summary = /** @type {HTMLElement|null} */ (this.querySelector('.religion-summary'));
    if (!summary) return;
    const checks = /** @type {HTMLInputElement[]} */ ([...this.querySelectorAll('.religion-check:checked')]);
    if (!checks.length || checks.some((box) => box.value === 'all')) {
      summary.textContent = 'All';
    } else if (checks.length === 1) {
      summary.textContent = (checks[0].parentElement?.textContent ?? '').trim() || '1 selected';
    } else {
      summary.textContent = `${checks.length} selected`;
    }
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
    /** @type {HTMLElement} */ (this.querySelector('.state-exclude')).hidden = true;
    this.#exportButton().hidden = true;
    this.#printButton().hidden = true;
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

  /** @returns {HTMLButtonElement} */
  #printButton() {
    return /** @type {HTMLButtonElement} */ (this.querySelector('.print-button'));
  }

  #update() {
    // With the controls hidden (name & favorites pages), skip filtering/sorting
    // and render results as given — the list is already the set the user wants.
    if (this.#hideControls) {
      this.#render(this.#allResults, this.#allowedCredentials());
      return;
    }
    const query = /** @type {HTMLInputElement} */ (this.querySelector('.result-query')).value
      .trim()
      .toLocaleLowerCase();
    const predominant = /** @type {HTMLSelectElement} */ (this.querySelector('.predominant-filter')).value;
    const allowed = this.#allowedCredentials();
    const hideNonResidential = /** @type {HTMLInputElement} */ (this.querySelector('.hide-nonresidential')).checked;
    const hideLowDiversity = /** @type {HTMLInputElement} */ (this.querySelector('.hide-low-diversity')).checked;
    const hideLowFt = /** @type {HTMLInputElement} */ (this.querySelector('.hide-low-ft')).checked;
    const hideNonCoed = /** @type {HTMLInputElement} */ (this.querySelector('.hide-noncoed')).checked;
    // Religious-affiliation selection. "All" (or nothing) means no restriction;
    // otherwise a school passes if it matches any chosen option (union).
    const religion = /** @type {HTMLInputElement[]} */ ([...this.querySelectorAll('.religion-check:checked')]).map(
      (box) => box.value
    );
    const religionAll = religion.length === 0 || religion.includes('all');
    const religionNone = religion.includes('none');
    const religionOnly = religion.includes('only');
    const religionCodes = new Set(religion.filter((value) => value !== 'all' && value !== 'none' && value !== 'only'));
    const sort = /** @type {HTMLSelectElement} */ (this.querySelector('.result-sort')).value;
    // Split on the last hyphen only: field names can themselves contain hyphens
    // (e.g. "net-price-asc" → field "net-price", direction "asc").
    const lastHyphen = sort.lastIndexOf('-');
    const field = lastHyphen === -1 ? sort : sort.slice(0, lastHyphen);
    const direction = lastHyphen === -1 ? '' : sort.slice(lastHyphen + 1);
    /** @type {Record<string, (school: MappedSchool) => number|undefined>} */
    const getters = {
      distance: (school) => school.location.distance,
      enrollment: (school) => school.enrollment.size,
      'net-price': (school) => school.cost.netPriceOverall,
      'admission-rate': (school) => school.admissions.admissionRate,
      ratio: (school) => school.faculty.studentRatio
    };
    const getter = getters[field];
    const results = this.#allResults
      .filter((school) => {
        const searchable = [school.name, school.location.city].filter(Boolean).join(' ').toLocaleLowerCase();
        const ftRate = school.faculty.fullTimeRate;
        const isNonResidential =
          residentialCharacter(label(CARNEGIE_SIZE_SETTING, school.profile.carnegieSizeSetting)) ===
          'Primarily nonresidential';
        const isSingleSex = school.profile.menOnly || school.profile.womenOnly;
        const affiliation = school.profile.religiousAffiliation;
        const hasAffiliation = affiliation != null && label(RELIGIOUS_AFFILIATION, affiliation) !== NOT_REPORTED;
        const religionPass =
          religionAll ||
          (religionNone && !hasAffiliation) ||
          (religionOnly && hasAffiliation) ||
          (hasAffiliation && religionCodes.has(String(affiliation)));
        return (
          (!query || searchable.includes(query)) &&
          (!predominant || Number(school.profile.predominantDegree) === Number(predominant)) &&
          !this.#excludedStates.has((school.location.state ?? '').toUpperCase()) &&
          !(hideNonResidential && isNonResidential) &&
          // A missing diversity score counts as Low (see diversityRating).
          !(hideLowDiversity && diversityRating(school) === 'Low') &&
          !(hideLowFt && ftRate != null && ftFacultyRating(ftRate) === 'Low') &&
          !(hideNonCoed && isSingleSex) &&
          religionPass
        );
      })
      .sort((a, b) => {
        // Relevance: schools offering more of the selected fields of study first,
        // then by combined share, then nearest first. With no fields of study
        // selected, both scores are zero and it reduces to nearest first.
        if (sort === 'relevance') {
          const aScore = this.#relevanceScore(a, allowed);
          const bScore = this.#relevanceScore(b, allowed);
          return (
            bScore.count - aScore.count ||
            bScore.share - aScore.share ||
            compareNullable(a.location.distance, b.location.distance, 1) ||
            a.name.localeCompare(b.name)
          );
        }
        return field === 'name'
          ? a.name.localeCompare(b.name)
          : compareNullable(getter?.(a), getter?.(b), direction === 'desc' ? -1 : 1) || a.name.localeCompare(b.name);
      });
    this.#render(results, allowed);
  }

  /** @param {MappedSchool} school @returns {boolean} true when the school sits outside the searched ZIP's state */
  #isOutOfState(school) {
    return Boolean(this.#originState) && school.location.state?.toUpperCase() !== this.#originState;
  }

  /** @param {MappedSchool[]} results @param {Set<number>|null} allowedCredentials */
  #render(results, allowedCredentials) {
    this.#currentResults = results;
    this.#exportButton().hidden = results.length === 0;
    this.#printButton().hidden = results.length === 0;
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
        : this.#emptyMessage
          ? `<div class="empty"><strong>${escapeHtml(this.#emptyMessage)}</strong></div>`
          : '<div class="empty"><strong>No matching colleges found.</strong><span>Try increasing the radius or maximum enrollment.</span></div>';
      return;
    }
    output.innerHTML = results.map((school, index) => this.#card(school, index, allowedCredentials)).join('');
    this.#applyStoredSectionStates();
  }

  /**
   * The inner markup for a card's "View all details" disclosure — every detail
   * group plus the programs table and the data-source note. Built from a fully
   * fetched record, so it's produced lazily on expand rather than at list render.
   * @param {MappedSchool} school
   * @param {Set<number>|null} allowedCredentials
   * @returns {string}
   */
  #detailGroupsHtml(school, allowedCredentials) {
    return (
      [
        profileGroup(school),
        enrollmentGroup(school),
        facultyGroup(school),
        admissionsGroup(school),
        costGroup(school),
        outcomesGroup(school),
        programsTable(school, allowedCredentials)
      ].join('') + `<p class="detail-note">${escapeHtml(LATEST_ALIAS_NOTE)}</p>`
    );
  }

  /** @param {MappedSchool} school @param {number} index @param {Set<number>|null} allowedCredentials @returns {string} */
  #card(school, index, allowedCredentials) {
    const distanceBadge = this.#hideDistance
      ? ''
      : `<span>${escapeHtml(school.location.distance == null ? 'Within radius' : `${Math.round(school.location.distance)} mi`)}</span>`;
    // Highlight in-state schools; out-of-state and name-search cards stay neutral.
    const locationClass = this.#originState && !this.#isOutOfState(school) ? ' in-state' : '';
    const designationBadges = school.profile.designations
      .map(
        (d) =>
          `<span data-tip="${escapeHtml(d.title)}" aria-label="${escapeHtml(d.title)}">${escapeHtml(d.label)}</span>`
      )
      .join('');
    const favorited = school.id != null && this.#favorites.has(String(school.id));
    const favoriteButton =
      school.id == null
        ? ''
        : `<button type="button" class="favorite-toggle${favorited ? ' is-favorite' : ''}" data-id="${escapeHtml(String(school.id))}" aria-pressed="${favorited}" data-tip="${favorited ? 'Remove from favorites' : 'Save to favorites'}" aria-label="${favorited ? 'Remove from favorites' : 'Save to favorites'}">${favoriteButtonInner(favorited)}</button>`;
    const destination = directionsDestination(school);
    // With no search origin (name search), defer the origin to a click-time ZIP prompt.
    const directionsLink = this.#hideDistance
      ? `<a href="#" class="directions-link" data-destination="${escapeHtml(destination)}">Directions ↗</a>`
      : `<a href="${escapeHtml(directionsUrl(destination, DIRECTIONS_ORIGIN))}" target="_blank" rel="noreferrer">Directions ↗</a>`;
    // Website sits above the tiles, Directions below — flanking the metric tiles.
    const websiteLink = school.profile.website
      ? `<a href="${escapeHtml(school.profile.website)}" target="_blank" rel="noreferrer">Website ↗</a>`
      : '';
    return `<article class="result-card${locationClass}"><div class="rank-col"><div class="rank">${String(index + 1).padStart(2, '0')}</div>${favoriteButton}</div><div class="school-info"><div class="badges">${distanceBadge}<span>${escapeHtml(ownershipLabel(school.ownershipCode))}</span>${designationBadges}</div><h3>${escapeHtml(school.name)}</h3><p>${escapeHtml(school.location.city ?? '')}, ${escapeHtml(school.location.state ?? '')}</p></div>
    <div class="metrics-col">
    <div class="metrics-col-links">
    ${websiteLink}
    ${directionsLink}
    </div>
    <div class="metrics">
    ${this.#fieldShareTiles(school, allowedCredentials)}
    ${selectivityTile(school)}
    ${diversityTile(school)}
    <div class="enrollment">
      <strong>${escapeHtml(formatCount(school.enrollment.size))}</strong><span>undergrads</span>
    </div>
    ${residentialTile(school)}
    ${facultyRatioTile(school)}
    ${facultyFtTile(school)}
    </div>
    </div>
    <details class="school-details"${school.id == null ? '' : ` data-id="${escapeHtml(String(school.id))}"`}>
    <summary>View all details</summary>
    <div class="detail-grid"></div>
    </details>
    </article>`;
  }

  #export() {
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const allowed = this.#allowedCredentials();
    // One column per selected field of study, mirroring the card's field tiles.
    /** @type {Array<[string, (school: MappedSchool) => *]>} */
    const fieldColumns = this.#relevanceTerms.map((term) => [
      `${term} (% of degrees)`,
      (school) => {
        const share = this.#termShare(school, term, allowed);
        return share == null ? '' : Math.round(share * 100);
      }
    ]);
    // Columns mirror the card's school-info and metric tiles.
    /** @type {Array<[string, (school: MappedSchool) => *]>} */
    const columns = [
      ['Institution', (school) => school.name],
      ['City', (school) => school.location.city],
      ['State', (school) => school.location.state],
      ['Distance (mi)', (school) => (school.location.distance == null ? '' : Math.round(school.location.distance))],
      ['Ownership', (school) => ownershipLabel(school.ownershipCode)],
      ...fieldColumns,
      [
        'Selectivity',
        (school) =>
          school.profile.openAdmissionsPolicy === 1
            ? 'Open'
            : school.admissions.admissionRate == null
              ? ''
              : selectivityLabel(school.admissions.admissionRate)
      ],
      ['Diversity', (school) => diversityRating(school)],
      ['Undergraduates', (school) => school.enrollment.size],
      [
        'Residential character',
        (school) => {
          const descriptor = residentialCharacter(label(CARNEGIE_SIZE_SETTING, school.profile.carnegieSizeSetting));
          return descriptor === NOT_REPORTED ? '' : descriptor;
        }
      ],
      [
        'Students per faculty',
        (school) => (school.faculty.studentRatio == null ? '' : `1:${Math.round(school.faculty.studentRatio)}`)
      ],
      [
        'Full-time faculty (%)',
        (school) => (school.faculty.fullTimeRate == null ? '' : Math.round(school.faculty.fullTimeRate * 100))
      ]
    ];
    const rows = [
      columns.map(([heading]) => heading),
      ...this.#currentResults.map((school) => columns.map(([, value]) => value(school)))
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
