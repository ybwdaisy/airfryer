# Airfryer times

An independent air fryer reference tool for `https://airfryer.ybwdaisy.com`. English is the default; Chinese pages live under `/zh`. The existing `ybwdaisy.com` homepage and its repository are not used or changed.

## Run locally

Node.js 24 LTS is recommended. Run `npm ci`, `npm run check`, `npm test`, `npm run build`, then `npm run dev`. The local app runs at `http://127.0.0.1:4327`. Astro telemetry is disabled by project scripts. Astro 7 starts a managed background dev server; stop it with `ASTRO_TELEMETRY_DISABLED=1 npx astro dev stop` when no longer needed.

## Content and behavior

Browser icons use `public/favicon.svg`; the opaque home-screen artwork is `public/icon.svg`. After editing either source, run `npm run icons:generate` and commit the generated PNG/ICO files. The shared layout declares the 180px Apple Touch icon, browser fallbacks and manifest on every page. The manifest keeps browser navigation; no offline or standalone app behavior is introduced.

- One searchable library: 75 recipes and 81 separately sourced conditions. The default list shows methods available in the saved kitchen temperature scale: currently 25 Celsius recipes or 50 Fahrenheit recipes. Search separately discovers foods without a verified method in that scale.
- Native links, forms, lists and disclosures keep the interface and markup simple. Detail and category pages remain readable without JavaScript, in the source-native units. Live fuzzy search, saved kitchen/language settings and condition selection enhance them in the browser.
- The selected condition, search and filter live in the URL. Unsupported conditions fall back to the food's first sourced condition; no weight multiplier or generated cooking advice is used.
- Reference temperature/time comes from one source. Independent cross-checks and mismatches are disclosed, not averaged. China methods use native Celsius settings at or below 200°C; US methods use Fahrenheit at or below 400°F. Ingredient weight, volume and size can follow the saved kitchen preset; appliance temperatures are never converted into executable settings or paired with reused times. Official internal-temperature guidance is separate.

Food data lives in `src/data/foods-{a,b,cn}.json`; `recipe-overrides.json` enriches retained US conditions without changing their original clocks; schema and research requirements are documented in [the data contract](docs/data-contract.md). Each public condition has at least two independently authored source records, including source locations and concise evidence. This site has not performed physical cooking tests. References using a lower culinary doneness target do not override the official safety checks shown here.

`npm run build` validates data before generating pages. Both collections and complete bilingual instructions are validated; food count is not a production gate. `npm run test:browser` exercises the running local site with system Chrome (or `CHROME_PATH`), including no-JavaScript content and consent gating. Google requests in those tests are intercepted. `npm run test:production` checks production-only metadata, the supplied public GA4 identifier, clean canonical paths and crawl settings, then restores an untracked preview build without opening the production artifact.

## Languages

The unified homes are `/` (English) and `/zh` (Chinese). Old collection and category URLs remain reachable and canonicalize to the unified lists. Original US recipe paths `/foods/*` and `/zh/foods/*`, China paths `/china/foods/*` and `/zh/china/foods/*`, condition IDs and source anchors remain stable. The sitemap contains 168 canonical URLs; settings pages are noindex.

Settings at `/settings` or `/zh/settings` save one kitchen preset and an independent interface language in origin-local browser storage. Successful saves return directly to the homepage in the selected language. If either preference cannot persist, the settings page keeps the explicit temporary-only notice and a manual return link. Old explicit unit preferences migrate once; shared `unit` query parameters cannot override saved preferences. Storage failure produces an explicit temporary-only notice. Fresh homepage visits default to English; saved language applies to later visits and reference links. With JavaScript disabled, direct Chinese routes remain readable, while saved settings are unavailable.

`src/data/zh-foods.json` preserves historical Chinese copy; `regional-zh.json` supplies the enriched and new recipe copy. Both languages preserve the same cooking facts. Publisher names, article titles and evidence retain original wording and units in folded source details; `zh-ui.json` contains interface copy.

Starting-state search recognizes frozen, fresh/thawed and reheat terms before filtering methods. A different-state recovery link shows the required preparation and never counts as a directly matching frozen method. See [the coverage record](docs/food-coverage-2026-11-15.md).

The current household-cooking app system is recorded in [design.md](design.md): recognizable category photographs, independently linked recipes, clear preparation/cooking/readiness groups, native controls and one consolidated stylesheet. The previous ruled-index visual constraint was replaced at the user’s request; see [the redesign record](docs/family-ui-redesign-2026-11-15.md). Keep the structured `food-index` and `variant-data` nodes, canonical links and heading/field semantics usable by assistive technology and agents. Do not create a separate agent interface for visual changes.

`npm run test:browser` runs the complete 12-group workflow, including 150 recipe/preset visits, responsive layouts, fuzzy search, saved settings, old links, no-JavaScript reading and consent. The language, regional, clarity, expansion and analytics commands select their corresponding groups from the same suite. Tests intercept Google requests; do not treat test output as real cooking or GA4 ingestion evidence.

## Analytics and privacy

The supplied dedicated stream is `16326517771`, with public measurement ID `G-B34CBGW0EF`. Configure `PUBLIC_GA_MEASUREMENT_ID` in the production environment; the local `.env.local` is ignored. The identifier is public, not an authentication secret.

The build enables analytics only for `VERCEL_ENV=production`. Optional Google tags load only after a user grants consent, and can be rejected or withdrawn. Events include collection, language and measurement preferences. Page-location values omit queries, and raw search text is not sent. Cookies are explicitly scoped to the tool hostname; preference storage is origin-local. Analytics is off in local and preview builds. See [deployment steps](docs/deployment.md) for the required GA4 property configuration before release.

埋点、有效阅读、QA隔离、漏斗与后台配置记录见 [GA4 v2 口径](docs/analytics-v2.md)。运行 `npm run test:analytics` 验证业务触发，`npm run test:analytics-sdk` 以实际 Google SDK 检查事件包；收集请求均在派发前拦截。

## Deployment

Use an independent Vercel project, the Astro preset, `npm run build`, and output `dist`. Connect only `airfryer.ybwdaisy.com`, using the DNS records Vercel actually returns. Production release follows preview acceptance. No wildcard DNS or parent-domain redirect is needed.

## Verification limits

Data schema checks do not prove cooking accuracy. Browser checks do not prove physical cooking results, search-engine indexing, DNS propagation, or live GA4 ingestion. The source audit notes and UI review in `docs/` distinguish those boundaries.
