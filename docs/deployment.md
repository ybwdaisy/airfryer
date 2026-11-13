# Independent deployment checklist

Release remains separate from local preview acceptance. Do not modify the existing personal homepage project.

## Vercel and DNS

1. Connect private repository `ybwdaisy/airfryer` to a new project named `airfryer`. Production branch is `main`; feature branches create previews.
2. Use Astro static output, Node.js 24, build `npm run build`, output directory `dist`.
3. Set `PUBLIC_GA_MEASUREMENT_ID=G-B34CBGW0EF` in Production only. Vercel supplies `VERCEL_ENV`; never force it to production for Preview.
4. After preview acceptance, merge the reviewed PR and verify the production build. Add `airfryer.ybwdaisy.com` to this new project.
5. Inspect existing DNS records for `airfryer` before changing them. Add or update only the CNAME and any ownership verification explicitly required by Vercel, at the authoritative DNS provider. Use Vercel's actual per-project target, not a memorized universal hostname. Preserve apex, www, MX, TXT and unrelated records; do not change nameservers or create a wildcard.
6. Verify DNS propagation, certificate validity, HTTPS, canonical links, HTML status codes and 404. Confirm the personal homepage still responds normally.
7. If a release fails, roll back this project's deployment. A first-time DNS rollback removes only newly introduced tool records or restores their recorded prior values.

## GA4 release configuration

User-supplied Web data stream: `16326517771`; measurement ID: `G-B34CBGW0EF`.

- This is an existing stream shared with the personal homepage and Peptide Tools. Preserve its name, website URL and property-wide settings. Filter Airfryer reports by hostname exactly equal to `airfryer.ybwdaisy.com`; do not treat property totals as this tool's traffic.
- Enhanced Measurement was disabled for the shared stream through a separately authorized task on 2026-11-12. Verify it remains off before enabling analytics here. A change to this shared setting requires explicit authorization because it affects other sites.
- Keep Google Signals and advertising personalization off in this app's tag configuration. Do not change shared retention, advertising links or other sites' settings as part of this deployment.
- The app queues global query-free location, origin-only referrer and `send_page_view: false` defaults before Google tag initialization, then applies the same stream configuration. This prevents the shared tag from sending a default page view before its per-stream config is processed. It explicitly sends one page view after consent. Tool events are `food_search`, `search_no_results`, `food_select`, `category_select`, `condition_change`, `unit_change`, `language_change`, and `region_change`; events also carry food collection, interface language and measurement units.
- Exercise the actual Google SDK with a synthetic query and block collection transport before dispatch. Check every packet for query strings and duplicate page views; a mocked SDK or only inspecting the app's dataLayer does not cover destination initialization. Blocked diagnostic packets do not prove ingestion.
- Check Tag Assistant/DebugView with explicit test consent, then revoke it. Confirm no tag loads for rejection, raw search text is absent, and the cookie domain is the tool hostname. Exclude test activity when assessing demand.
- Do not describe the stream as receiving live data until a real production event is observed in the correct stream. The local browser suite intercepts Google traffic and is not ingestion evidence.

## Search Console

Create or use a URL-prefix resource for `https://airfryer.ybwdaisy.com/`. Use an existing Domain-property verification if available, or add only the specific required verification artifact. Submit `https://airfryer.ybwdaisy.com/sitemap.xml` and inspect sample food URLs. Preview builds remain noindex and robots-disallowed; production builds allow crawling. Indexing and ranking are not guaranteed.
