const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://www.amazon.com',
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.cy.js',
    video: false
  }
})
