'use strict';

const { embroiderSafe, embroiderOptimized } = require('@embroider/test-setup');

// The docs site is pinned to a released Ember. Coverage across the supported
// Ember range — including release/beta/alpha — lives in packages/tests, which
// builds with Embroider 4 and can therefore reach Ember 7.
module.exports = async function () {
  return {
    usePnpm: true,
    scenarios: [
      {
        name: 'ember-lts-4.8',
        npm: {
          devDependencies: {
            'ember-source': '~4.8.0',
            '@glimmer/component': '^1.1.2',
          },
        },
      },
      {
        name: 'ember-lts-4.12',
        npm: {
          devDependencies: {
            'ember-source': '~4.12.0',
          },
        },
      },
      {
        name: 'ember-5.0',
        npm: {
          devDependencies: {
            'ember-source': '~5.0.0',
          },
        },
      },
      {
        name: 'ember-lts-6.4',
        npm: {
          devDependencies: {
            'ember-source': '~6.4.0',
          },
        },
      },
      {
        name: 'ember-default-with-coverage',
        env: {
          COVERAGE: true,
        },
        npm: {
          devDependencies: {},
        },
      },
      {
        name: 'ember-default',
        npm: {
          devDependencies: {},
        },
      },
      {
        name: 'tsc',
        command: 'pnpm tsc --project tsconfig.types-tests.json',
      },
      embroiderSafe({
        npm: {
          devDependencies: {
            '@embroider/core': '^3.5.7',
            '@embroider/compat': '^3.8.5',
            '@embroider/webpack': '^4.1.1',
          },
        },
      }),
      embroiderOptimized({
        npm: {
          devDependencies: {
            '@embroider/core': '^3.5.7',
            '@embroider/compat': '^3.8.5',
            '@embroider/webpack': '^4.1.1',
          },
        },
      }),
    ],
  };
};
