/* eslint-env node */

module.exports = {
  plugins: [
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-optional-chaining'
  ],
  presets: [
    '@quasar/babel-preset-app',
    '@babel/preset-react'
  ]
}
