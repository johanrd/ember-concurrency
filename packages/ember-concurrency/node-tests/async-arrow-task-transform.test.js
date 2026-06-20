'use strict';

// Smoke test that the async-arrow task Babel transform runs against the
// installed @babel/core. Run under both Babel 7 and Babel 8 in CI to guard
// against version-gate regressions (see api.assertVersion in the transform).
//
// Set EXPECT_BABEL_MAJOR=7|8 to additionally assert which @babel/core the
// test actually resolved, so a misresolved version fails loudly in CI.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transformSync, version } = require('@babel/core');
const plugin = require('../async-arrow-task-transform.js');

const INPUT = `
import { task } from 'ember-concurrency';
class Foo {
  myTask = task(async (ms) => {
    await wait(ms);
    return ms + 1;
  });
}
`;

test(`async-arrow task transform runs under @babel/core ${version}`, () => {
  const expectMajor = process.env.EXPECT_BABEL_MAJOR;
  if (expectMajor) {
    assert.equal(
      version.split('.')[0],
      expectMajor,
      `expected @babel/core ${expectMajor}.x, resolved ${version}`,
    );
  }

  const { code } = transformSync(INPUT, {
    filename: 'foo.js',
    plugins: [plugin],
    babelrc: false,
    configFile: false,
  });

  // the async arrow task should become a generator function with await -> yield
  assert.match(
    code,
    /generator: function\s*\*/,
    'expected a generator function',
  );
  assert.match(
    code,
    /yield wait\(ms\)/,
    'expected await to be converted to yield',
  );
  assert.match(
    code,
    /_buildTask/,
    'expected the buildTask runtime import/call',
  );
  assert.ok(!/async\s*\(/.test(code), 'expected no async arrow to remain');
});
