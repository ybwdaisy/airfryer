# Published funnel configuration

`funnels.json` is the sole editable funnel definition. The three initial stable IDs, steps, filters and 1800-second intervals come from the confirmed product seed. Its five event names are checked against `src/lib/analytics-contract.ts`; declaring an invented event in this JSON cannot make it valid.

Read the [public v1 contract](https://site-pulse-nine-tau.vercel.app/contracts/funnels-v1.md) and [schema](https://site-pulse-nine-tau.vercel.app/contracts/funnels-v1.schema.json) before editing tracking/funnels or releasing. Update the revision when changing configuration. Do not put credentials, personal data or metric results into this public file. Changes made independently in Google Explore are not imported automatically.

- `npm run funnels:generate` validates the source and copies its exact bytes to the ignored generated `public/.well-known/site-pulse.json`.
- `npm run funnels:check` rejects missing or mismatched delivery files. `npm run build` generates before Astro and verifies both the public file and `dist/.well-known/site-pulse.json` afterward.
- `npm run funnels:contract` downloads only the public JSON/Markdown and requires byte equality with `contracts/`. No remote JavaScript is executed. Review/cache a new authoritative contract explicitly; the check never silently replaces it.
- The cache supports offline local builds and tests. CI and Vercel builds require the online contract to be available and identical; failure blocks the build. GitHub CI also retains the complete intercepted, offline analytics checks.

Published URL: `https://airfryer.ybwdaisy.com/.well-known/site-pulse.json`. The consumer controls caching, refresh, QA filters and custom overrides. This file supplies configuration, not GA4 measurements or proof of ingestion. Readback uses HTTP without a page, SDK or analytics event.

On a proxy-only Mac with Node 24, prefix online checks with `NODE_USE_ENV_PROXY=1` so Node uses the existing proxy environment. This does not change the equality checks or permit an offline CI fallback.
