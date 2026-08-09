// @ts-check
// Field catalog, coded-value translations, value formatting, and the raw-record
// normalizer for the U.S. Department of Education College Scorecard API.
// All field paths and coded values are verified against CollegeScorecardDataDictionary.xlsx.

/* ------------------------------------------------------------------ *
 * Coded-value label maps (verified against the data dictionary)
 * ------------------------------------------------------------------ */

/** @type {Record<string, string>} */
export const OWNERSHIP = { 1: 'Public', 2: 'Private nonprofit', 3: 'Private for-profit' };

/** @type {Record<string, string>} */
export const PREDOMINANT_DEGREE = {
  0: 'Not classified',
  1: 'Predominantly certificates',
  2: "Predominantly associate's",
  3: "Predominantly bachelor's",
  4: 'Entirely graduate'
};

/** @type {Record<string, string>} */
export const HIGHEST_DEGREE = {
  0: 'Non-degree-granting',
  1: 'Certificate',
  2: 'Associate',
  3: "Bachelor's",
  4: 'Graduate'
};

/** @type {Record<string, string>} */
export const LOCALE = {
  11: 'City: Large',
  12: 'City: Midsize',
  13: 'City: Small',
  21: 'Suburb: Large',
  22: 'Suburb: Midsize',
  23: 'Suburb: Small',
  31: 'Town: Fringe',
  32: 'Town: Distant',
  33: 'Town: Remote',
  41: 'Rural: Fringe',
  42: 'Rural: Distant',
  43: 'Rural: Remote'
};

/** @type {Record<string, string>} */
export const TEST_REQUIREMENTS = {
  1: 'Required',
  2: 'Recommended',
  3: 'Neither required nor recommended',
  4: 'Unknown',
  5: 'Considered but not required'
};

/** @type {Record<string, string>} — CREDLEV, field-of-study credential levels */
export const CREDENTIAL_LEVEL = {
  1: 'Undergraduate certificate/diploma',
  2: "Associate's degree",
  3: "Bachelor's degree",
  4: 'Post-baccalaureate certificate',
  5: "Master's degree",
  6: 'Doctoral degree',
  7: 'First professional degree',
  8: 'Graduate/professional certificate'
};

/** @type {Record<string, string>} */
export const CARNEGIE_SIZE_SETTING = {
  '-2': 'Not applicable',
  0: 'Not classified',
  1: 'Two-year, very small',
  2: 'Two-year, small',
  3: 'Two-year, medium',
  4: 'Two-year, large',
  5: 'Two-year, very large',
  6: 'Four-year, very small, primarily nonresidential',
  7: 'Four-year, very small, primarily residential',
  8: 'Four-year, very small, highly residential',
  9: 'Four-year, small, primarily nonresidential',
  10: 'Four-year, small, primarily residential',
  11: 'Four-year, small, highly residential',
  12: 'Four-year, medium, primarily nonresidential',
  13: 'Four-year, medium, primarily residential',
  14: 'Four-year, medium, highly residential',
  15: 'Four-year, large, primarily nonresidential',
  16: 'Four-year, large, primarily residential',
  17: 'Four-year, large, highly residential',
  18: 'Exclusively graduate/professional'
};

/** @type {Record<string, string>} — CCBASIC */
export const CARNEGIE_BASIC = {
  '-2': 'Not applicable',
  0: 'Not classified',
  1: "Associate's: High Transfer-High Traditional",
  2: "Associate's: High Transfer-Mixed Traditional/Nontraditional",
  3: "Associate's: High Transfer-High Nontraditional",
  4: "Associate's: Mixed Transfer/Career & Technical-High Traditional",
  5: "Associate's: Mixed Transfer/Career & Technical-Mixed Traditional/Nontraditional",
  6: "Associate's: Mixed Transfer/Career & Technical-High Nontraditional",
  7: "Associate's: High Career & Technical-High Traditional",
  8: "Associate's: High Career & Technical-Mixed Traditional/Nontraditional",
  9: "Associate's: High Career & Technical-High Nontraditional",
  10: 'Special Focus Two-Year: Health Professions',
  11: 'Special Focus Two-Year: Technical Professions',
  12: 'Special Focus Two-Year: Arts & Design',
  13: 'Special Focus Two-Year: Other Fields',
  14: "Baccalaureate/Associate's: Associate's Dominant",
  15: 'Doctoral Universities: Very High Research Activity',
  16: 'Doctoral Universities: High Research Activity',
  17: 'Doctoral/Professional Universities',
  18: "Master's Colleges & Universities: Larger Programs",
  19: "Master's Colleges & Universities: Medium Programs",
  20: "Master's Colleges & Universities: Small Programs",
  21: 'Baccalaureate Colleges: Arts & Sciences Focus',
  22: 'Baccalaureate Colleges: Diverse Fields',
  23: "Baccalaureate/Associate's: Mixed Baccalaureate/Associate's",
  24: 'Special Focus Four-Year: Faith-Related Institutions',
  25: 'Special Focus Four-Year: Medical Schools & Centers',
  26: 'Special Focus Four-Year: Other Health Professions Schools',
  27: 'Special Focus Four-Year: Research Institution',
  28: 'Special Focus Four-Year: Engineering & Other Technology-Related Schools',
  29: 'Special Focus Four-Year: Business & Management Schools',
  30: 'Special Focus Four-Year: Arts, Music & Design Schools',
  31: 'Special Focus Four-Year: Law Schools',
  32: 'Special Focus Four-Year: Other Special Focus Institutions',
  33: 'Tribal Colleges'
};

