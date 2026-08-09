// Shared with college-results.js: the user's last-used ZIP (search + directions).
const LAST_ZIP_KEY = 'college-last-zip';

const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host { display: block; }
    form { display: grid; grid-template-columns: repeat(4, 1fr) 1.4fr 1.1fr; gap: 18px; margin-top: 32px; align-items: end; }
    input::placeholder { color: var(--color-on-dark); }
    label { color: var(--color-on-dark); font: 600 .73rem 'DM Sans', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
    input { box-sizing: border-box; width: 100%; margin-top: 9px; padding: 14px; border: 1px solid var(--color-green); border-radius: 2px; outline: none; background: var(--color-ink-soft); color: var(--color-panel-text); font: inherit; }
    input:focus { border-color: var(--color-gold); }
    /* Replace the near-invisible native clear (X) with a solid light button. */
    input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; margin-left: 8px; cursor: pointer; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='9' fill='%23e8efec'/%3E%3Cpath d='M6.8 6.8l6.4 6.4m0-6.4l-6.4 6.4' stroke='%23183a31' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat; }
    button { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; border: 0; background: var(--color-gold); color: var(--color-on-gold); font: 600 .87rem 'DM Sans', sans-serif; cursor: pointer; }
    button:disabled { cursor: wait; opacity: .6; }
    @media (max-width: 800px) { form { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { form { grid-template-columns: 1fr; } }
  </style>
  <form>
    <label>ZIP code<input name="zip" type="search" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" value="45036" required /></label>
    <label>Radius (miles)<input name="radius" type="number" min="1" max="500" value="250" required /></label>
    <label>Min undergrads<input name="minStudents" type="number" min="0" max="100000" value="600" required /></label>
    <label>Max undergrads<input name="maxStudents" type="number" min="2" max="100000" value="3000" required /></label>
    <label>Field of study<input name="fieldOfStudy" type="search" placeholder="e.g. Nursing (optional)" value="English" autocomplete="off" /></label>
    <button type="submit"><span>Search colleges</span><span aria-hidden="true">→</span></button>
  </form>
`;

class CollegeSearchForm extends HTMLElement {
  #button;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.#button = this.shadowRoot.querySelector('button');
    this.shadowRoot.querySelector('form').addEventListener('submit', (event) => this.#handleSubmit(event));
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

  #handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const zip = data.get('zip');
    // Remember the ZIP so other views (e.g. directions) can reuse it without prompting.
    try {
      if (typeof zip === 'string' && /^\d{5}$/.test(zip)) localStorage.setItem(LAST_ZIP_KEY, zip);
    } catch {
      // localStorage unavailable — skip persisting.
    }
    this.dispatchEvent(
      new CustomEvent('search', {
        bubbles: true,
        detail: {
          zip: data.get('zip'),
          radius: Number(data.get('radius')),
          minStudents: Number(data.get('minStudents')),
          maxStudents: Number(data.get('maxStudents')),
          fieldOfStudy: String(data.get('fieldOfStudy') ?? '').trim()
        }
      })
    );
  }
}

customElements.define('college-search-form', CollegeSearchForm);
