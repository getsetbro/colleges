const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host { display: block; }
    form { display: grid; grid-template-columns: repeat(3, 1fr) 1.1fr; gap: 18px; margin-top: 32px; align-items: end; }
    label { color: #bfcac6; font: 600 .73rem 'DM Sans', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
    input { box-sizing: border-box; width: 100%; margin-top: 9px; padding: 14px; border: 1px solid #557068; border-radius: 2px; outline: none; background: #24483e; color: #fff; font: inherit; }
    input:focus { border-color: #d4a33d; }
    button { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; border: 0; background: #d4a33d; color: #183a31; font: 600 .87rem 'DM Sans', sans-serif; cursor: pointer; }
    button:disabled { cursor: wait; opacity: .6; }
    @media (max-width: 800px) { form { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { form { grid-template-columns: 1fr; } }
  </style>
  <form>
    <label>ZIP code<input name="zip" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" value="45036" required /></label>
    <label>Radius (miles)<input name="radius" type="number" min="1" max="500" value="170" required /></label>
    <label>Maximum undergrads<input name="maxStudents" type="number" min="2" max="100000" value="4000" required /></label>
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
    this.dispatchEvent(new CustomEvent('search', {
      bubbles: true,
      detail: {
        zip: data.get('zip'),
        radius: Number(data.get('radius')),
        maxStudents: Number(data.get('maxStudents'))
      }
    }));
  }
}

customElements.define('college-search-form', CollegeSearchForm);