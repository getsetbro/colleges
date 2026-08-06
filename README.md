# College Radius Finder

A static Vite app that queries the U.S. Department of Education College Scorecard API by ZIP code, radius, and undergraduate enrollment.

## Local development

```bash
cp .env.example .env
# Add your data.gov key to .env
npm install
npm run dev
```

The environment variable must be named `VITE_DATA_GOV_API_KEY`.

> **API-key visibility:** `.env` is gitignored, but Vite embeds `VITE_*` variables in the browser bundle. The key is therefore visible to visitors of the deployed site. A server-side proxy is required to keep it secret.

## GitHub Pages

1. Create a GitHub repository and push this project.
2. Add the key under **Settings → Secrets and variables → Actions** as `DATA_GOV_API_KEY`.
3. Add the workflow below as `.github/workflows/deploy.yml`, or deploy the local `dist/` output from another workflow.
4. In **Settings → Pages**, choose **GitHub Actions** as the source.

The included workflow injects the key during `npm run build`. Vite uses relative asset paths, so the site works under a repository subpath.
