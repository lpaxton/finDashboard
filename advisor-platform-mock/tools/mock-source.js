'use strict';
/*
 * Locates the createMock() source in both places it lives, so the sync script and the
 * drift test agree on what "the same code" means. See tools/sync-mock.js.
 */
const CORE = 'src/mock-core.js';
const DASHBOARD = 'dashboard/index.html';
const OPEN = 'function createMock() {';

/* Everything from the opening line up to the marker that follows it, trailing blanks trimmed. */
function between(text, after, where) {
  const start = text.indexOf(OPEN);
  if (start === -1) throw new Error(`No "${OPEN}" in ${where}.`);
  const end = text.indexOf(after, start);
  if (end === -1) throw new Error(`No "${after.trim()}" after createMock() in ${where}.`);
  return text.slice(start, end).trimEnd();
}

const extractMockCore = (text) => between(text, '\nmodule.exports', CORE);
const extractEmbeddedMock = (text) => between(text, '\nconst Mock = createMock();', DASHBOARD);

module.exports = { extractMockCore, extractEmbeddedMock, CORE, DASHBOARD };
