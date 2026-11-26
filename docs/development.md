# Development guide

[Project overview](../README.md) · [中文介绍](../README.zh-CN.md)

## Local development

Use Node.js 24 LTS. Run `npm ci` and `npm run dev`, then open `http://127.0.0.1:4327`. Astro telemetry is disabled by the project scripts. Astro 7 runs a managed background dev server; stop it with `ASTRO_TELEMETRY_DISABLED=1 npx astro dev stop` when finished.

No application backend or analytics credential is required to use the local app. `.env.local`, `.vercel/`, build output and browser test output remain ignored. `package.json` is marked private to prevent accidental npm publication; the GitHub repository is public.

## Project structure

| Location | Purpose |
| --- | --- |
| `src/components/views/` | Homepage, recipe and supporting views |
| `src/layouts/Layout.astro` | Shared metadata, navigation, footer and cooking controls |
| `src/scripts/` | Search, saved recipes, settings, cooking timer and consent-aware analytics |
| `src/data/foods-{a,b,cn}.json` | Source-backed recipe records |
| `src/data/recipe-overrides.json` | Enriched conditions for retained recipes |
| `src/data/regional-zh.json`, `src/data/zh-foods.json`, `src/data/zh-ui.json` | Chinese recipe and interface copy |
| `src/styles/` | Shared design tokens and app styles |
| `public/` | Logos, icons, fonts and category photographs |
| `analytics/funnels.json` | Sole editable Site Pulse funnel definition |
| `tests/` | Unit tests and intercepted browser checks |

## Recipe and unit rules

The catalog currently has 115 recipes and 121 conditions, with 55 Celsius recipes and 60 Fahrenheit recipes in the default lists. These counts describe coverage, not a release gate. Each public condition needs at least two independently authored source records, with locations and concise evidence. Follow the [data contract](data-contract.md).

Preserve the exact food state, preparation, portion, appliance settings and product restrictions. Independent cross-checks and mismatches are disclosed, not averaged. Celsius methods stay at or below 200°C; Fahrenheit methods stay at or below 400°F. Ingredient measurements can follow a kitchen preset; appliance settings are not converted into executable settings or assigned reused cooking times. Food-center safety guidance is a separate field.

`npm run build` validates both collections and bilingual instructions. Schema and browser checks do not establish cooking accuracy. The project does not claim physical cooking tests.

## Languages, routes and browser storage

- `/` is the English homepage and `/zh` is the Chinese homepage. Settings are `/settings` and `/zh/settings`.
- Unit preset and interface language are independent. A successful settings save returns to the chosen language's homepage. Storage failure keeps an explicit temporary notice and return link.
- The default list shows methods compatible with the saved kitchen temperature scale. Search also exposes matching foods with no verified method in that scale. Preparation-state searches distinguish frozen, fresh/thawed, ready-to-bake and reheat methods.
- The selected condition, search and filter use URL state. Legacy recipe paths, condition IDs and source anchors remain supported. Old `unit` links cannot override saved preferences. See [kitchen settings](kitchen-settings-2026-11-14.md) and [food coverage](food-coverage-2026-11-15.md).
- Bookmarks and timer snapshots stay in the browser. Timers stop for checks and next-stage confirmation. Background or lock-screen alerts are not guaranteed. See the [cooking workflow](cooking-workflow-2026-11-19.md).
- Recipe and category content remains readable without JavaScript in source-native units. Search enhancements, stored settings, bookmarks and timers require JavaScript.

## Checks and browser tests

```bash
npm run check
npm test
npm run build
npm run funnels:contract
```

Browser suites expect a running local site. On macOS, the current suites use installed Google Chrome. The kitchen suite also accepts `CHROME_EXECUTABLE_PATH`; check the individual script before running other suites on another platform.

With `npm run dev` running on its default port:

```bash
TEST_BASE_URL=http://127.0.0.1:4327 npm run test:browser
TEST_BASE_URL=http://127.0.0.1:4327 npm run test:cooking
TEST_BASE_URL=http://127.0.0.1:4327 npm run test:analytics
```

The browser suites cover recipe compatibility, bilingual layouts, search, saved settings, timers and consent. They intercept Google transport. `npm run test:production` validates production metadata, canonical links, crawl settings and the public GA identifier, then restores an untracked, noindex preview build without opening the production output.

## Analytics isolation and funnel contract

Local and preview builds keep analytics off. Production analytics requires consent and is scoped to the exact tool hostname. Raw search text and URL queries are excluded. Preferences and cookies stay scoped to this product's origin. See [analytics v2](analytics-v2.md).

For every automated production visit, intercept Google SDK and collection transports before navigation and use `?analytics_test=1`. QA flags persist across same-origin navigation and tabs. Automated visitors remain excluded even with `?analytics_test=0`. Normal-event contract tests may simulate a human only inside the intercepted offline fixture. Never send a real test event to GA4.

Before changing analytics/funnels or releasing, read the [shared contract](https://site-pulse-nine-tau.vercel.app/contracts/funnels-v1.md). Edit only `analytics/funnels.json`; build validation generates `public/.well-known/site-pulse.json`. Keep source, public and built files byte-identical and preserve stable IDs, filters and time windows. See [analytics configuration](../analytics/README.md).

## Visual assets and documentation screenshots

The current app design is documented in [design.md](../design.md). Preserve source facts, content hooks, links and events during visual changes.

The logo master is `public/logo.svg`. After changing it, run `npm run icons:generate` and commit the generated SVG/PNG/ICO files together. Header, favicons, Apple Touch and manifest icons share the same geometry; do not edit generated exports independently. Keep the icon cache version consistent.

Category photos are illustrations, not photographs of this project's recipe tests. Their attribution remains visible in the site footer and [third-party notices](../THIRD_PARTY_NOTICES.md); the bundled font's license is in `public/fonts/DM-Sans-OFL.txt`.

`docs/images/` contains the intentionally published README screenshots. They were captured from the live site on November 26, 2026, at a 390 × 844 CSS-pixel mobile viewport with Google transport blocked and QA mode enabled. English screenshots use the US preset; Chinese screenshots use the metric preset. Timer screenshots show a paused timer. Ordinary browser outputs, traces and authentication state must stay out of Git.

## Deployment

This is a static Astro site: build with `npm run build`, publish `dist/`, and use an independent Vercel project for `airfryer.ybwdaisy.com`. The production branch is `main`; feature branches create previews. Do not modify the separate personal homepage or unrelated DNS records.

The hosted app enables an optional public `PUBLIC_GA_MEASUREMENT_ID` only in the production environment; local and preview builds remain untracked and noindex. Use your own analytics configuration for a separate deployment. Canonical URLs and hostname guards are currently configured for this product, so a fork deploying to another domain must review those settings and the data contract.

Existing host-specific deployment history is recorded in [deployment notes](deployment.md). Build success does not prove DNS propagation, indexing, physical cooking results or live GA4 ingestion. Verify the intended project, commit and true production alias for a release.
