const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host { display: block; }
    form { display: grid; grid-template-columns: 1fr auto; gap: 18px; margin-top: 32px; align-items: end; }
    label { color: var(--color-on-dark); font: 600 .73rem 'DM Sans', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
    input { box-sizing: border-box; width: 100%; margin-top: 9px; padding: 14px; border: 1px solid var(--color-green); border-radius: 2px; outline: none; background: var(--color-ink-soft); color: var(--color-surface); font: inherit; }
    input::placeholder { color: var(--color-on-dark); }
    input:focus { border-color: var(--color-gold); }
    /* Replace the near-invisible native clear (X) with a solid light button. */
    input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; margin-left: 8px; cursor: pointer; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='9' fill='%23e8efec'/%3E%3Cpath d='M6.8 6.8l6.4 6.4m0-6.4l-6.4 6.4' stroke='%23183a31' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat; }
    button { height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 0 18px; border: 0; background: var(--color-gold); color: var(--color-ink); font: 600 .87rem 'DM Sans', sans-serif; cursor: pointer; }
    button:disabled { cursor: wait; opacity: .6; }
    @media (max-width: 560px) { form { grid-template-columns: 1fr; } }
  </style>
  <form>
    <label>School name<input name="name" type="search" placeholder="e.g. Miami University, Stanford" autocomplete="off" required /></label>
    <button type="submit"><span>Search by name</span><span aria-hidden="true">→</span></button>
  </form>
`;

class CollegeNameForm extends HTMLElement {
  #button;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.#button = this.shadowRoot.querySelector('button');
    this.shadowRoot.querySelector('form').addEventListener('submit', (event) => this.#handleSubmit(event));
  }

  set loading(value) {
    const loading = Boolean(value);
    this.#button.disabled = loading;
    this.#button.querySelector('span').textContent = loading ? 'Searching…' : 'Search by name';
  }

  get loading() {
    return this.#button.disabled;
  }

  #handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    if (!name) return;
    this.dispatchEvent(new CustomEvent('namesearch', { bubbles: true, detail: { name } }));
  }
}

customElements.define('college-name-form', CollegeNameForm);

export {};
