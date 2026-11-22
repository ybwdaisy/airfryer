# Project instructions

- This is an independent static tool at `airfryer.ybwdaisy.com`. Do not modify the separate personal homepage project as part of tool work.
- Keep food data provenance explicit. Never generate cooking parameters from unsupported formulas, infer raw/precooked equivalence, or turn schema/browser checks into claims of physical cooking tests.
- Each public condition needs two independently authored source records. Preserve its exact preparation and product restrictions. Official internal-temperature guidance is distinct from appliance settings; stricter product requirements override generic guidance.
- Use the established Hallmark app design for local changes. New visual work follows the user's global Hallmark preference. Do not turn this working tool into a marketing landing page.
- Run appropriate data validation, `npm run check`, `npm test`, and `npm run build`. For behavior changes, run the focused browser suite against a running preview. Intercept analytics requests in tests; local and preview builds must remain untracked and noindex.
- Keep `.env.local`, Vercel local state, browser outputs and screenshots out of Git. Public GA4 measurement IDs are configuration, not credentials.
- Keep each product's analytics and browser preferences scoped to its own hostname/origin.

## Analytics test isolation

- Production development/acceptance visits must use `?analytics_test=1` (also accepts `?qa=1`). QA mode is stored in both sessionStorage and localStorage before consent; it survives navigation and new same-origin tabs. Use `?analytics_test=0` in a normal browser to explicitly reset it. Automated browsers remain excluded even with a reset flag.
- QA and automated visits must never load the GA4 SDK or send events, including page views, learning/tool actions and checkout/purchase. Local/preview origin gates and normal visitors' consent behavior must stay intact.
- Intercept all Google collection endpoints before every automated production visit. SDK contract fixtures may simulate a human browser only after transport interception is installed; never allow a test event to reach real GA4.
- Historical unmarked visits cannot be reliably identified. Do not guess exclusions from country, device, small counts or entire dates; preserve explicitly documented legacy rules.
- Interception must be installed before navigation and cover Google SDKs and all collection transports, including `collect`, `g/collect`, beacon, batch and unload requests. Do not rely only on `navigator.webdriver`. If the tool cannot intercept transport, use local/preview instead; never send a real GA4 test event to verify a 204 response.
- Validate QA zero-SDK/zero-send behavior, navigation before consent, cross-page/same-origin-tab persistence and explicit human reset. Normal-event contracts may simulate a human only in an intercepted offline fixture. Never relax production isolation to satisfy older tests.
- Before releasing any feature branch, include/preserve main's PR #20 isolation implementation (merged as `601798ef3aadb91079c2a00bd19a831372b80234`), `src/lib/analytics-traffic.ts`, collection guards in `src/scripts/analytics.ts`, `tests/analytics-isolation.mjs` and the intercepted analytics fixture/contract scripts. An old feature branch must not roll them back. Synchronizing these instructions does not authorize merging main or deploying.
- QA flags are independent per product origin. Exit manual QA explicitly with `?analytics_test=0`; never assume another product's flag covers this hostname. Do not activate permanent GA4 data filters or guess historical QA from country, device, low traffic or entire dates.
