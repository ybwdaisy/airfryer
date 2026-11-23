# Airfryer first SEO / search-answer pass

Scope: existing chicken breast, frozen fries and chicken wings entry families. No new article routes, recipe clocks, ingredient quantities, native device settings, analytics events or funnel definitions. Original source/cooking JSON, favorites, timer, settings and consent boundaries are preserved.

## Before evidence and technical decisions

The production baseline is commit `76c2871` (PR #22). Static HTTP evidence for 24 requests, the 248 canonical sitemap URLs and six isolated mobile/desktop screenshots are retained under ignored `output/seo-round1/before/`. Static reads execute no SDK. Browser visits enter `analytics_test=1` with Google SDK/collection transport intercepted before navigation.

- Production `robots.txt` already allows public crawling with `User-agent: *`; this covers Googlebot, Bingbot, OAI-SearchBot and PerplexityBot. No redundant bot-specific rules or AI-training preference changes are needed. Settings/error pages remain noindex and absent from the sitemap. The app has no newly opened account/API/result route.
- Canonical recipe URLs remain separate for substantive Celsius and Fahrenheit preparations. English and Chinese translations link reciprocally to the same source preparation, not to a different recipe. Legacy directory/category aliases keep the existing unified canonical.
- Six source preparations in two languages receive clearer titles/descriptions and server-rendered applicability questions, source links and same-preparation related links. H1 remains the actual dish name. Native disclosures preserve a compact cooking flow and keep all answers in public HTML without JavaScript.
- Only those 12 materially updated pages receive `2026-11-23` lastmod and a visible applicability-notes update date. Recipe-source review dates retain their original meaning. A WebPage object reflects that visible content/date alongside the existing breadcrumb; no Recipe/FAQ rich-result, rating, review, author qualification or cooking-test claim is invented.
- `npm run seo:check` runs during builds and checks all 248 sitemap pages, indexability, canonical self-reference, reciprocal real-language alternates, one H1, metadata, changed-page structured data and lastmod boundaries. CI retains the common funnel contract checks and full offline analytics isolation, and adds phone/desktop entry regressions.

## Evidence for content

Existing recipe instructions remain authoritative for portion, state, preparation, preheat, time and fryer setting. Applicability wording makes their limits explicit; it never derives a frozen-food or weight-to-time conversion.

- [Feel Good Foodie](https://feelgoodfoodie.net/recipe/air-fryer-chicken-breast/): first seasoned breast preparation, 6 oz portions, leveling the thick end, marination, preheat, turn and rest. Separate brined size choices are not collapsed into it.
- [Kitchen Sanctuary](https://www.kitchensanctuary.com/air-fryer-chicken-breast/): approximately 180 g breasts and evening the thick end. No fixed centimetre threshold is invented.
- [Skinnytaste](https://www.skinnytaste.com/air-fryer-chicken-wings/): split wings, single-layer batches and appliance-dependent preheating; no invented universal preheat duration or frozen-wing clock.
- [Air Frying Foodie](https://airfryingfoodie.com/air-fryer-frozen-french-fries/): follow the preheated recipe card as one method; its optional no-preheat FAQ supplies no separate cold-start clock. The regular and shoestring source choices remain distinct.
- [Philips HD9200 manual](https://dam.versuni.com/m/9ba057f49c7b7a3/original/User-manual-HD9200.pdf): PDF p7 food table lists 7×7 mm frozen fries, 200–500 g, 180°C, 16–23 minutes; p8 explicitly says preheating is unnecessary. Frozen thin fries and homemade 10×10 mm fries are separate conditions. The site's 200 g example remains an editorial choice within the recorded range.
- [FoodSafety.gov](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures) and [USDA FSIS probe placement](https://ask.fsis.usda.gov/article/How-to-use-a-food-thermometer): the US poultry center check and correct probe location. [Hong Kong CFS](https://www.cfs.gov.hk/english/trade_zone/safe_kitchen/Cooking_and_reheating.html): 75°C for 30 seconds at the center for the existing Celsius preparations. These food-center checks are kept distinct from fryer settings.

## Search-engine guidance

[Google AI-search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) supports useful, crawlable, source-backed content rather than mass-generated pages or special GEO markup. [Google language alternates](https://developers.google.com/search/docs/specialty/international/localized-versions) requires reciprocal, genuine variants. [OpenAI crawler docs](https://developers.openai.com/api/docs/bots) and [Perplexity crawler docs](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) distinguish search fetching from model training. No account-console action is part of this repository change.

## Explicit IndexNow notification

A public, domain-scoped key file and `seo/indexnow.json` require no paid service or deployment secret. The versioned `seo/changes-2026-11-23.json` lists only the 12 substantively updated canonical recipe URLs.

- `npm run indexnow` is a no-network dry run.
- After production key readback, `NODE_USE_ENV_PROXY=1 npm run indexnow -- --changes seo/changes-2026-11-23.json --submit` checks the production key, each canonical/indexable URL and a recent release date, then sends one bounded batch to the official endpoint. The proxy prefix is only for Macs that need their existing proxy environment.
- Accepted or ambiguous attempts are recorded under ignored `output/indexnow/`; the same payload is not automatically resubmitted. Submission is never a build/CI hook. A new actual content change needs a reviewed change list; unchanged URLs are not re-notified.
- [IndexNow documentation](https://www.indexnow.org/documentation) distinguishes 200 received from 202 pending key validation. [The FAQ](https://www.indexnow.org/faq) states notification is not proof of indexing. Production receipt/status and verification are reported after deployment, without claiming rankings, citations or indexing.

The shared funnel manifest revision and all event IDs/filters/windows remain unchanged. GSC/Bing console URL inspection is handled by the coordinating Site Pulse conversation.

## Local verification before PR

50 unit tests and type checking pass. The production metadata gate verifies production indexing/GA configuration and restores safe preview output. All 248 canonical pages pass SEO checks, with lastmod on exactly 12 updated pages. The original 14 kitchen groups, the complete offline analytics isolation cases and 13 SEO browser groups pass; the new matrix visits 36 entry/language/viewport combinations at 320/390/1280px and exercises favorite/timer/reload behavior. No browser page errors or Google requests were observed. Before/after recipe and cooking-plan JSON matches on all 12 entry URLs.

Hallmark's rendered local check reports no FAIL/REFLEX/WARN; existing documented touch-size and source-title waivers remain. An independent fresh-context reviewer inspected actual phone/desktop screenshots, the source-bound wording, canonical/alternate/date/structured-data boundaries and IndexNow guards, independently reran the 248-page checks and notification tests/dry run, and returned `ship`. Production alias readback and the one IndexNow notification remain separate post-deployment checks; neither indexing nor search/AI visibility is claimed here.
