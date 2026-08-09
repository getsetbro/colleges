# Context

Domain glossary for this repo — a static browser app over the U.S. Department of
Education **College Scorecard** API. Use these terms exactly in code, issues, and
tests; don't drift to the synonyms called out under "Avoid".

This is a living document. Add a term when it first causes confusion or gets
resolved in discussion — not speculatively. See `docs/agents/domain.md` for how
the skills consume it.

## Core entities

- **Institution** / **school** — one college as returned by the Scorecard API,
  keyed by its numeric `id`. In code the normalized shape is a **`MappedSchool`**
  (see `mapSchool` in `src/scorecard-fields.js`): the raw API record with API
  sentinels cleaned and derived fields (net-price overall, distance) added. Prefer
  "school" in UI copy and "institution" in field/data discussion; they're the same
  thing.
  - _Avoid_: "university" (many institutions aren't), "record" (that's the raw API row).

- **Raw record** — an untouched Scorecard API row, before `mapSchool`. Nested
  under `school.*`, `latest.*`, `location.*`. Contains **sentinels** —
  `NULL`, `PrivacySuppressed`, `PS`, `NaN`, blank — that `clean()` collapses to
  `undefined`. Never surface a sentinel to the UI.

- **Field catalog** — the set of API field paths we request and the coded-value
  label maps that translate them (`src/scorecard-fields.js`). All paths and codes
  are verified against `data/CollegeScorecardDataDictionary.xlsx` (the **data
  dictionary**) — the source of truth; consult it before adding/changing a field.

## Search modes (one per page)

- **Location search** (`index.html` → `src/app.js`) — search by **ZIP** +
  **radius** (miles) + **enrollment size**. The ZIP is resolved to coordinates via
  `api.zippopotam.us` (not Scorecard), and **distance** in miles is computed
  client-side by haversine. Distance exists only in this mode.
- **Name search** (`name/index.html` → `src/name-search.js`) — search by
  institution **name** or **alias**. The Scorecard `school.name` query also matches
  city, so results must be filtered down to true name/alias matches in the caller.
- **Favorites** (`favorites/index.html` → `src/favorites.js`) — schools the user
  saved, persisted in `localStorage` under `college-favorites`.

## Field sets (how much of a record we fetch)

- **Summary fields** (`SUMMARY_FIELDS`) — the lean set backing result lists.
- **Full record** (`INSTITUTION_FIELDS` + `PROGRAM_FIELDS`, `all_programs_nested=true`)
  — everything, requested only for a single school's **detail view** or when a
  search filters/ranks by field of study.

## Coded values & classifications

These are API integer codes; the label maps in `scorecard-fields.js` are the
canonical translations. Use the label map's exact wording.

- **Ownership** / **control** — `OWNERSHIP`: Public / Private nonprofit /
  Private for-profit. The Scorecard/IPEDS term is "control"; we surface "ownership".
- **Predominant degree** / **highest degree** — `PREDOMINANT_DEGREE` /
  `HIGHEST_DEGREE`. The typical vs. the highest credential an institution awards.
- **Locale** — `LOCALE`: City/Suburb/Town/Rural × size (e.g. "Suburb: Large").
- **Carnegie classification** — `CARNEGIE_BASIC` / `CARNEGIE_SIZE_SETTING` /
  `carnegie_undergrad`. A standard institutional taxonomy.
- **Credential level** — `CREDENTIAL_LEVEL` (CREDLEV): the credential a specific
  **program** (field of study) awards. Distinct from the institution's degree codes.
- **Test requirements** — `TEST_REQUIREMENTS`: whether SAT/ACT is required.

## Programs (fields of study)

- **Program** — a field of study within an institution, keyed by **CIP** code.
  Two granularities appear in the data:
  - **Popular programs** / **top programs** — degree share reported per **CIP
    family** (2-digit), from `academics.program_percentage.*`. Backed by
    `PROGRAM_FIELD_LABELS`; `mapTopPrograms` builds the list.
  - **Nested programs** — the detailed per-**CIP 4-digit** program list (title,
    credential, awards, earnings, debt), fetched with `all_programs_nested=true`.
    `programFamilyKey` rolls a 4-digit code up to its popular-programs family.
- **CIP** — Classification of Instructional Programs, the federal program-code
  scheme. "2-digit" = family, "4-digit" = specific program.

## The `latest` alias

Scorecard's `latest.*` alias mixes reporting years (a field's most recent
available year), so two `latest` fields on the same record may come from different
years. Don't present `latest` data as a single coherent snapshot year.

## Persisted user state (localStorage / sessionStorage)

- `college-favorites` — saved schools (`FAVORITES_KEY`, exported from
  `college-results.js`).
- `college-section-states` — per-section collapse state in a card.
- `college-last-zip` — last location-search ZIP.
- ZIP→coordinates lookups are cached per-ZIP in `sessionStorage`.
