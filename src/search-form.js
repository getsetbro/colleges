import PROGRAMS from './programs.json';
import { firstWordLabel } from './scorecard-fields.js';

// Shared with college-results.js: the user's last-used ZIP (search + directions).
const LAST_ZIP_KEY = 'college-last-zip';
// Most programs a search may target (matches the up-to-3 result tiles).
const MAX_FIELDS = 3;
// Cap the dropdown so a broad query doesn't render all ~420 programs at once.
const MAX_OPTIONS = 50;

const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host { display: block; }
    form { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 32px; align-items: end; }
    input::placeholder, .ms-input::placeholder { color: var(--color-on-dark); }
    label { color: var(--color-on-dark); font: 600 .73rem 'DM Sans', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
    input { box-sizing: border-box; width: 100%; margin-top: 9px; padding: 14px; border: 1px solid var(--color-green); border-radius: 2px; outline: none; background: var(--color-ink-soft); color: var(--color-panel-text); font: inherit; }
    input:focus { border-color: var(--color-gold); }
    /* Replace the near-invisible native clear (X) with a solid light button. */
    input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; margin-left: 8px; cursor: pointer; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='9' fill='%23e8efec'/%3E%3Cpath d='M6.8 6.8l6.4 6.4m0-6.4l-6.4 6.4' stroke='%23183a31' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat; }
    button { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; border: 0; background: var(--color-gold); color: var(--color-on-gold); font: 600 .87rem 'DM Sans', sans-serif; cursor: pointer; }
    button:disabled { cursor: wait; opacity: .6; }
    /* Fields-of-study multi-select: chip list + search box + filtered dropdown. */
    .fos { grid-column: span 3; position: relative; }
    .ms { position: relative; margin-top: 9px; }
    .ms-control { box-sizing: border-box; min-height: 48px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid var(--color-green); border-radius: 2px; background: var(--color-ink-soft); cursor: text; }
    .ms-control.is-focused { border-color: var(--color-gold); }
    .ms-chips>:not([hidden])~:not([hidden]) {margin-left: 5px;}
    .ms-chip { display: inline-flex; align-items: center; gap: 7px; padding: 4px 4px 4px 9px; background: var(--color-gold); color: var(--color-on-gold); font: 600 .78rem 'DM Sans', sans-serif; text-transform: none; letter-spacing: 0; }
    .ms-chip button { height: auto; padding: 0 4px; background: none; color: inherit; font-size: 1rem; line-height: 1; }
    .ms-input { flex: 1; min-width: 130px; margin: 0; padding: 5px 4px; border: 0; background: none; }
    .ms-input:focus { border: 0; }
    .ms-list { position: absolute; z-index: 30; top: calc(100% + 4px); left: 0; right: 0; max-height: 260px; margin: 0; padding: 4px; list-style: none; overflow-y: auto; background: var(--color-ink-soft); border: 1px solid var(--color-green); box-shadow: 0 8px 22px var(--color-shadow, rgba(0,0,0,.35)); }
    .ms-list li { padding: 8px 10px; color: var(--color-panel-text); font: 400 .85rem 'DM Sans', sans-serif; text-transform: none; letter-spacing: 0; cursor: pointer; }
    .ms-list li.is-active, .ms-list li:hover { background: var(--color-green); color: var(--color-on-dark); }
    .ms-note { padding: 8px 10px; color: var(--color-on-dark); font: 400 .8rem 'DM Sans', sans-serif; text-transform: none; letter-spacing: 0; }
    @media (max-width: 800px) { form { grid-template-columns: 1fr 1fr; } .fos { grid-column: 1 / -1; } }
    @media (max-width: 560px) { form { grid-template-columns: 1fr; } }
  </style>
  <form>
    <label>ZIP code<input name="zip" type="search" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" value="45036" required /></label>
    <label>Radius (miles)<input name="radius" type="number" min="1" max="500" value="250" /></label>
    <label>Min undergrads<input name="minStudents" type="number" min="0" max="100000" value="600" /></label>
    <label>Max undergrads<input name="maxStudents" type="number" min="2" max="100000" value="3000" /></label>
    <label class="fos">Fields of study (up to ${MAX_FIELDS}, optional)
      <div class="ms">
        <div class="ms-control">
          <span class="ms-chips"></span>
          <input class="ms-input" type="text" placeholder="Search programs…" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" />
        </div>
        <ul class="ms-list" role="listbox" hidden></ul>
      </div>
    </label>
    <button type="submit"><span>Search colleges</span><span aria-hidden="true">→</span></button>
  </form>
