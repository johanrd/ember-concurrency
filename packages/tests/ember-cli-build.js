'use strict';

// Only used when ENABLE_COMPAT_BUILD is set, which turns on classicEmberSupport()
// in vite.config.mjs so the suite can build against v1-era ember-source.
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {
    'ember-cli-babel': { enableTypeScriptTransform: true },
  });

  return compatBuild(app, buildOnce);
};
