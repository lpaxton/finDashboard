#!/usr/bin/env node
'use strict';
/*
 * Copies createMock() from src/mock-core.js into the dashboard's embedded mock section.
 *
 *   npm run sync-mock
 *
 * The dashboard carries its own copy so it can run offline as a demo. Run this after any
 * change to src/mock-core.js; test/server.test.js fails if the two copies drift.
 * When the dashboard becomes a real project (HANDOFF section 10, step 3), drop the embedded
 * copy and this script with it.
 */
const fs = require('node:fs');
const path = require('node:path');
const { extractMockCore, extractEmbeddedMock, CORE, DASHBOARD } = require('./mock-source');

const root = path.join(__dirname, '..');
const dashPath = path.join(root, DASHBOARD);
const core = extractMockCore(fs.readFileSync(path.join(root, CORE), 'utf8'));
const dash = fs.readFileSync(dashPath, 'utf8');

if (extractEmbeddedMock(dash) === core) {
  console.log('Already in sync.');
  process.exit(0);
}
// The replacement is passed as a function so that $-sequences in the mock source
// (for example the "$" in 'About $') are copied literally, not read as replace() patterns.
fs.writeFileSync(dashPath, dash.replace(extractEmbeddedMock(dash), () => core));
console.log(`Copied createMock() from ${CORE} into ${DASHBOARD}.`);
