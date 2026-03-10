const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://www.amazon.com',
    specPattern: 'cypress/e2e/**/*.spec.{js,ts}',
    supportFile: false,
    defaultCommandTimeout: 15000,
    video: false,
  },
})
