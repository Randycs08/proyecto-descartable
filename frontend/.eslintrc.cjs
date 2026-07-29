module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // No usamos PropTypes (proyecto en JS sin validación de tipos en runtime);
    // la validación de props se hace por diseño de cada componente.
    'react/prop-types': 'off',
  },
}
