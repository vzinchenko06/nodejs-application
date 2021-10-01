module.exports = {
  plugins: ['jest'],
  env: {
    browser: true,
    node: true,
    commonjs: true,
    es2020: true,
    'jest/globals': true
  },
  extends: ['eslint:recommended', 'prettier'],
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }]
  }
};
