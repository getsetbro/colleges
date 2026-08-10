// One-time generator for src/programs.json — the canonical list of field-of-study
// (CIP 4-digit) program titles the search form's multi-select offers. Paginates
// every operating school requesting only the nested program title, dedupes, and
// writes the sorted unique list. Re-run when you want to refresh the taxonomy:
//   node scripts/build-programs.js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools.json';
const OUT = join(ROOT, 'src', 'programs.json');

/** Read VITE_DATA_GOV_API_KEY out of .env without adding a dotenv dependency. */
function apiKey() {
  const env = readFileSync(join(ROOT, '.env'), 'utf8');
  const match = env.match(/^\s*VITE_DATA_GOV_API_KEY\s*=\s*(.+)\s*$/m);
  if (!match) throw new Error('VITE_DATA_GOV_API_KEY not found in .env');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

/** @param {number} page @param {string} key */
function pageParams(page, key) {
  return new URLSearchParams({
    api_key: key,
    'school.operating': '1',
    all_programs_nested: 'true',
    fields: 'latest.programs.cip_4_digit.title',
    per_page: '100',
    page: String(page)
  });
}

async function fetchPage(page, key) {
  const response = await fetch(`${API_URL}?${pageParams(page, key)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} on page ${page}`);
  return response.json();
}

const key = apiKey();
const first = await fetchPage(0, key);
const pageCount = Math.ceil(first.metadata.total / first.metadata.per_page);
console.log(`${first.metadata.total} schools across ${pageCount} pages…`);

const titles = new Set();
/** @param {Array<Record<string, *>>} results */
const collect = (results) => {
  for (const school of results) {
    for (const program of school['latest.programs.cip_4_digit'] ?? []) {
      const title = program?.title;
      // Titles arrive with a trailing period (e.g. "Nursing.") — drop it for display.
      if (typeof title === 'string' && title.trim()) titles.add(title.trim().replace(/\.$/, ''));
    }
  }
};
collect(first.results);

// Fetch remaining pages in small concurrent batches to stay polite to the API.
const BATCH = 8;
for (let start = 1; start < pageCount; start += BATCH) {
  const batch = Array.from({ length: Math.min(BATCH, pageCount - start) }, (_, i) => fetchPage(start + i, key));
  for (const page of await Promise.all(batch)) collect(page.results);
  console.log(`  …through page ${Math.min(start + BATCH - 1, pageCount - 1)} — ${titles.size} distinct titles`);
}

const sorted = [...titles].sort((a, b) => a.localeCompare(b));
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n');
console.log(`Wrote ${sorted.length} programs to ${OUT}`);
