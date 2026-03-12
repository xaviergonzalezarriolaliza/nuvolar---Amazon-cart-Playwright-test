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
    // Wait for any common search result container (covers different Amazon layouts)
    await this.page.waitForSelector('[data-component-type="s-search-result"], div.s-result-item, div[data-asin], #search .s-main-slot .s-result-item', { timeout: 30000 })
  }

  async openFirstResult() {
    const containers = '[data-component-type="s-search-result"], div.s-result-item, div[data-asin], #search .s-main-slot .s-result-item, .sg-col-20-of-24'
    await this.page.waitForSelector(containers, { timeout: 30000 })
    const first = this.page.locator(containers).first()
    // Try several common link selectors inside the result container
    const linkCandidates = ['a.a-link-normal.a-text-normal', 'a.a-link-normal[href*="/dp/"]', 'a[href*="/dp/"]', 'a[href*="/gp/product/"]', 'a[href]']
    let clicked = false
    for (const sel of linkCandidates) {
      const link = first.locator(sel).first()
      if (await link.count()) {
        try {
          await link.scrollIntoViewIfNeeded()
          await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
            link.click({ force: true })
          ])
          clicked = true
          break
        } catch (e) {
          // try next selector or fallback
        }
      }
    }
    if (!clicked) {
      // Prefer product links when falling back; avoid javascript:void(0) hrefs
      const href = await first.locator('a[href*="/dp/"], a[href*="/gp/product/"], a.sc-product-link, a[href]').first().getAttribute('href').catch(() => null)
      if (href && !href.startsWith('javascript') && !href.startsWith('#')) {
        await this.page.goto(new URL(href, 'https://www.amazon.com').toString())
        return true
      }
      console.warn('openFirstResult: no clickable link found in first result')
      return false
    }
    return true
  }

  async openResultAt(index: number) {
    const containers = '[data-component-type="s-search-result"], div.s-result-item, div[data-asin], #search .s-main-slot .s-result-item, .sg-col-20-of-24'
    await this.page.waitForSelector(containers, { timeout: 30000 })
    const el = this.page.locator(containers).nth(index)
    const linkCandidates = ['a.a-link-normal.a-text-normal', 'a.a-link-normal[href*="/dp/"]', 'a[href*="/dp/"]', 'a[href*="/gp/product/"]', 'a[href]']
    let clicked = false
    for (const sel of linkCandidates) {
      const link = el.locator(sel).first()
      if (await link.count()) {
        try {
          await link.scrollIntoViewIfNeeded()
          await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
            link.click({ force: true })
          ])
          clicked = true
          break
        } catch (e) {
        }
      }
    }
    if (!clicked) {
      const href = await el.locator('a[href*="/dp/"], a[href*="/gp/product/"], a.sc-product-link, a[href]').first().getAttribute('href').catch(() => null)
      if (href && !href.startsWith('javascript') && !href.startsWith('#')) {
        await this.page.goto(new URL(href, 'https://www.amazon.com').toString())
        return true
      }
      console.warn(`openResultAt(${index}): no clickable link found`)
      return false
    }
    return true
  }
}
