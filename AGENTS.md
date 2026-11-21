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
