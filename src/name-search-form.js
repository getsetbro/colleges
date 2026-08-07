const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host { display: block; }
    form { display: grid; grid-template-columns: 1fr auto; gap: 18px; margin-top: 32px; align-items: end; }
    label { color: #bfcac6; font: 600 .73rem 'DM Sans', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
    input { box-sizing: border-box; width: 100%; margin-top: 9px; padding: 14px; border: 1px solid #557068; border-radius: 2px; outline: none; background: #24483e; color: #fff; font: inherit; }
    input::placeholder { color: #8fa39c; }
    input:focus { border-color: #d4a33d; }
    button { height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 0 18px; border: 0; background: #d4a33d; color: #183a31; font: 600 .87rem 'DM Sans', sans-serif; cursor: pointer; }
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
