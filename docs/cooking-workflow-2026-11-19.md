# Cooking workflow preview — 2026-11-19

The user approved learning from the locally reviewed CrispTime app: stronger visual hierarchy and a practical path from food discovery into cooking. This implementation is a local review build, not a production release.

## Experience

- Warm ground and light surfaces separate discovery, recipe summaries and cooking settings. Summary heights follow their content; phones use one column and full-width names. Category photographs remain category illustrations, not claimed recipe results.
- Recipe bookmarks persist in the current origin's browser storage and synchronize across tabs. There is no account or upload. Failed writes do not show a saved state. Bookmarks in another native temperature scale remain discoverable without actionable converted settings.
- Filters are explicit: “Air fry ≤15 min” tests the maximum air-frying range and excludes methods needing a hob; it never claims total preparation takes 15 minutes. “No hob needed” uses the existing `needsHob` field. Query/category/filter restoration and the starting-state search rules remain intact.
- A compatible recipe displays starting state, quantity, mandatory preparation and source preheating instructions before its start button. One press starts the timer and opens the running clock. There is no preparation checkbox or second start screen. Incompatible methods cannot start a new timer.
- The timer begins at the lower bound of the sourced range as a first-check timer. It never averages ranges or translates a cooking setting. Reference ranges remain visible.
- Explicit source turn/shake/check times create individually tracked reminders, including multiple points and recurring intervals. For a source time window, the first bound is used as an initial check prompt. Unknown or negative instructions do not invent an alarm. A reminder remains until acknowledged; the source instruction is always available.
- Each stage stops for checking. Moving to the next stage requires the user to confirm the next fryer setting; no automatic temperature change or phase advancement is implied. The last stage presents the recipe's finish checks, not a claim of doneness.
- Pause, add one minute, minimize, cross-page dock and reload recovery use absolute deadlines. Bilingual plan copy keeps the active recipe readable after a language change. Changing the kitchen preset does not convert an already-running timer.
- Opening the same running timer preserves its progress; the recipe start action resumes a paused timer. Starting a different recipe shows the target recipe and current timer with two separated full-width choices. One explicit “Switch & start” action replaces and starts it; keeping the current timer never resets it. Ending an unfinished timer requires confirmation. Snapshots are versioned, bounded and validated; snapshots older than 24 hours do not silently restart.
- Sound is opt-in and initialized by a user action. Sound and wake-lock options use large pressed-state buttons, with no checkbox. Screen wake lock is optional and released on pause, completion, page hiding and navigation. The interface states that locked/background alerts are not guaranteed. Browser checks do not prove physical iOS locked-screen behavior.

## Preserved boundaries

All 115 recipes, 121 sourced conditions, ingredient quantities, temperatures, stages, time ranges, product/state restrictions, source records, historical links and anchors are preserved. Settings migration, native presets, language independence, consent gating and query-free analytics remain intact. No generic oven-conversion formula, nutrition/diet claim, synthetic recipe photography or new external service was introduced.

Favorites use `airfryer:favorites:v1`; active timing uses `airfryer:cooking:v1`. These are origin-local. No timer snapshot, saved collection, raw query or user note is sent to analytics. Opt-in events describe interactions; they do not prove cooking success or food safety.

## Verification

- `npm run check`, `npm test`, `npm run build`.
- Existing 14-group browser suite and new 9-group `test:cooking` suite, with Google transport intercepted.
- Phone/desktop captures in both languages and native presets, including 320px long English, preparation, active timer, stage checkpoint and the cooking dock.
- Hallmark before/after hook and link preservation; independent finish review.
- No physical kitchen test or locked-screen alarm validation is claimed.

Final local result: 37 unit tests; 23 browser groups (14 preserved, 9 new); Astro check without diagnostics; 264-page build; production metadata gate followed by restored safe preview; Hallmark 0 FAIL/0 REFLEX/0 WARN after documented static-caption false-positive checks. All 286 links, 11 fields, 4 test hooks and 33 figures in the before record remain. Two search headings were reworded on record. Independent review identified reminder completeness and an outdated design contract; both are resolved and verified.

## Hands-busy workflow revision

The user rejected the preparation checkbox and repeated start steps. The revised normal path is two taps from the library: open recipe, start timer. Required preparation and preheat are shown before starting, not removed. Both replacement and end confirmations have 56px buttons in a single column with a 12px gap. Only abandoning an active timer and changing a physical stage setting retain explicit decisions.

Revision verification: 9 cooking groups and 14 preserved kitchen groups pass with no page errors; 37 unit tests pass; Astro reports zero errors/warnings/hints and build emits 264 pages. An independent reviewer checked all 12 mobile captures and the updated result report and marked the revised flow ready for local review. The 56px cooking controls intentionally exceed the generic Hallmark control-size heuristic for hands-busy use.
