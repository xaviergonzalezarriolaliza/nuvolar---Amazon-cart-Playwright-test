import { Page } from '@playwright/test'

function parsePrice(text: string | null | undefined) {
  if (!text) return 0
  const str = String(text).trim()
  // Normalize common non-breaking spaces
  const cleaned = str.replace(/\u00A0/g, ' ')
  // Try to capture currency word/symbol followed by a number (e.g., EUR 17.19)
  const currencyNearNumber = cleaned.match(/(?:EUR|USD|GBP|EUR\u00A0|£|€|\$)\s*([0-9.,]+)/i)
  if (currencyNearNumber && currencyNearNumber[1]) {
    let num = currencyNearNumber[1]
    if (num.indexOf(',') !== -1 && num.indexOf('.') !== -1) num = num.replace(/,/g, '')
    else if (num.indexOf(',') !== -1 && num.indexOf('.') === -1) num = num.replace(/,/g, '.')
    num = num.replace(/[^0-9.\-]/g, '')
    return parseFloat(num) || 0
  }
  // Extract numeric tokens allowing both comma and dot as decimal/thousand separators
  const re = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)|\d+(?:[.,]\d+)?)/g
  let last: string | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(cleaned)) !== null) {
    last = m[0]
  }
  if (!last) return 0
  let num = last
  // If both comma and dot appear, assume dot is decimal and remove commas
  if (num.indexOf(',') !== -1 && num.indexOf('.') !== -1) {
    num = num.replace(/,/g, '')
  } else if (num.indexOf(',') !== -1 && num.indexOf('.') === -1) {
    // If only comma present, treat comma as decimal separator (e.g., EUR 17,19)
    num = num.replace(/,/g, '.')
  }
  // Strip any remaining non-digit/decimal characters
  num = num.replace(/[^0-9.\-]/g, '')
  return parseFloat(num) || 0
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
    // Extract all cart items and their prices/quantities
    await this.forceRemoveOverlays();
    const items = this.page.locator('[data-asin], .sc-list-item, div[data-testid="cart-item"]');
    const details: { price: number; quantity: number }[] = [];
    const itemCount = await items.count();
    for (let i = 0; i < itemCount; i++) {
      const item = items.nth(i);
      let price = 0;
      let priceText = null;
      try {
        priceText = await item.locator('.sc-product-price, .a-offscreen').first().textContent({ timeout: 3000 });
      } catch (e) {}
      if (priceText) price = parsePrice(priceText);
      let quantity = 1;
      const sel = item.locator('select').first();
      if (await sel.count()) {
        const val = await sel.inputValue();
        if (val) quantity = parseInt(val.replace(/[^0-9]/g, ''), 10) || 1;
      } else {
        const qPrompt = item.locator('span.a-dropdown-prompt').first();
        if (await qPrompt.count()) {
          const qtxt = await qPrompt.textContent();
          const n = parseInt((qtxt || '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(n)) quantity = n;
        }
      }
      details.push({ price, quantity });
    }
    const computedTotal = details.reduce((s, it) => s + it.price * it.quantity, 0);
    const subtotalEl = await this.page.$('#sc-subtotal-amount-activecart, span[data-testid="sc-subtotal-amount-buybox"], span[data-testid="sc-subtotal-amount"], span.a-color-price');
    const displayedTotal = subtotalEl ? parsePrice(await subtotalEl.textContent()) : 0;
    return { details, computedTotal, displayedTotal };
  }

  async changeFirstItemQty(qty: number) {
    const first = this.page.locator('[data-asin], .sc-list-item, div[data-testid="cart-item"]').first();
    const sel = first.locator('select').first();
    if (await sel.count()) {
      await sel.selectOption(String(qty));
      return;
    }
    const prompt = first.locator('span.a-dropdown-prompt').first();
    if (await prompt.count()) {
      await prompt.click({ force: true });
    }
  }

  async removeFirstItem() {
    const first = this.page.locator('[data-asin], .sc-list-item, div[data-testid="cart-item"]').first()
    const removeSelectors = ['input[value="Delete"]', 'input[name="submit.delete"]', 'a.sc-action-link', 'a[href*="/gp/cart/replace.html"]', 'button[name="submit.delete"]']
    for (const sel of removeSelectors) {
      const el = first.locator(sel)
      if (await el.count()) {
        try {
          await el.first().scrollIntoViewIfNeeded()
          await el.first().click({ force: true })
          await this.page.waitForTimeout(1000)
          return true
        } catch (e) {}
      }
    }
    return false
  }

  async clear() {
    await this.forceRemoveOverlays()
    let rows = await this.page.locator('[data-asin], .sc-list-item, div[data-testid="cart-item"]').count()
    while (rows > 0) {
      await this.removeFirstItem()
      await this.page.waitForTimeout(800)
      rows = await this.page.locator('[data-asin], .sc-list-item, div[data-testid="cart-item"]').count()
    }
  }
}
