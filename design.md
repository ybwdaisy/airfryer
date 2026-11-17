# Airfryer: a tool used in the kitchen

The user explicitly replaced the previous locked, ruled-index design on 2026-11-15. Simplicity is a means to help ordinary households cook, not a requirement to flatten every kind of content into text rows.

## People and task

- People arrive with a particular food and a particular starting condition. Search, recognizable food categories and clear preparation requirements help them choose a method.
- They read on a phone while cooking. Keep units attached to numbers, make temperature/time easy to find again, and provide comfortable targets and readable steps.
- A recipe is not a guarantee of doneness. Keep the exact quantity, state, preheating, turning and finish checks. Never replace these with a large attractive number alone.

## Visual system

- Use the solid appliance/timer mark from `public/logo.svg`, red action/focus signal, self-hosted DM Sans and PingFang/system Chinese. The user replaced the earlier open-basket mark on 2026-11-16. Header, browser and home-screen exports share this single master. Use a brighter neutral ground and restrained warm surfaces for preparation and cooking parameters.
- The home is a food directory, not a marketing page or a spreadsheet. Category photographs help recognition. Following the user's 2026-11-17 review, recipes use a compact single-column list at all widths, with natural row heights rather than equal-height cards. On phones the name/starting condition sits left and temperature/time sits right; required advance preparation follows below. Desktop gives the two values separate columns. The whole item remains a link. Summaries may remove repetition and move detailed stages into the guide; preserve raw/frozen/cooked restrictions, mandatory preparation and whether the time covers air frying only.
- English on phones and narrow tablets uses the row's full width for the name and starting condition, with temperature and time paired below. Long English words must not compete with a side column. Chinese keeps its compact side-by-side layout. Do not truncate important qualifiers or shrink the type to force either language into the other's layout.
- Photographs belong only to category navigation. They do not claim to show a particular recipe, portion, raw/frozen state or a test result. Host small licensed files locally, preserve provenance and keep their attribution in native footer disclosure. Do not repeat a category image as a fake recipe photo.
- The recipe leads with the food and exact starting condition, then mandatory preparation, then cooking settings. Ingredients, numbered steps and finish checks follow with clear visual grouping. Tools, extra timeline detail and source evidence use existing native disclosures.
- Desktop can put safety/source shortcuts alongside the main recipe; phones follow a single reading column. Nothing important relies on hover, animation or colour alone.
- Settings remains one saved kitchen preset plus an independent interface language. Keep native selects, a visible save action and truthful saved/temporary feedback.

## Implementation boundaries

- No route, condition ID, source anchor, link destination, recipe fact, consent text or analytics contract is retired by this redesign.
- Keep the original forms, names, data hooks, structured food/variant JSON and URL/storage behavior. Recompose markup within its owner; do not introduce a UI framework, duplicate data store or custom control engine.
- New styling belongs to the existing tokens, base and consolidated app stylesheet. Semantic icons assist existing labels; they never replace labels or suggest unsupported functionality.
- Verify mobile/desktop, both languages and saved presets, state-aware search, no-JavaScript reading, keyboard focus, source navigation, consent and privacy in a real browser. A source review is not a physical cooking test.
