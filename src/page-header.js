// @ts-check
// Shared masthead shown above the search box on every page: the eyebrow, the
// headline, and the page navigation. Configure via attributes:
//   heading  full headline text, e.g. "Find the colleges."
//   accent   substring of `heading` to emphasize in the accent color/italic
//   current  active nav key: 'location' | 'name' | 'favorites'

/** @type {Array<{ key: string, href: string, label: string }>} */
const NAV_LINKS = [
  { key: 'location', href: './index.html', label: 'By location' },
  { key: 'name', href: './name.html', label: 'By name' },
  { key: 'favorites', href: './favorites.html', label: 'Favorites' }
];

/** @param {string} value @returns {string} */
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>'"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character
  );

/**
 * Escape `heading`, wrapping the first occurrence of `accent` in a <span> so it
 * picks up the accent styling. Falls back to the plain heading when `accent` is
 * empty or not found.
 * @param {string} heading
 * @param {string} accent
 * @returns {string}
 */
function headingHtml(heading, accent) {
  const index = accent ? heading.indexOf(accent) : -1;
  if (index < 0) return escapeHtml(heading);
  return (
    escapeHtml(heading.slice(0, index)) +
    `<span>${escapeHtml(accent)}</span>` +
    escapeHtml(heading.slice(index + accent.length))
  );
}

class PageHeader extends HTMLElement {
  connectedCallback() {
    const heading = this.getAttribute('heading') ?? '';
    const accent = this.getAttribute('accent') ?? '';
    const current = this.getAttribute('current') ?? '';
    const nav = NAV_LINKS.map(
      ({ key, href, label }) =>
        `<a href="${href}"${key === current ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`
    ).join('');
    this.innerHTML = `
      <header class="hero">
        <h1>${headingHtml(heading, accent)}</h1>
      </header>
      <nav class="page-nav">${nav}</nav>`;
  }
}

customElements.define('page-header', PageHeader);
