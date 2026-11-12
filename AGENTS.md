# Project instructions

- This is an independent static tool at `airfryer.ybwdaisy.com`. Do not modify the separate personal homepage project as part of tool work.
- Keep food data provenance explicit. Never generate cooking parameters from unsupported formulas, infer raw/precooked equivalence, or turn schema/browser checks into claims of physical cooking tests.
- Each public condition needs two independently authored source records. Preserve its exact preparation and product restrictions. Official internal-temperature guidance is distinct from appliance settings; stricter product requirements override generic guidance.
- Use the established Hallmark app design for local changes. New visual work follows the user's global Hallmark preference. Do not turn this working tool into a marketing landing page.
- Run appropriate data validation, `npm run check`, `npm test`, and `npm run build`. For behavior changes, run the focused browser suite against a running preview. Intercept analytics requests in tests; local and preview builds must remain untracked and noindex.
- Keep `.env.local`, Vercel local state, browser outputs and screenshots out of Git. Public GA4 measurement IDs are configuration, not credentials.
- Keep each product's analytics and browser preferences scoped to its own hostname/origin.
