import { Page } from '@playwright/test'

export class ProductPage {
  readonly page: Page
  constructor(page: Page) { this.page = page }

  async forceRemoveOverlays() {
    await this.page.evaluate(() => {
      const selectors = ['.glow-toaster', '.glow-toaster-overlay', '.a-modal', '.a-popover', '#a-popover-root', '[role="alertdialog"]']
      selectors.forEach(s => Array.from(document.querySelectorAll(s)).forEach(n => n.remove()))
      Array.from(document.querySelectorAll('*')).forEach((el: any) => {
        try {
          const style = window.getComputedStyle(el)
          if (style && (style.position === 'fixed' || (style.zIndex && parseInt(style.zIndex || '0') > 1000))) {
            el.style.pointerEvents = 'auto'
            if (parseInt(style.zIndex || '0') > 2000) el.remove()
          }
        } catch (e) {}
      })
    })
  }

  async setQuantity(qty: number) {
    const sel = this.page.locator('select#quantity, select[name="quantity"]').first()
    if (await sel.count()) {
      try {
        await sel.selectOption(String(qty))
        return qty
      } catch (e) {}
    }
    return 1
  }

  async addToCart() {
    const addSelectors = ['#add-to-cart-button','button[aria-label="Add to cart"]','button#a-autoid-2-announce','input#add-to-cart-button']
    for (const s of addSelectors) {
      const el = this.page.locator(s)
      if (await el.count()) {
        await el.first().scrollIntoViewIfNeeded()
        await el.first().click({ force: true })
        try {
          await this.page.waitForSelector('#attach-sidesheet-view-cart-button, #attach-added-to-cart, a#hlb-view-cart-announce, a[href*="/gp/cart/view"], #sc-active-cart', { timeout: 5000 })
        } catch (e) {}
        return true
      }
    }
    return false
  }
}
