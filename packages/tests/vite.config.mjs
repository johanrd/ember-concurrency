import { defineConfig } from 'vite';
import { extensions, ember, classicEmberSupport } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

// ember-source only became a v2 addon in 6.1. Older releases need Embroider's
// classic compat pipeline, which is what classicEmberSupport() turns on (and
// what ember-cli-build.js is here for). Modern Ember doesn't need it, so it
// stays off by default to keep the common build lean.
const isCompat = Boolean(process.env.ENABLE_COMPAT_BUILD);

export default defineConfig({
  plugins: [
    ...(isCompat ? [classicEmberSupport()] : []),
    ember(),
    babel({
      babelHelpers: 'inline',
      extensions,
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        tests: 'tests/index.html',
      },
    },
  },
});
