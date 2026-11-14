// Browser coverage follows the kitchen-settings workflow; historical controls have been retired.
process.argv.push('--suite=routes');
await import('./kitchen-browser.mjs');