/** @type {Record<string, string>} — CCUGPROF, undergraduate profile */
export const CARNEGIE_UNDERGRAD = {
  '-2': 'Not applicable',
  0: 'Not classified',
  1: 'Two-year, higher part-time',
  2: 'Two-year, mixed part/full-time',
  3: 'Two-year, medium full-time',
  4: 'Two-year, higher full-time',
  5: 'Four-year, higher part-time',
  6: 'Four-year, medium full-time, inclusive, lower transfer-in',
  7: 'Four-year, medium full-time, inclusive, higher transfer-in',
  8: 'Four-year, medium full-time, selective, lower transfer-in',
  9: 'Four-year, medium full-time, selective, higher transfer-in',
  10: 'Four-year, full-time, inclusive, lower transfer-in',
  11: 'Four-year, full-time, inclusive, higher transfer-in',
  12: 'Four-year, full-time, selective, lower transfer-in',
  13: 'Four-year, full-time, selective, higher transfer-in',
  14: 'Four-year, full-time, more selective, lower transfer-in',
  15: 'Four-year, full-time, more selective, higher transfer-in'
};

/** @type {Record<string, string>} — OPENADMP, open-admissions policy */
export const OPEN_ADMISSIONS_POLICY = {
  1: 'Open admissions',
  2: 'Does not have an open-admissions policy',
  3: 'Does not enroll first-time students'
};

/**
 * Religious affiliation (RELAFFIL). Only the codes present in the dictionary are
 * mapped; unknown codes fall through to "Not reported".
 * @type {Record<string, string>}
 */
export const RELIGIOUS_AFFILIATION = {
  22: 'American Evangelical Lutheran Church',
  24: 'African Methodist Episcopal Zion Church',
  27: 'Assemblies of God Church',
  28: 'Brethren Church',
  30: 'Roman Catholic',
  33: 'Wisconsin Evangelical Lutheran Synod',
  34: 'Christ and Missionary Alliance Church',
  35: 'Christian Reformed Church',
  36: 'Evangelical Congregational Church',
  37: 'Evangelical Covenant Church of America',
  38: 'Evangelical Free Church of America',
  39: 'Evangelical Lutheran Church',
  40: 'International United Pentecostal Church',
  41: 'Free Will Baptist Church',
  42: 'Interdenominational',
  43: 'Mennonite Brethren Church',
  44: 'Moravian Church',
  45: 'North American Baptist',
  47: 'Pentecostal Holiness Church',
  48: 'Christian Churches and Churches of Christ',
  49: 'Reformed Church in America',
  50: 'Episcopal Church, Reformed',
  51: 'African Methodist Episcopal',
  52: 'American Baptist',
  53: 'American Lutheran',
  54: 'Baptist',
  55: 'Christian Methodist Episcopal',
  57: 'Church of God',
  58: 'Church of Brethren',
  59: 'Church of the Nazarene',
  60: 'Cumberland Presbyterian',
  61: 'Christian Church (Disciples of Christ)',
  64: 'Free Methodist',
  65: 'Friends',
  66: 'Presbyterian Church (USA)',
  67: 'Lutheran Church in America',
  68: 'Lutheran Church - Missouri Synod',
  69: 'Mennonite Church',
  71: 'United Methodist',
  73: 'Protestant Episcopal',
  74: 'Churches of Christ',
  75: 'Southern Baptist',
  76: 'United Church of Christ',
  77: 'Protestant, not specified',
  78: 'Multiple Protestant Denomination',
  79: 'Other Protestant',
  80: 'Jewish',
  81: 'Reformed Presbyterian Church',
  84: 'United Brethren Church',
  87: 'Missionary Church Inc',
  88: 'Undenominational',
  89: 'Wesleyan',
  91: 'Greek Orthodox',
  92: 'Russian Orthodox',
  93: 'Unitarian Universalist',
  94: 'Latter Day Saints (Mormon Church)',
  95: 'Seventh Day Adventists',
  97: 'The Presbyterian Church in America',
  99: 'Other (none of the above)',
  100: 'Original Free Will Baptist',
  101: 'Ecumenical Christian',
  102: 'Evangelical Christian',
  103: 'Presbyterian',
  105: 'General Baptist',
  106: 'Muslim',
  107: 'Plymouth Brethren',
  108: 'Non-Denominational',
  110: 'Orthodox Christian'
};

/**
 * Readable labels for the 38 CIP-family degree-share fields
 * (latest.academics.program_percentage.<key>).
 * @type {Record<string, string>}
 */
