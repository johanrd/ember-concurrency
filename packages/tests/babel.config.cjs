const { buildMacros } = require('@embroider/macros/babel');

const macros = buildMacros({
  // test-helper.ts calls setTesting() at runtime, which compile-time macros
  // would otherwise fold away into a constant.
  configure(m) {
    m.enableRuntimeMode();
  },
});

module.exports = {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allExtensions: true,
        allowDeclareFields: true,
        onlyRemoveTypeImports: true,
      },
    ],
    [
      'babel-plugin-ember-template-compilation',
      { transforms: [...macros.templateMacros] },
    ],
    // The addon's own transform, exercised here the way consumers apply it.
    require.resolve('ember-concurrency/async-arrow-task-transform'),
    [
      'module:decorator-transforms',
      {
        runtime: {
          import: require.resolve('decorator-transforms/runtime-esm'),
        },
      },
    ],
    ...macros.babelMacros,
  ],

  generatorOpts: {
    compact: false,
  },
};
