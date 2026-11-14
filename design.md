# Airfryer app design

This is a cooking lookup tool. Each page should make its task clear through layout and native controls.

- Keep the existing warm paper, red action colour, DM Sans and Chinese system font tokens. Red identifies an action or focus, not decoration.
- Use one centred container, a quiet header and ruled recipe rows. Temperature and time align in stable columns; units remain attached to values. On phones the food stays left and its settings stay right.
- Search, category links and saved kitchen settings remain the primary controls. Use direct labels, no slogans or explanatory introductions. Preserve labels needed to operate fields and feedback needed to recover from failures.
- Recipe pages lead with the food, starting condition, portion, required advance preparation and appliance settings. Keep ingredients, numbered instructions and finish checks readable. Use native disclosure for tools and supplementary timeline detail.
- Preserve source facts, warnings that change preparation, source records, consent text, routes, condition IDs, anchors, analytics events and saved preferences. Generic duplicate explanations can be removed; factual recipe descriptions can move to recipe notes.
- Keep native links, forms, selects, lists, headings and details elements. Retain the structured food index and variant data. Do not add a UI library, custom state machine or separate agent interface for visual simplification.
- All new styling belongs to the existing token system and consolidated stylesheet, not a new stack of overrides. Verify mobile, desktop, keyboard, no-JavaScript and existing functional flows in a real browser.