export const PROGRAM_FIELD_LABELS = {
  agriculture: 'Agriculture & related sciences',
  resources: 'Natural resources & conservation',
  architecture: 'Architecture & related services',
  ethnic_cultural_gender: 'Area, ethnic, cultural & gender studies',
  communication: 'Communication & journalism',
  communications_technology: 'Communications technologies',
  computer: 'Computer & information sciences',
  personal_culinary: 'Personal & culinary services',
  education: 'Education',
  engineering: 'Engineering',
  engineering_technology: 'Engineering technologies',
  language: 'Foreign languages & linguistics',
  family_consumer_science: 'Family & consumer sciences',
  legal: 'Legal professions & studies',
  english: 'English language & literature',
  humanities: 'Liberal arts, general studies & humanities',
  library: 'Library science',
  biological: 'Biological & biomedical sciences',
  mathematics: 'Mathematics & statistics',
  military: 'Military technologies',
  multidiscipline: 'Multi/interdisciplinary studies',
  parks_recreation_fitness: 'Parks, recreation & fitness studies',
  philosophy_religious: 'Philosophy & religious studies',
  theology_religious_vocation: 'Theology & religious vocations',
  physical_science: 'Physical sciences',
  science_technology: 'Science technologies',
  psychology: 'Psychology',
  security_law_enforcement: 'Homeland security & law enforcement',
  public_administration_social_service: 'Public administration & social service',
  social_science: 'Social sciences',
  construction: 'Construction trades',
  mechanic_repair_technology: 'Mechanic & repair technologies',
  precision_production: 'Precision production',
  transportation: 'Transportation & materials moving',
  visual_performing: 'Visual & performing arts',
  health: 'Health professions & related programs',
  business_marketing: 'Business, management & marketing',
  history: 'History'
};

/**
 * CIP 2-digit series → PROGRAM_FIELD_LABELS key. Popular-programs data is
 * reported per family (CIP 2-digit), while the nested program list is CIP
 * 4-digit; this lets a detailed program (e.g. "5138" Registered Nursing) be
 * traced back to the popular-programs family it rolls up into ("health").
 */
const CIP_SERIES_TO_PROGRAM_KEY = {
  '01': 'agriculture',
  '03': 'resources',
  '04': 'architecture',
  '05': 'ethnic_cultural_gender',
  '09': 'communication',
  10: 'communications_technology',
  11: 'computer',
  12: 'personal_culinary',
  13: 'education',
  14: 'engineering',
  15: 'engineering_technology',
  16: 'language',
  19: 'family_consumer_science',
  22: 'legal',
  23: 'english',
  24: 'humanities',
  25: 'library',
  26: 'biological',
  27: 'mathematics',
  28: 'military',
  29: 'military',
  30: 'multidiscipline',
  31: 'parks_recreation_fitness',
  38: 'philosophy_religious',
  39: 'theology_religious_vocation',
  40: 'physical_science',
  41: 'science_technology',
  42: 'psychology',
  43: 'security_law_enforcement',
  44: 'public_administration_social_service',
  45: 'social_science',
  46: 'construction',
  47: 'mechanic_repair_technology',
  48: 'precision_production',
  49: 'transportation',
  50: 'visual_performing',
  51: 'health',
  52: 'business_marketing',
  54: 'history'
};

/**
 * Map a CIP-4-digit program code (e.g. "5138") to its popular-programs family
 * key (e.g. "health"), or undefined when the series isn't tracked.
 * @param {*} code
 * @returns {string|undefined}
 */
export function programFamilyKey(code) {
  if (code == null) return undefined;
  return CIP_SERIES_TO_PROGRAM_KEY[String(code).padStart(4, '0').slice(0, 2)];
}

/**
 * Special-designation flags (value 1 = applies). Rendered as badges; `title`
 * supplies the hover tooltip explaining each designation.
 * @type {Array<{key: string, label: string, title: string}>}
 */
export const SPECIAL_DESIGNATION_FLAGS = [
  {
    key: 'school.minority_serving.historically_black',
    label: 'HBCU',
    title:
      'Historically Black College or University — established before 1964 with a principal mission of educating Black Americans.'
  },
  {
    key: 'school.minority_serving.hispanic',
    label: 'Hispanic-serving',
    title: 'Hispanic-Serving Institution — enrollment is at least 25% Hispanic.'
  },
  {
    key: 'school.minority_serving.tribal',
    label: 'Tribal college',
    title:
      'Tribal College or University — chartered by a tribal government and primarily serving Native American students.'
  },
  {
    key: 'school.minority_serving.aanipi',
    label: 'AANAPI-serving',
    title: 'Asian American & Native American Pacific Islander-Serving Institution — at least 10% AANAPI enrollment.'
  },
  {
    key: 'school.minority_serving.annh',
    label: 'Alaska Native / Native Hawaiian-serving',
    title: 'At least 20% Alaska Native or Native Hawaiian enrollment.'
  },
  {
    key: 'school.minority_serving.predominantly_black',
    label: 'Predominantly Black',
    title:
      'Predominantly Black Institution — meets federal thresholds for Black enrollment (distinct from an HBCU, which is defined by historical charter).'
  },
  {
    key: 'school.minority_serving.nant',
    label: 'Native American non-tribal',
    title: 'Serves Native American students but is not a chartered tribal college.'
  },
  { key: 'school.men_only', label: 'Men only', title: 'Enrolls men only.' },
  { key: 'school.women_only', label: 'Women only', title: 'Enrolls women only.' },
  { key: 'school.online_only', label: 'Online only', title: 'Operates entirely online, with no physical campus.' }
];

