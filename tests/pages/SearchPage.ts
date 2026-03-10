import { Page, expect } from '@playwright/test'

export class SearchPage {
  readonly page: Page
  constructor(page: Page) { this.page = page }

  async goto() {
    await this.page.goto('https://www.amazon.com')
  }

  async search(term: string) {
    await this.page.evaluate(() => {
      const selectors = ['.glow-toaster', '.glow-toaster-overlay', '.a-modal', '.a-popover', '#a-popover-root', '[role="alertdialog"]']
      selectors.forEach(s => Array.from(document.querySelectorAll(s)).forEach(n => n.remove()))
    })
    const search = this.page.locator('input#twotabsearchtextbox, input[name="field-keywords"], input[aria-label*="Search"]').first()
    await expect(search).toBeVisible({ timeout: 20000 })
    await search.fill(term)
    await search.press('Enter')
    await this.page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 30000 })
  }

  async openFirstResult() {
    await this.page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 30000 })
    const first = this.page.locator('[data-component-type="s-search-result"]').first()
    const link = first.locator('h2 a, a').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await link.scrollIntoViewIfNeeded()
    const href = await link.getAttribute('href')
    try {
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
        link.click({ force: true })
      ])
    } catch (e) {
      if (href) await this.page.goto(new URL(href, 'https://www.amazon.com').toString())
    }
  }
}
