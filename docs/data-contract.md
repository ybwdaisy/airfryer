# Food data contract

Research files are JSON arrays in `src/data/foods-a.json` and `foods-b.json`.
Each food has `slug`, `name`, `aliases: string[]`, `category` (meat, seafood, vegetables, frozen, bakery, reheat), `description` (one short original sentence), `safety` (poultry, ground-meat, whole-meat, fish, shellfish, leftovers, or null), `reviewedAt` (2026-11-12), and `variants`.

Each variant has `id`, `label`, `state` (fresh, frozen, ready-to-bake, reheat), `temperatureF` (number), `minutes` ([minimum, maximum], same values for a fixed time), `portion` (precise starting condition, amount/size/preparation), `preheat` (yes, no, unspecified), `turn` (short instruction or not required/unspecified), `steps` (2–4 short original instructions), `notes` (string[]), and `sources`.

Each source has `title`, `publisher`, `url`, `role` (reference or cross-check), `locator` (section/table row/page), `evidence` (concise paraphrase of actual observed temperature/time/portion/preheat; no copied paragraphs). The reference source must support the displayed temperature/time and starting conditions exactly. At least two independently authored sources are required per variant. Do not combine incompatible source times into a made-up range; one reference sets the guidance and the other corroborates context or records differences explicitly. Store both references and the reason for differing times in notes.

Optional `variant.safetyOverride: {text, url}` replaces the generic center-temperature guidance where the manufacturer's product directions are stricter (for example a specific raw breaded fish product requiring 165°F).

Use publicly accessible actual pages and manuals; never invent values or citations. These are researched reference guides, never first-hand tested recipes. Manufacturer instructions and package directions take precedence for an individual product. A frozen raw product is not interchangeable with a precooked one. Only add adjustment variants when separately sourced; no generic multipliers. If sources cannot be substantiated, record the candidate in `docs/research-gaps.md` instead of publishing invented data, and report the gap.

Food count is 50 distinct search subjects; fresh/frozen/reheat variants and aliases do not increase it. Cooking temperatures use the reference source's °F, or a converted °C reference (record original units). UI °C values are appliance-setting approximations rounded to 5°C; safety temperatures are separate, using official exact displayed pairs. Non-US names are aliases; do not automatically treat the ambiguous bare word chips as fries.
