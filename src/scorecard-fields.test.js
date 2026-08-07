import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clean,
  get,
  label,
  mapSchool,
  formatCurrency,
  formatCount,
  formatPercent,
  formatScore,
  formatRange,
  formatCoordinate,
  formatMiles,
  safeUrl,
  OWNERSHIP,
  LOCALE,
  CARNEGIE_BASIC,
  CREDENTIAL_LEVEL,
  TEST_REQUIREMENTS,
  INSTITUTION_FIELDS,
  PROGRAM_FIELDS,
  NOT_REPORTED
} from './scorecard-fields.js';

/* -------------------------------- clean / sentinels -------------------------------- */

test('clean() collapses null, blank, and suppressed sentinels to undefined', () => {
  for (const sentinel of [null, undefined, '', '  ', 'NULL', 'null', 'PrivacySuppressed', 'PS', 'NaN', NaN]) {
    assert.equal(clean(sentinel), undefined, `expected ${String(sentinel)} to clean to undefined`);
  }
});

test('clean() preserves real values and trims strings', () => {
  assert.equal(clean(0), 0);
  assert.equal(clean(42), 42);
  assert.equal(clean('45036'), '45036');
  assert.equal(clean('  Ohio  '), 'Ohio');
});

/* -------------------------------- coded-value labels -------------------------------- */

test('label() translates known codes and falls back to Not reported', () => {
  assert.equal(label(OWNERSHIP, 1), 'Public');
  assert.equal(label(OWNERSHIP, '2'), 'Private nonprofit');
  assert.equal(label(LOCALE, 11), 'City: Large');
  assert.equal(label(CARNEGIE_BASIC, 15), 'Doctoral Universities: Very High Research Activity');
  assert.equal(label(CREDENTIAL_LEVEL, 3), "Bachelor's degree");
  assert.equal(label(TEST_REQUIREMENTS, 1), 'Required');
  assert.equal(label(OWNERSHIP, 99), NOT_REPORTED);
  assert.equal(label(OWNERSHIP, null), NOT_REPORTED);
  assert.equal(label(OWNERSHIP, 'PrivacySuppressed'), NOT_REPORTED);
});

/* -------------------------------- formatters -------------------------------- */

test('formatCurrency treats 0 and missing as Not reported', () => {
  assert.equal(formatCurrency(12500), '$12,500');
  assert.equal(formatCurrency('12500'), '$12,500');
  assert.equal(formatCurrency(0), NOT_REPORTED);
  assert.equal(formatCurrency(null), NOT_REPORTED);
  assert.equal(formatCurrency('PrivacySuppressed'), NOT_REPORTED);
});

test('formatCount treats 0 as Not reported unless zeroOk', () => {
  assert.equal(formatCount(4000), '4,000');
  assert.equal(formatCount(0), NOT_REPORTED);
  assert.equal(formatCount(0, { zeroOk: true }), '0');
  assert.equal(formatCount(undefined), NOT_REPORTED);
});

test('formatPercent scales 0-1 shares and preserves a real 0%', () => {
  assert.equal(formatPercent(0.4567), '46%');
  assert.equal(formatPercent(0.4567, 1), '45.7%');
  assert.equal(formatPercent(0), '0%');
  assert.equal(formatPercent(1), '100%');
  assert.equal(formatPercent(null), NOT_REPORTED);
});

test('formatScore, formatRange, formatCoordinate, formatMiles', () => {
  assert.equal(formatScore(1180), '1180');
  assert.equal(formatScore(0), NOT_REPORTED);
  assert.equal(formatRange(520, 640), '520–640');
  assert.equal(formatRange(null, 640), '640');
  assert.equal(formatRange(null, null), NOT_REPORTED);
  assert.equal(formatCoordinate(39.5123456), '39.5123°');
  assert.equal(formatCoordinate(null), NOT_REPORTED);
  assert.equal(formatMiles(42.7), '43 mi');
});

test('safeUrl normalizes and rejects bad input', () => {
  assert.equal(safeUrl('example.edu'), 'https://example.edu/');
  assert.equal(safeUrl('http://x.edu/a'), 'http://x.edu/a');
  assert.equal(safeUrl(''), undefined);
  assert.equal(safeUrl(null), undefined);
});

/* -------------------------------- get() path access -------------------------------- */

test('get() reads flat dotted keys and walks nested objects', () => {
  assert.equal(get({ 'latest.student.size': 500 }, 'latest.student.size'), 500);
  assert.equal(get({ latest: { student: { size: 500 } } }, 'latest.student.size'), 500);
  assert.equal(get({}, 'missing.path'), undefined);
});

/* -------------------------------- field catalog -------------------------------- */

test('field catalog is well-formed', () => {
  assert.ok(INSTITUTION_FIELDS.includes('id'));
  assert.ok(INSTITUTION_FIELDS.includes('location.lat'));
  // retention lives under student, not completion
  assert.ok(INSTITUTION_FIELDS.includes('latest.student.retention_rate.four_year.full_time'));
  assert.ok(!INSTITUTION_FIELDS.includes('latest.completion.retention_rate.four_year.full_time'));
  // avg_net_price.overall is not a real field; public/private are
  assert.ok(!INSTITUTION_FIELDS.includes('latest.cost.avg_net_price.overall'));
  assert.ok(INSTITUTION_FIELDS.includes('latest.cost.avg_net_price.public'));
  assert.ok(PROGRAM_FIELDS.includes('latest.programs.cip_4_digit.earnings.1_yr.overall_median_earnings'));
  assert.equal(new Set(INSTITUTION_FIELDS).size, INSTITUTION_FIELDS.length, 'no duplicate fields');
});