`;

class CollegeSearchForm extends HTMLElement {
  #button;
  /** @type {HTMLInputElement} */
  #msInput;
  /** @type {HTMLElement} */
  #msChips;
  /** @type {HTMLElement} */
  #msControl;
  /** @type {HTMLUListElement} */
  #msList;
  /** @type {string[]} chosen program titles, in selection order (max MAX_FIELDS) */
  #selected = [];
  /** @type {string[]} program titles currently shown in the dropdown */
  #visible = [];
  /** @type {number} index into #visible of the keyboard-highlighted option */
  #active = -1;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.#button = this.shadowRoot.querySelector('button');
    this.#msInput = /** @type {HTMLInputElement} */ (this.shadowRoot.querySelector('.ms-input'));
    this.#msChips = /** @type {HTMLElement} */ (this.shadowRoot.querySelector('.ms-chips'));
    this.#msControl = /** @type {HTMLElement} */ (this.shadowRoot.querySelector('.ms-control'));
    this.#msList = /** @type {HTMLUListElement} */ (this.shadowRoot.querySelector('.ms-list'));
    this.shadowRoot.querySelector('form').addEventListener('submit', (event) => this.#handleSubmit(event));
    this.#wireMultiSelect();
    // Default the ZIP to the user's last-used one, if any.
    try {
      const stored = localStorage.getItem(LAST_ZIP_KEY);
      const zipInput = /** @type {HTMLInputElement|null} */ (this.shadowRoot.querySelector('input[name="zip"]'));
      if (stored && zipInput && /^\d{5}$/.test(stored)) zipInput.value = stored;
    } catch {
      // localStorage unavailable — keep the default ZIP.
    }
  }

  set loading(value) {
    const loading = Boolean(value);
    this.#button.disabled = loading;
    this.#button.querySelector('span').textContent = loading ? 'Searching…' : 'Search colleges';
  }

  get loading() {
    return this.#button.disabled;
  }

  /** Attach the multi-select's input, keyboard, focus, and option-click handlers. */
  #wireMultiSelect() {
    // Clicking anywhere in the control focuses the search input.
    this.#msControl.addEventListener('mousedown', (event) => {
      if (event.target === this.#msControl || event.target === this.#msChips) {
        event.preventDefault();
        this.#msInput.focus();
      }
    });
    this.#msInput.addEventListener('input', () => this.#openList());
    this.#msInput.addEventListener('focus', () => {
      this.#msControl.classList.add('is-focused');
      this.#openList();
    });
    this.#msInput.addEventListener('blur', () => {
      this.#msControl.classList.remove('is-focused');
      // Delay so an option's click lands before the list closes.
      setTimeout(() => this.#closeList(), 120);
    });
    this.#msInput.addEventListener('keydown', (event) => this.#handleKeydown(event));
    // Select on mousedown, not click: preventDefault keeps focus on the input, and
    // committing here (before mouseup/click) avoids a Chromium quirk where mutating
    // the list mid-click dispatch fires a phantom second click on the new chip.
    this.#msList.addEventListener('mousedown', (event) => {
      event.preventDefault();
      const li = /** @type {HTMLElement} */ (event.target).closest('li[data-title]');
      if (li instanceof HTMLElement && li.dataset.title) this.#addProgram(li.dataset.title);
    });
    // Chip remove buttons (delegated).
    this.#msChips.addEventListener('click', (event) => {
      const button = /** @type {HTMLElement} */ (event.target).closest('button[data-title]');
      if (button instanceof HTMLElement && button.dataset.title) this.#removeProgram(button.dataset.title);
    });
  }

  /** @param {KeyboardEvent} event */
  #handleKeydown(event) {
    if (event.key === 'Backspace' && this.#msInput.value === '' && this.#selected.length) {
      this.#removeProgram(this.#selected[this.#selected.length - 1]);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!this.#visible.length) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.#active = (this.#active + step + this.#visible.length) % this.#visible.length;
      this.#renderList();
      return;
    }
    if (event.key === 'Enter') {
      const choice = this.#visible[this.#active] ?? this.#visible[0];
      // Only intercept submit when the dropdown offers a pick.
      if (!this.#msList.hidden && choice) {
        event.preventDefault();
        this.#addProgram(choice);
      }
      return;
    }
    if (event.key === 'Escape') this.#closeList();
  }

  /** Recompute the dropdown from the current query and (re)open it. */
  #openList() {
    if (this.#selected.length >= MAX_FIELDS) {
      this.#closeList();
      this.#renderList();
      return;
    }
    const query = this.#msInput.value.trim().toLocaleLowerCase();
    const matches = PROGRAMS.filter(
      (title) => !this.#selected.includes(title) && title.toLocaleLowerCase().includes(query)
    );
    this.#visible = matches.slice(0, MAX_OPTIONS);
    this.#active = this.#visible.length ? 0 : -1;
    this.#msList.hidden = false;
    this.#msInput.setAttribute('aria-expanded', 'true');
    this.#renderList(matches.length);
  }

  #closeList() {
    this.#msList.hidden = true;
    this.#msInput.setAttribute('aria-expanded', 'false');
  }

  /** @param {number} [total] full match count, to note when the list is truncated */
  #renderList(total = this.#visible.length) {
    if (this.#selected.length >= MAX_FIELDS) {
      this.#msList.innerHTML = `<li class="ms-note">Up to ${MAX_FIELDS} programs — remove one to add another.</li>`;
      return;
    }
    if (!this.#visible.length) {
      this.#msList.innerHTML = '<li class="ms-note">No matching programs.</li>';
      return;
    }
    const options = this.#visible
      .map(
        (title, index) =>
          `<li role="option" data-title="${escapeAttr(title)}"${index === this.#active ? ' class="is-active" aria-selected="true"' : ''}>${escapeHtml(title)}</li>`
      )
      .join('');
    const more =
      total > this.#visible.length
        ? `<li class="ms-note">${total - this.#visible.length} more — keep typing…</li>`
        : '';
    this.#msList.innerHTML = options + more;
  }

  /** @param {string} title */
  #addProgram(title) {
    if (this.#selected.includes(title) || this.#selected.length >= MAX_FIELDS) return;
    this.#selected.push(title);
    this.#msInput.value = '';
    this.#renderChips();
    if (this.#selected.length >= MAX_FIELDS) {
      this.#msInput.placeholder = `${MAX_FIELDS} selected`;
      this.#closeList();
    } else {
      this.#openList();
    }
    this.#msInput.focus();
  }

  /** @param {string} title */
  #removeProgram(title) {
    this.#selected = this.#selected.filter((value) => value !== title);
    this.#msInput.placeholder = 'Search programs…';
    this.#renderChips();
    this.#openList();
    this.#msInput.focus();
  }

  #renderChips() {
    this.#msChips.innerHTML = this.#selected
      .map(
        // Show just the first word (the chip is narrow); full title on hover.
        (title) =>
          `<span class="ms-chip" title="${escapeAttr(title)}">${escapeHtml(firstWordLabel(title))}<button type="button" data-title="${escapeAttr(title)}" aria-label="Remove ${escapeAttr(title)}">×</button></span>`
      )
      .join('');
  }

  #handleSubmit(event) {
    event.preventDefault();
    const form = /** @type {HTMLFormElement} */ (event.currentTarget);
    const data = new FormData(form);
    const zip = data.get('zip');
    // Remember the ZIP so other views (e.g. directions) can reuse it without prompting.
    try {
      if (typeof zip === 'string' && /^\d{5}$/.test(zip)) localStorage.setItem(LAST_ZIP_KEY, zip);
    } catch {
      // localStorage unavailable — skip persisting.
    }
    // A cleared numeric field falls back to its broadest value (widest radius,
    // lowest floor, highest ceiling) so the search still runs; reflect it back
    // into the input so the user sees what was used.
    const numberField = (/** @type {string} */ name, /** @type {number} */ fallback) => {
      const input = /** @type {HTMLInputElement} */ (form.elements.namedItem(name));
      if (input.value.trim() === '') input.value = String(fallback);
      return Number(input.value);
    };
    this.dispatchEvent(
      new CustomEvent('search', {
        bubbles: true,
        detail: {
          zip,
          radius: numberField('radius', 500),
          minStudents: numberField('minStudents', 1),
          maxStudents: numberField('maxStudents', 100000),
          // The programs chosen in the multi-select (0–MAX_FIELDS titles).
          fieldsOfStudy: [...this.#selected]
        }
      })
    );
  }
}

/** @param {string} value @returns {string} */
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>'"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character
  );

/** @param {string} value @returns {string} for use in a double-quoted attribute */
const escapeAttr = (value) => escapeHtml(value);

customElements.define('college-search-form', CollegeSearchForm);
