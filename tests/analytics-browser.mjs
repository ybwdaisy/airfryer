// Browser coverage follows the kitchen-settings workflow; historical controls have been retired.
process.argv.push('--suite=analytics');
await import('./kitchen-browser.mjs');

await import('./analytics-isolation.mjs');
