import { defineConfig } from 'vite';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

// No classicEmberSupport(): it requires an ember-cli project, and this app
// deliberately has no ember-cli-build.js. The classic addon pipeline is covered
// by the docs app's embroider-safe / embroider-optimized scenarios.
export default defineConfig({
  plugins: [
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
