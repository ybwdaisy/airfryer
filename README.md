# Airfryer times

An independent air fryer reference tool for `https://airfryer.ybwdaisy.com`. English is the default; Chinese pages live under `/zh`. The existing `ybwdaisy.com` homepage and its repository are not used or changed.

## Run locally

Node.js 24 LTS is recommended. Run `npm ci`, `npm run check`, `npm test`, `npm run build`, then `npm run dev`. The local app runs at `http://127.0.0.1:4327`. Astro telemetry is disabled by project scripts. Astro 7 starts a managed background dev server; stop it with `ASTRO_TELEMETRY_DISABLED=1 npx astro dev stop` when no longer needed.

## Content and behavior

Browser icons use `public/favicon.svg`; the opaque home-screen artwork is `public/icon.svg`. After editing either source, run `npm run icons:generate` and commit the generated PNG/ICO files. The shared layout declares the 180px Apple Touch icon, browser fallbacks and manifest on every page. The manifest keeps browser navigation; no offline or standalone app behavior is introduced.

- 50 food subjects across six browse categories, with 55 separately sourced preparation conditions.
- Static detail and category pages remain readable without JavaScript; live fuzzy search, local temperature preference and condition selection enhance them in the browser.
- The selected condition, search and filter live in the URL. Unsupported conditions fall back to the food's first sourced condition; no weight multiplier or generated cooking advice is used.
- Reference temperature/time comes from one source. Independent cross-checks and mismatches are disclosed, not averaged. Cooking settings converted to °C are rounded to the nearest 5°C; official food-safety temperatures are separate.

The food files are `src/data/foods-a.json` and `src/data/foods-b.json`; schema and research requirements are documented in [the data contract](docs/data-contract.md). Each public condition has at least two independently authored source records, including source locations and concise evidence. This site has not performed physical cooking tests. References using a lower culinary doneness target do not override the official safety checks shown here.

`npm run build` validates data before generating pages. A Vercel production build requires exactly 50 food subjects. `npm run test:browser` exercises the running local site with system Chrome (or `CHROME_PATH`), including no-JavaScript content and consent gating. Google requests in those tests are intercepted. `npm run test:production` checks production-only metadata, the supplied public GA4 identifier, clean canonical paths and crawl settings, then restores an untracked preview build without opening the production artifact.

## Languages

The header switches between English and Chinese while retaining the current page, search, category, temperature unit, preparation condition and anchor. The latest explicit language choice is stored under the origin-local key `airfryer:language:v1`; returning to the bare homepage restores Chinese when selected. Fresh visits default to English even with a Chinese browser locale. Language links and Chinese guides also work without JavaScript; storage failure leaves explicit navigation usable.

`src/data/zh-foods.json` translates all 50 food subjects and 55 conditions. Numeric cooking facts, source URLs and source roles remain in the original dataset; publisher names, article titles and research evidence remain in English. `src/data/zh-ui.json` contains the interface copy. `npm test` checks translation coverage and numeric preservation; `npm run test:language` checks navigation, Chinese search, metadata, mobile layout and shared consent with Google traffic intercepted. Both languages have self-canonicals and alternate-language links; the sitemap has 118 URLs.

## Analytics and privacy

The supplied dedicated stream is `16326517771`, with public measurement ID `G-B34CBGW0EF`. Configure `PUBLIC_GA_MEASUREMENT_ID` in the production environment; the local `.env.local` is ignored. The identifier is public, not an authentication secret.

The build enables analytics only for `VERCEL_ENV=production`. Optional Google tags load only after a user grants consent, and can be rejected or withdrawn. Page-location values omit queries, and raw search text is not sent. Cookies are explicitly scoped to the tool hostname; preference storage is origin-local. Analytics is off in local and preview builds. See [deployment steps](docs/deployment.md) for the required GA4 property configuration before release.

## Deployment

Use an independent Vercel project, the Astro preset, `npm run build`, and output `dist`. Connect only `airfryer.ybwdaisy.com`, using the DNS records Vercel actually returns. Production release follows preview acceptance. No wildcard DNS or parent-domain redirect is needed.

## Verification limits

Data schema checks do not prove cooking accuracy. Browser checks do not prove physical cooking results, search-engine indexing, DNS propagation, or live GA4 ingestion. The source audit notes and UI review in `docs/` distinguish those boundaries.
