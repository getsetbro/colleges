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

## Deployment (Vercel)

This project deploys to Vercel (see `.vercel/project.json`). Vercel auto-detects the Vite framework and runs `npm run build`, serving the `dist/` output.

1. Add the key under **Project → Settings → Environment Variables** as `VITE_DATA_GOV_API_KEY` (for the Production, Preview, and Development environments as needed). It must be present at **build time** — Vite inlines it into the bundle during `npm run build`.
2. Push to the connected Git branch, or run `vercel --prod` from the CLI, to deploy.

Vite uses relative asset paths (`base: './'`), so the build is portable across hosts.