/* -------------------------------- mapSchool -------------------------------- */

const RAW = {
  id: 199120,
  'school.name': 'Test University',
  'school.city': 'Springfield',
  'school.state': 'OH',
  'school.zip': '45501',
  'school.ownership': 2,
  'school.degrees_awarded.predominant': 3,
  'school.degrees_awarded.highest': 4,
  'school.carnegie_basic': 15,
  'school.main_campus': 1,
  'school.branches': 0,
  'school.school_url': 'test.edu',
  'school.price_calculator_url': 'test.edu/npc',
  'school.locale': 11,
  'school.minority_serving.historically_black': 1,
  'school.women_only': 0,
  'location.lat': 39.9242,
  'location.lon': -83.8088,
  'latest.student.size': 4000,
  'latest.student.part_time_share': 0.2,
  'latest.student.demographics.men': 0.45,
  'latest.student.retention_rate.four_year.full_time': 0.88,
  'latest.admissions.admission_rate.overall': 0.72,
  'latest.admissions.sat_scores.25th_percentile.math': 520,
  'latest.admissions.sat_scores.75th_percentile.math': 640,
  'latest.cost.tuition.in_state': 10000,
  'latest.cost.tuition.out_of_state': 20000,
  'latest.cost.attendance.academic_year': 35000,
  'latest.cost.avg_net_price.private': 18000,
  'latest.cost.avg_net_price.public': null,
  'latest.cost.net_price.private.by_income_level.0-30000': 12000,
  'latest.aid.median_debt.completers.overall': 'PrivacySuppressed',
  'latest.completion.completion_rate_4yr_150nt': 0.61,
  'latest.earnings.10_yrs_after_entry.median': 48000,
  'latest.academics.program_percentage.business_marketing': 0.3,
  'latest.academics.program_percentage.education': 0.1,
  'latest.academics.program_percentage.history': 0,
  'latest.programs.cip_4_digit': [
    {
      code: '5201',
      title: 'Business Administration',
      credential: { level: 3, title: "Bachelor's Degree" },
      counts: { ipeds_awards2: 120 },
      earnings: { '1_yr': { overall_median_earnings: 45000 } },
      debt: { staff_grad_plus: { all: { eval_inst: { median: 22000 } } } }
    }
  ]
};

test('mapSchool normalizes identity, profile, and designations', () => {
  const school = mapSchool(RAW, 12.3);
  assert.equal(school.id, 199120);
  assert.equal(school.name, 'Test University');
  assert.equal(school.ownershipCode, 2);
  assert.equal(school.profile.website, 'https://test.edu/');
  assert.equal(school.profile.netPriceCalculatorUrl, 'https://test.edu/npc');
  assert.deepEqual(school.profile.designations, [
    {
      label: 'HBCU',
      title:
        'Historically Black College or University — established before 1964 with a principal mission of educating Black Americans.'
    }
  ]);
  assert.equal(school.profile.mainCampus, 1);
  assert.equal(school.profile.branches, 0);
});

test('mapSchool coalesces net price and cleans suppressed values', () => {
  const school = mapSchool(RAW, null);
  // public is null, private present -> overall = private
  assert.equal(school.cost.netPricePublic, undefined);
  assert.equal(school.cost.netPriceOverall, 18000);
  // privacy-suppressed debt becomes undefined
  assert.equal(school.aid.medianDebtCompleters, undefined);
  // retention read from student.* not completion.*
  assert.equal(school.outcomes.retentionFourYearFull, 0.88);
});

test('mapSchool sets distance only when provided', () => {
  assert.equal(mapSchool(RAW, 12.3).location.distance, 12.3);
  assert.equal(mapSchool(RAW, null).location.distance, undefined);
});

test('mapSchool ranks top programs by share and drops zero/missing', () => {
  const school = mapSchool(RAW, null);
  assert.deepEqual(
    school.academics.topPrograms.map((program) => program.key),
    ['business_marketing', 'education']
  );
  assert.equal(school.academics.topPrograms[0].share, 0.3);
});

test('mapSchool maps nested field-of-study programs', () => {
  const [program] = mapSchool(RAW, null).academics.programs;
  assert.equal(program.title, 'Business Administration');
  assert.equal(program.credentialLevel, 3);
  assert.equal(program.awards, 120);
  assert.equal(program.earnings1yr, 45000);
  assert.equal(program.medianDebt, 22000);
});

test('mapSchool tolerates an empty record', () => {
  const school = mapSchool({}, null);
  assert.equal(school.name, '');
  assert.equal(school.cost.netPriceOverall, undefined);
  assert.deepEqual(school.academics.programs, []);
  assert.deepEqual(school.academics.topPrograms, []);
});
