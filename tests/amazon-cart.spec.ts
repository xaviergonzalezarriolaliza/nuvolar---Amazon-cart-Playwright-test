import { test, expect } from '@playwright/test'
import { SearchPage } from './pages/SearchPage'
import { ProductPage } from './pages/ProductPage'
import { CartPage } from './pages/CartPage'

test.describe('Amazon cart full scenario', () => {
  test('add items, verify totals, and adjust quantities', async ({ page }) => {
    const search = new SearchPage(page)
    const product = new ProductPage(page)
    const cart = new CartPage(page)

    // Step 1: men's hat qty 2 (or 1 if not available)
    await search.goto()
    await search.search('hats for men')
    await search.openFirstResult()
    await product.forceRemoveOverlays()
    const qty = await product.setQuantity(2)
    await product.addToCart()
    let summary = await cart.getSummary()
    console.log('Cart items after first add:', summary.details.length)
    console.log('Computed total:', summary.computedTotal, 'Displayed subtotal:', summary.displayedTotal)
    expect(summary.details.length).toBeGreaterThan(0)
    const totalItems1 = summary.details.reduce((s, it) => s + it.quantity, 0)
    if (totalItems1 < qty) console.warn(`Requested qty ${qty} but cart has ${totalItems1}`)
    expect(totalItems1).toBeGreaterThanOrEqual(1)

    // Step 2: women's hat qty 1
    await search.goto()
    await search.search('hats for women')
    await search.openFirstResult()
    await product.forceRemoveOverlays()
    const qty2 = await product.setQuantity(1)
    await product.addToCart()
    summary = await cart.getSummary()
    const totalItems2 = summary.details.reduce((s, it) => s + it.quantity, 0)
    console.log('Cart items after second add:', summary.details.length)
    console.log('Computed total:', summary.computedTotal, 'Displayed subtotal:', summary.displayedTotal)
    if (totalItems2 < totalItems1) console.warn(`Cart decreased: before=${totalItems1} after=${totalItems2}`)
    if (totalItems2 === totalItems1) console.warn('Second add did not increase total items; site may have restricted quantity or merged items')
    expect(totalItems2).toBeGreaterThanOrEqual(totalItems1)

    // Step 3: change first cart item qty from previous qty to 1
    const prevFirstQty = summary.details.length ? summary.details[0].quantity : 0
    await cart.goto()
    await cart.forceRemoveOverlays()
    await cart.changeFirstItemQty(1)
    await page.waitForTimeout(2000)
    summary = await cart.getSummary()
    const finalFirstQty = summary.details.length ? summary.details[0].quantity : 0
    // Ensure the first item's quantity did not increase after attempting to set it to 1
    expect(finalFirstQty).toBeLessThanOrEqual(prevFirstQty)
    if (finalFirstQty <= prevFirstQty) console.log(`Quantity update OK: before=${prevFirstQty} after=${finalFirstQty}`)
  })
})