/** Data-source note explaining the `latest` alias mixes reporting years. */
export const LATEST_ALIAS_NOTE =
  'Metrics come from the College Scorecard "latest" release, which combines the most recent available data per measure — individual figures may reflect different reporting years.';

/**
 * Translate a coded value to its readable label.
 * @param {Record<string, string>} map
 * @param {*} code
 * @returns {string}
 */
export function label(map, code) {
  const value = clean(code);
  if (value == null) return NOT_REPORTED;
  const key = String(value);
  return map[key] ?? NOT_REPORTED;
}

/* ------------------------------------------------------------------ *
 * Missing / sentinel handling
 * ------------------------------------------------------------------ */

const SENTINELS = new Set(['', 'NULL', 'null', 'PrivacySuppressed', 'PS', 'NaN']);

/**
 * Normalize an API value: null/undefined, blank, and privacy/suppressed sentinels
 * all collapse to `undefined`. Numeric strings become numbers.
 * @param {*} value
 * @returns {*}
 */
export function clean(value) {
  if (value == null) return undefined;
  if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (SENTINELS.has(trimmed)) return undefined;
    return trimmed;
  }
  return value;
}

/** @param {*} value @returns {number|undefined} */
function num(value) {
  const cleaned = clean(value);
  if (cleaned == null) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/* ------------------------------------------------------------------ *
 * Formatters — all return "Not reported" for missing values.
 * Currency / counts / scores also treat 0 as "Not reported" (0 is the API's
 * sentinel for those measures); percentages preserve a real 0%.
 * ------------------------------------------------------------------ */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export const NOT_REPORTED = '-';

/** @param {*} value @returns {string} */
export function formatCurrency(value) {
  const n = num(value);
  if (n == null || n === 0) return NOT_REPORTED;
  return currencyFormatter.format(n);
}

/**
 * @param {*} value
 * @param {{ zeroOk?: boolean }} [options] set zeroOk for counts where 0 is meaningful (e.g. branches)
 * @returns {string}
 */
export function formatCount(value, options = {}) {
  const n = num(value);
  if (n == null || (!options.zeroOk && n === 0)) return NOT_REPORTED;
  return n.toLocaleString('en-US');
}

/**
 * Percentages: the API expresses shares as 0–1 fractions. A real 0 is preserved.
 * @param {*} value
 * @param {number} [digits]
 * @returns {string}
 */
export function formatPercent(value, digits = 0) {
  const n = num(value);
  if (n == null) return NOT_REPORTED;
  return `${(n * 100).toFixed(digits)}%`;
}

/** SAT/ACT scores. @param {*} value @returns {string} */
export function formatScore(value) {
  const n = num(value);
  if (n == null || n === 0) return NOT_REPORTED;
  return String(Math.round(n));
}

/**
 * A low–high range (e.g. SAT/ACT 25th–75th percentile). Falls back to whichever
 * endpoint is present, or "Not reported" when neither is.
 * @param {*} low @param {*} high @returns {string}
 */
export function formatRange(low, high) {
  const lo = formatScore(low);
  const hi = formatScore(high);
  if (lo === NOT_REPORTED && hi === NOT_REPORTED) return NOT_REPORTED;
  if (lo === NOT_REPORTED) return hi;
  if (hi === NOT_REPORTED) return lo;
  return `${lo}–${hi}`;
}

/** @param {*} value @returns {string} */
export function formatCoordinate(value) {
  const n = num(value);
  if (n == null) return NOT_REPORTED;
  return n.toFixed(4) + '°';
}

/** @param {*} value @returns {string} */
export function formatMiles(value) {
  const n = num(value);
  if (n == null) return NOT_REPORTED;
  return `${Math.round(n)} mi`;
}

/**
 * Validate/normalize a URL, prefixing https:// when the scheme is missing.
 * @param {*} value @returns {string|undefined}
 */
export function safeUrl(value) {
  const cleaned = clean(value);
  if (!cleaned || typeof cleaned !== 'string') return undefined;
  try {
    return new URL(/^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`).href;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ *
 * API field catalog
 * ------------------------------------------------------------------ */

const SCHOOL_FIELDS = [
  'id',
  'school.name',
  'school.alias',
  'school.city',
  'school.state',
  'school.zip',
  'school.ownership',
  'school.open_admissions_policy',
  'school.degrees_awarded.predominant',
  'school.degrees_awarded.highest',
  'school.carnegie_basic',
  'school.carnegie_undergrad',
  'school.carnegie_size_setting',
  'school.main_campus',
  'school.branches',
  'school.school_url',
  'school.price_calculator_url',
  'school.religious_affiliation',
  'school.locale',
  'school.online_only',
  'school.men_only',
  'school.women_only',
  ...SPECIAL_DESIGNATION_FLAGS.map((flag) => flag.key).filter((key) => key.startsWith('school.minority_serving')),
  'location.lat',
  'location.lon'
];

const LATEST_FIELDS = [
  // Enrollment
  'student.size',
  'student.enrollment.all',
  'student.enrollment.undergrad_12_month',
  'student.enrollment.grad_12_month',
  'student.part_time_share',
  'student.share_25_older',
  'student.share_firstgeneration',
  'student.share_lowincome.0_30000',
  'student.share_middleincome.30001_48000',
  'student.share_middleincome.48001_75000',
  'student.share_highincome.75001_110000',
  'student.share_highincome.110001plus',
  'student.demographics.men',
  'student.demographics.women',
  'student.demographics.race_ethnicity.white',
  'student.demographics.race_ethnicity.black',
  'student.demographics.race_ethnicity.hispanic',
  'student.demographics.race_ethnicity.asian',
  'student.demographics.race_ethnicity.aian',
  'student.demographics.race_ethnicity.nhpi',
  'student.demographics.race_ethnicity.two_or_more',
  'student.demographics.race_ethnicity.non_resident_alien',
  'student.demographics.race_ethnicity.unknown',
  // Faculty
  'school.faculty_salary',
  'school.ft_faculty_rate',
  'student.demographics.student_faculty_ratio',
  'student.demographics.faculty.men',
  'student.demographics.faculty.women',
  'student.demographics.faculty.race_ethnicity.white',
  'student.demographics.faculty.race_ethnicity.black',
  'student.demographics.faculty.race_ethnicity.hispanic',
  'student.demographics.faculty.race_ethnicity.asian',
  'student.demographics.faculty.race_ethnicity.aian',
  'student.demographics.faculty.race_ethnicity.nhpi',
  'student.demographics.faculty.race_ethnicity.two_or_more',
  'student.demographics.faculty.race_ethnicity.non_resident_alien',
  'student.demographics.faculty.race_ethnicity.unknown',
  // Retention (lives under student, not completion)
  'student.retention_rate.four_year.full_time',
  'student.retention_rate.lt_four_year.full_time',
  'student.retention_rate.four_year.part_time',
  'student.retention_rate.lt_four_year.part_time',
  // Admissions
  'admissions.admission_rate.overall',
  'admissions.admission_rate.by_ope_id',
  'admissions.sat_scores.average.overall',
  'admissions.sat_scores.25th_percentile.critical_reading',
  'admissions.sat_scores.75th_percentile.critical_reading',
  'admissions.sat_scores.25th_percentile.math',
  'admissions.sat_scores.75th_percentile.math',
  'admissions.act_scores.midpoint.cumulative',
  'admissions.act_scores.25th_percentile.cumulative',
  'admissions.act_scores.75th_percentile.cumulative',
  'admissions.test_requirements',
  // Cost
  'cost.tuition.in_state',
  'cost.tuition.out_of_state',
  'cost.attendance.academic_year',
  'cost.roomboard.oncampus',
  'cost.roomboard.offcampus',
  'cost.otherexpense.oncampus',
  'cost.otherexpense.offcampus',
  'cost.otherexpense.withfamily',
  'cost.booksupply',
  'cost.avg_net_price.public',
  'cost.avg_net_price.private',
  'cost.net_price.public.by_income_level.0-30000',
  'cost.net_price.public.by_income_level.30001-48000',
  'cost.net_price.public.by_income_level.48001-75000',
  'cost.net_price.public.by_income_level.75001-110000',
  'cost.net_price.public.by_income_level.110001-plus',
  'cost.net_price.private.by_income_level.0-30000',
  'cost.net_price.private.by_income_level.30001-48000',
  'cost.net_price.private.by_income_level.48001-75000',
  'cost.net_price.private.by_income_level.75001-110000',
  'cost.net_price.private.by_income_level.110001-plus',
  // Aid
  'aid.pell_grant_rate',
  'aid.federal_loan_rate',
  'aid.median_debt.completers.overall',
  'aid.median_debt.completers.monthly_payments',
  // Completion / transfer
  'completion.completion_rate_4yr_150nt',
  'completion.completion_rate_less_than_4yr_150nt',
  'completion.completion_rate_4yr_100nt',
  'completion.transfer_rate.4yr.full_time',
  // Earnings
  'earnings.6_yrs_after_entry.median',
  'earnings.10_yrs_after_entry.median',
  'earnings.10_yrs_after_entry.gt_threshold',
  'earnings.hsearn.threshold.national',
  // Repayment
  'repayment.2_yr_default_rate',
  'repayment.3_yr_default_rate',
  'repayment.repayment_cohort.3_year_declining_balance',
  // Popular programs (degrees awarded by field)
  ...Object.keys(PROGRAM_FIELD_LABELS).map((key) => `academics.program_percentage.${key}`)
];

/** Every institution-level field requested from the schools endpoint. */
export const INSTITUTION_FIELDS = [...SCHOOL_FIELDS, ...LATEST_FIELDS.map((field) => `latest.${field}`)];

/**
 * The lean field set for the initial results list: only what the result cards
 * (tiles, badges), the result filters/sorts, and the CSV export read. The heavy
 * nested-programs list and the detail-group-only fields (SAT/ACT, full cost
 * breakdown, outcomes, faculty salary, extended demographics) are omitted and
 * fetched on demand when a card's "View all details" is expanded (fetchSchoolDetails).
 */
export const SUMMARY_FIELDS = [
  'id',
  'school.name',
  'school.alias', // name-search filters on alias
  'school.city',
  'school.state',
  'school.zip',
  'school.ownership',
  'school.open_admissions_policy',
  'school.degrees_awarded.predominant',
  'school.carnegie_size_setting',
  'school.school_url',
  'school.religious_affiliation',
  'school.online_only',
  'school.men_only',
  'school.women_only',
  ...SPECIAL_DESIGNATION_FLAGS.map((flag) => flag.key).filter((key) => key.startsWith('school.minority_serving')),
  'location.lat',
  'location.lon',
  'latest.student.size',
  'latest.student.demographics.race_ethnicity.white',
  'latest.student.demographics.race_ethnicity.black',
  'latest.student.demographics.race_ethnicity.hispanic',
  'latest.student.demographics.race_ethnicity.asian',
  'latest.student.demographics.race_ethnicity.aian',
  'latest.student.demographics.race_ethnicity.nhpi',
  'latest.student.demographics.race_ethnicity.two_or_more',
  'latest.student.demographics.race_ethnicity.non_resident_alien',
  'latest.school.ft_faculty_rate',
  'latest.student.demographics.student_faculty_ratio',
  'latest.admissions.admission_rate.overall',
  'latest.cost.avg_net_price.public',
  'latest.cost.avg_net_price.private'
];

/** Nested field-of-study fields (requested with all_programs_nested=true). */
export const PROGRAM_FIELDS = [
  'latest.programs.cip_4_digit.code',
  'latest.programs.cip_4_digit.title',
  'latest.programs.cip_4_digit.credential.level',
  'latest.programs.cip_4_digit.credential.title',
  'latest.programs.cip_4_digit.counts.ipeds_awards2',
  'latest.programs.cip_4_digit.earnings.1_yr.overall_median_earnings',
  'latest.programs.cip_4_digit.debt.staff_grad_plus.all.eval_inst.median'
];

/* ------------------------------------------------------------------ *
 * Record normalizer
 * ------------------------------------------------------------------ */

/**
 * Read a value from a Scorecard record by dotted path. The API returns flat
 * dotted keys by default but nests them under some options; try the flat key
 * first, then walk nested objects so both response shapes work.
 * @param {Record<string, *>} record
 * @param {string} path
 * @returns {*}
 */
export function get(record, path) {
  if (record == null) return undefined;
  if (path in record) return record[path];
  let node = /** @type {*} */ (record);
  for (const part of path.split('.')) {
    if (node == null) return undefined;
    node = node[part];
  }
  return node;
}

/**
 * @param {Record<string, *>} raw
 * @returns {Array<{ key: string, label: string, share: number }>}
 */
function mapTopPrograms(raw) {
  return Object.entries(PROGRAM_FIELD_LABELS)
    .map(([key, programLabel]) => ({
      key,
      label: programLabel,
      share: num(get(raw, `latest.academics.program_percentage.${key}`))
    }))
    .filter((entry) => entry.share != null && entry.share > 0)
    .sort((a, b) => /** @type {number} */ (b.share) - /** @type {number} */ (a.share))
    .map((entry) => ({ key: entry.key, label: entry.label, share: /** @type {number} */ (entry.share) }));
}

/**
 * @param {Record<string, *>} raw
 * @returns {Array<{ code: *, title: *, credentialLevel: *, credentialTitle: *, awards: number|undefined, earnings1yr: number|undefined, medianDebt: number|undefined }>}
 */
function mapPrograms(raw) {
  const list = get(raw, 'latest.programs.cip_4_digit');
  if (!Array.isArray(list)) return [];
  return list
    .map((program) => ({
      code: clean(get(program, 'code')),
      title: clean(get(program, 'title')),
      credentialLevel: clean(get(program, 'credential.level')),
      credentialTitle: clean(get(program, 'credential.title')),
      awards: num(get(program, 'counts.ipeds_awards2')),
      earnings1yr: num(get(program, 'earnings.1_yr.overall_median_earnings')),
      medianDebt: num(get(program, 'debt.staff_grad_plus.all.eval_inst.median'))
    }))
    .filter((program) => program.title != null || program.awards != null);
}

/**
 * @typedef {ReturnType<typeof mapSchool>} MappedSchool
 */

/**
 * Normalize a raw Scorecard record into a structured, section-grouped object
 * with sentinel values cleaned and derived fields (net-price overall, distance)
 * resolved. Presentation/formatting is left to the caller.
 * @param {Record<string, *>} raw
 * @param {number|null} [distance] miles from the search origin, if a ZIP search is active
 */
export function mapSchool(raw, distance = null) {
  const netPricePublic = num(get(raw, 'latest.cost.avg_net_price.public'));
  const netPricePrivate = num(get(raw, 'latest.cost.avg_net_price.private'));

  /** @param {'public'|'private'} sector */
  const netPriceByIncome = (sector) => ({
    '0-30000': num(get(raw, `latest.cost.net_price.${sector}.by_income_level.0-30000`)),
    '30001-48000': num(get(raw, `latest.cost.net_price.${sector}.by_income_level.30001-48000`)),
    '48001-75000': num(get(raw, `latest.cost.net_price.${sector}.by_income_level.48001-75000`)),
    '75001-110000': num(get(raw, `latest.cost.net_price.${sector}.by_income_level.75001-110000`)),
    '110001-plus': num(get(raw, `latest.cost.net_price.${sector}.by_income_level.110001-plus`))
  });

  const ownershipCode = clean(get(raw, 'school.ownership'));

  return {
    id: clean(get(raw, 'id')),
    name: clean(get(raw, 'school.name')) ?? '',
    ownershipCode,
    profile: {
      ownership: ownershipCode,
      alias: clean(get(raw, 'school.alias')),
      openAdmissionsPolicy: num(get(raw, 'school.open_admissions_policy')),
      predominantDegree: clean(get(raw, 'school.degrees_awarded.predominant')),
      highestDegree: clean(get(raw, 'school.degrees_awarded.highest')),
      carnegieBasic: clean(get(raw, 'school.carnegie_basic')),
      carnegieUndergrad: clean(get(raw, 'school.carnegie_undergrad')),
      carnegieSizeSetting: clean(get(raw, 'school.carnegie_size_setting')),
      mainCampus: num(get(raw, 'school.main_campus')),
      branches: num(get(raw, 'school.branches')),
      website: safeUrl(get(raw, 'school.school_url')),
      netPriceCalculatorUrl: safeUrl(get(raw, 'school.price_calculator_url')),
      religiousAffiliation: clean(get(raw, 'school.religious_affiliation')),
      menOnly: num(get(raw, 'school.men_only')) === 1,
      womenOnly: num(get(raw, 'school.women_only')) === 1,
      designations: SPECIAL_DESIGNATION_FLAGS.filter((flag) => num(get(raw, flag.key)) === 1).map((flag) => ({
        label: flag.label,
        title: flag.title
      }))
    },
    location: {
      city: clean(get(raw, 'school.city')),
      state: clean(get(raw, 'school.state')),
      zip: clean(get(raw, 'school.zip')),
      locale: clean(get(raw, 'school.locale')),
      lat: num(get(raw, 'location.lat')),
      lon: num(get(raw, 'location.lon')),
      distance: distance == null ? undefined : distance
    },
    enrollment: {
      size: num(get(raw, 'latest.student.size')),
      total: num(get(raw, 'latest.student.enrollment.all')),
      undergrad12mo: num(get(raw, 'latest.student.enrollment.undergrad_12_month')),
      grad12mo: num(get(raw, 'latest.student.enrollment.grad_12_month')),
      partTimeShare: num(get(raw, 'latest.student.part_time_share')),
      share25older: num(get(raw, 'latest.student.share_25_older')),
      shareFirstGeneration: num(get(raw, 'latest.student.share_firstgeneration')),
      incomeDistribution: {
        low: num(get(raw, 'latest.student.share_lowincome.0_30000')),
        lowerMiddle: num(get(raw, 'latest.student.share_middleincome.30001_48000')),
        upperMiddle: num(get(raw, 'latest.student.share_middleincome.48001_75000')),
        high: num(get(raw, 'latest.student.share_highincome.75001_110000')),
        highest: num(get(raw, 'latest.student.share_highincome.110001plus'))
      },
      demographics: {
        men: num(get(raw, 'latest.student.demographics.men')),
        women: num(get(raw, 'latest.student.demographics.women')),
        white: num(get(raw, 'latest.student.demographics.race_ethnicity.white')),
        black: num(get(raw, 'latest.student.demographics.race_ethnicity.black')),
        hispanic: num(get(raw, 'latest.student.demographics.race_ethnicity.hispanic')),
        asian: num(get(raw, 'latest.student.demographics.race_ethnicity.asian')),
        aian: num(get(raw, 'latest.student.demographics.race_ethnicity.aian')),
        nhpi: num(get(raw, 'latest.student.demographics.race_ethnicity.nhpi')),
        twoOrMore: num(get(raw, 'latest.student.demographics.race_ethnicity.two_or_more')),
        nonResidentAlien: num(get(raw, 'latest.student.demographics.race_ethnicity.non_resident_alien')),
        unknown: num(get(raw, 'latest.student.demographics.race_ethnicity.unknown'))
      }
    },
    faculty: {
      studentRatio: num(get(raw, 'latest.student.demographics.student_faculty_ratio')),
      salaryMonthly: num(get(raw, 'latest.school.faculty_salary')),
      fullTimeRate: num(get(raw, 'latest.school.ft_faculty_rate')),
      demographics: {
        men: num(get(raw, 'latest.student.demographics.faculty.men')),
        women: num(get(raw, 'latest.student.demographics.faculty.women')),
        white: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.white')),
        black: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.black')),
        hispanic: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.hispanic')),
        asian: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.asian')),
        aian: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.aian')),
        nhpi: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.nhpi')),
        twoOrMore: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.two_or_more')),
        nonResidentAlien: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.non_resident_alien')),
        unknown: num(get(raw, 'latest.student.demographics.faculty.race_ethnicity.unknown'))
      }
    },
    admissions: {
      admissionRate: num(get(raw, 'latest.admissions.admission_rate.overall')),
      admissionRateOpe: num(get(raw, 'latest.admissions.admission_rate.by_ope_id')),
      satAverage: num(get(raw, 'latest.admissions.sat_scores.average.overall')),
      satReading: [
        num(get(raw, 'latest.admissions.sat_scores.25th_percentile.critical_reading')),
        num(get(raw, 'latest.admissions.sat_scores.75th_percentile.critical_reading'))
      ],
      satMath: [
        num(get(raw, 'latest.admissions.sat_scores.25th_percentile.math')),
        num(get(raw, 'latest.admissions.sat_scores.75th_percentile.math'))
      ],
      act: [
        num(get(raw, 'latest.admissions.act_scores.25th_percentile.cumulative')),
        num(get(raw, 'latest.admissions.act_scores.75th_percentile.cumulative'))
      ],
      actMidpoint: num(get(raw, 'latest.admissions.act_scores.midpoint.cumulative')),
      testRequirements: clean(get(raw, 'latest.admissions.test_requirements'))
    },
    cost: {
      tuitionInState: num(get(raw, 'latest.cost.tuition.in_state')),
      tuitionOutOfState: num(get(raw, 'latest.cost.tuition.out_of_state')),
      attendanceAcademicYear: num(get(raw, 'latest.cost.attendance.academic_year')),
      roomBoardOnCampus: num(get(raw, 'latest.cost.roomboard.oncampus')),
      roomBoardOffCampus: num(get(raw, 'latest.cost.roomboard.offcampus')),
      otherExpenseOnCampus: num(get(raw, 'latest.cost.otherexpense.oncampus')),
      otherExpenseOffCampus: num(get(raw, 'latest.cost.otherexpense.offcampus')),
      otherExpenseWithFamily: num(get(raw, 'latest.cost.otherexpense.withfamily')),
      bookSupply: num(get(raw, 'latest.cost.booksupply')),
      netPricePublic,
      netPricePrivate,
      // "Overall" net price is not a dictionary field; public/private are mutually
      // exclusive by ownership, so coalesce them.
      netPriceOverall: netPricePublic ?? netPricePrivate,
      netPriceByIncome: { public: netPriceByIncome('public'), private: netPriceByIncome('private') }
    },
    aid: {
      pellRate: num(get(raw, 'latest.aid.pell_grant_rate')),
      federalLoanRate: num(get(raw, 'latest.aid.federal_loan_rate')),
      medianDebtCompleters: num(get(raw, 'latest.aid.median_debt.completers.overall')),
      medianDebtMonthly: num(get(raw, 'latest.aid.median_debt.completers.monthly_payments'))
    },
    outcomes: {
      retentionFourYearFull: num(get(raw, 'latest.student.retention_rate.four_year.full_time')),
      retentionLtFourYearFull: num(get(raw, 'latest.student.retention_rate.lt_four_year.full_time')),
      retentionFourYearPart: num(get(raw, 'latest.student.retention_rate.four_year.part_time')),
      retentionLtFourYearPart: num(get(raw, 'latest.student.retention_rate.lt_four_year.part_time')),
      completion4yr150: num(get(raw, 'latest.completion.completion_rate_4yr_150nt')),
      completionLt4yr150: num(get(raw, 'latest.completion.completion_rate_less_than_4yr_150nt')),
      completion4yr100: num(get(raw, 'latest.completion.completion_rate_4yr_100nt')),
      transfer4yr: num(get(raw, 'latest.completion.transfer_rate.4yr.full_time')),
      earnings6yr: num(get(raw, 'latest.earnings.6_yrs_after_entry.median')),
      earnings10yr: num(get(raw, 'latest.earnings.10_yrs_after_entry.median')),
      shareEarningAboveHsGrad: num(get(raw, 'latest.earnings.10_yrs_after_entry.gt_threshold')),
      hsGradEarningsThreshold: num(get(raw, 'latest.earnings.hsearn.threshold.national')),
      defaultRate2yr: num(get(raw, 'latest.repayment.2_yr_default_rate')),
      defaultRate3yr: num(get(raw, 'latest.repayment.3_yr_default_rate')),
      repaymentRate3yr: num(get(raw, 'latest.repayment.repayment_cohort.3_year_declining_balance'))
    },
    academics: {
      topPrograms: mapTopPrograms(raw),
      programs: mapPrograms(raw)
    }
  };
}
