import { Page } from '@playwright/test'

function parsePrice(text: string | null | undefined) {
  if (!text) return 0
  const m = text.replace(/[^0-9.]/g, '')
  return parseFloat(m) || 0
}

export class CartPage {
  readonly page: Page
  constructor(page: Page) { this.page = page }

  async goto() {
    await this.page.goto('https://www.amazon.com/gp/cart/view.html')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async forceRemoveOverlays() {
    await this.page.evaluate(() => {
      const selectors = ['.glow-toaster', '.glow-toaster-overlay', '.a-modal', '.a-popover', '#a-popover-root', '[role="alertdialog"]']
      selectors.forEach(s => Array.from(document.querySelectorAll(s)).forEach(n => n.remove()))
    })
  }

  async getSummary() {
    await this.forceRemoveOverlays()
    const rows = await this.page.locator('[data-asin], .sc-list-item, div[data-testid="cart-item"]').elementHandles()
    const details: { price: number; quantity: number }[] = []
    for (const r of rows) {
      const text = await r.textContent()
      const priceEl = await r.$('span.a-offscreen, span.a-price, span.sc-product-price, span.a-color-price')
      const priceText = priceEl ? await priceEl.textContent() : text
      const price = parsePrice(priceText || '')
      let quantity = 1
      const sel = await r.$('select')
      if (sel) {
        const val = await sel.getAttribute('value') || await sel.evaluate((s: HTMLSelectElement) => s.value).catch(() => null)
        if (val) quantity = parseInt(val.replace(/[^0-9]/g, ''), 10) || 1
      }
      const qPrompt = await r.$('span.a-dropdown-prompt')
      if (qPrompt) {
        const qtxt = await qPrompt.textContent()
        const n = parseInt((qtxt || '').replace(/[^0-9]/g, ''), 10)
        if (!isNaN(n)) quantity = n
      }
      details.push({ price, quantity })
    }
    const computedTotal = details.reduce((s, it) => s + it.price * it.quantity, 0)
    const subtotalEl = await this.page.$('#sc-subtotal-amount-activecart, span[data-testid="sc-subtotal-amount-buybox"], span[data-testid="sc-subtotal-amount"], span.a-color-price')
    const displayedTotal = subtotalEl ? parsePrice(await subtotalEl.textContent()) : 0
    return { details, computedTotal, displayedTotal }
  }

  async changeFirstItemQty(qty: number) {
    const first = this.page.locator('[data-asin], .sc-list-item, div[data-testid="cart-item"]').first()
    const sel = first.locator('select').first()
    if (await sel.count()) {
      await sel.selectOption(String(qty))
      return
    }
    const prompt = first.locator('span.a-dropdown-prompt').first()
    if (await prompt.count()) {
      await prompt.click({ force: true })
    }
  }
}
