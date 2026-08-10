# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server
npm run build          # Production build to dist/ (multi-page, see vite.config.js)
npm run preview        # Serve the production build
npm test               # Run node:test suite (currently src/scorecard-fields.test.js)
node --test src/scorecard-fields.test.js   # Run a single test file
npm run typecheck      # tsc --noEmit against JSDoc-annotated JS (checkJs)
npm run format         # Prettier write; format:check to verify
```

Requires `VITE_DATA_GOV_API_KEY` in `.env` (a data.gov key). Vite embeds `VITE_*` vars into the browser bundle, so the key is public on the deployed site — a server-side proxy would be needed to hide it.

## Architecture

A framework-less static Vite app over the U.S. Department of Education College Scorecard API. Plain JS with `// @ts-check` + JSDoc types (no `.ts` files); `strict` is off. UI is built from native Web Components (`customElements.define`), not any framework.

**Three pages, three entry points** (all registered in `vite.config.js`; each has its own `index.html` + entry module):
- `index.html` → `src/app.js` — location search (ZIP + radius + enrollment size)
- `name/index.html` → `src/name-search.js` — search by institution name/alias
- `favorites/index.html` → `src/favorites.js` — schools saved to localStorage

All three pages render results through the same `<college-results>` component and configure it via properties (`hideDistance`, `hideControls`, `detailLoader`, `emptyMessage`).

**Data flow:** entry module wires a search-form component to the API layer, maps raw records, and assigns the array to `collegeResults.results`.

- `src/scorecard-api.js` — all Scorecard HTTP access. `fetchAllPages` paginates (per_page=100, parallel page fetches). Two field sets: `SUMMARY_FIELDS` (lean, for result lists) vs. `INSTITUTION_FIELDS + PROGRAM_FIELDS` with `all_programs_nested=true` (full record, requested only for a single school's detail view or when a search filters/ranks by field of study). Exports `search`, `searchByName`, `searchByIds`, `fetchSchoolDetails`.
- `src/scorecard-fields.js` — the field catalog and normalizer. Coded-value label maps, formatters, and `mapSchool(raw, distance)` which turns a raw API record into the structured `MappedSchool` object the UI consumes. All field paths and coded values are verified against `data/CollegeScorecardDataDictionary.xlsx` — consult it before adding/changing fields. `clean()` collapses API sentinels (`NULL`, `PrivacySuppressed`, `PS`, `NaN`, blank) to `undefined`.
- `src/college-results.js` — the large `<college-results>` component: renders cards, result filter/sort controls, per-card lazy detail loading (via the injected `detailLoader`), and favorites. Distance for location search is computed client-side via haversine in `app.js` after resolving the ZIP to coordinates.

**External services & caching:** ZIP→coordinates resolution uses `api.zippopotam.us` (not Scorecard), cached per-ZIP in `sessionStorage` (`app.js`). Persistent user state lives in `localStorage`: `college-favorites` (`FAVORITES_KEY`, exported from `college-results.js`), `college-section-states` (per-section collapse state), `college-last-zip`.

## Conventions

- Keep JSDoc types accurate — `npm run typecheck` gates on them.
- Fetch helpers throw `Error` with user-facing messages (e.g. 403 → "The API key was rejected."); entry modules catch and call `collegeResults.setError(...)`.
- The Scorecard `school.name` search also matches city, so name-search results must be filtered down to true name/alias matches in the caller (see `name-search.js`).

## Working Principles

### 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
Touch only what you must. Clean up only your own mess.
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
Define success criteria. Loop until verified.
Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:
    1. [Step] -> verify: [check]
    2. [Step] -> verify: [check]
    3. [Step] -> verify: [check]
Strong success criteria let you loop independently. Weak criteria
("make it work") require constant clarification.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `getsetbro/colleges` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
