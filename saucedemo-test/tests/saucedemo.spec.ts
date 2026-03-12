import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { getRandomIndices } from '../utils/helpers';

test.describe('SauceDemo 9-step scenario (enhanced)', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;

  // Store console logs
  const consoleLogs: string[] = [];

  // Attach environment info after each test
  test.afterEach(async ({ browserName }, testInfo) => {
    const env = {
      browser: browserName,
      os: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
    await testInfo.attach('environment', {
      body: JSON.stringify(env, null, 2),
      contentType: 'application/json'
    });
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    cartPage = new CartPage(page);

    // Clear logs before each test
    consoleLogs.length = 0;
    page.on('console', msg => consoleLogs.push(`${msg.type()}: ${msg.text()}`));

    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  test('should add two different men’s items and one women’s item, then remove one', async ({ page }, testInfo) => {
    // Add annotation
    testInfo.annotations.push({ type: 'Test Case', description: 'CART-001' });

    // Attach a screenshot of the inventory page after login
    await test.step('Capture inventory page', async () => {
      await page.screenshot({ path: 'test-results/inventory.png' });
      await testInfo.attach('inventory page', { path: 'test-results/inventory.png' });
    });

    const products = await inventoryPage.getProductNamesAndPrices();
    expect(products.length).toBeGreaterThanOrEqual(2);

    // Pick three random distinct indices
    const menIndices = getRandomIndices(2, products.length);
    const menItem1 = products[menIndices[0]];
    const menItem2 = products[menIndices[1]];

    let womenItem: { name: string; price: number } | null = null;
    for (let i = 0; i < products.length; i++) {
      if (!menIndices.includes(i)) {
        womenItem = products[i];
        break;
      }
    }
    if (!womenItem) throw new Error('Not enough distinct products');

    console.log(`Selected items: ${menItem1.name}, ${menItem2.name}, ${womenItem.name}`);

    const expectedItems: Array<{ name: string; qty: number; unitPrice: number }> = [];

    // Step: Add first men's item
    await test.step('Add first men’s item', async () => {
      console.log(`Adding: ${menItem1.name}`);
      await inventoryPage.addItemToCart(menItem1.name);
      await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
      expectedItems.push({ name: menItem1.name, qty: 1, unitPrice: menItem1.price });
    });

    // Step: Add second men's item
    await test.step('Add second men’s item', async () => {
      console.log(`Adding: ${menItem2.name}`);
      await inventoryPage.addItemToCart(menItem2.name);
      await expect(page.locator('.shopping_cart_badge')).toHaveText('2');
      expectedItems.push({ name: menItem2.name, qty: 1, unitPrice: menItem2.price });
    });

    // Step: Verify cart after two men's items
    await test.step('Verify cart after two men’s items', async () => {
      await inventoryPage.goToCart();
      await cartPage.waitForItems();
      const actualItems = await cartPage.getCartItems();
      expect(actualItems).toHaveLength(2);
      expect(actualItems).toContainEqual({ name: menItem1.name, price: menItem1.price, quantity: 1 });
      expect(actualItems).toContainEqual({ name: menItem2.name, price: menItem2.price, quantity: 1 });

      // Attach screenshot of cart
      await page.screenshot({ path: 'test-results/cart-after-men.png' });
      await testInfo.attach('cart after men’s items', { path: 'test-results/cart-after-men.png' });
    });

    // Step: Add women's item
    await test.step('Add women’s item', async () => {
      await page.click('#continue-shopping');
      console.log(`Adding: ${womenItem!.name}`);
      await inventoryPage.addItemToCart(womenItem!.name);
      await expect(page.locator('.shopping_cart_badge')).toHaveText('3');
      expectedItems.push({ name: womenItem!.name, qty: 1, unitPrice: womenItem!.price });
    });

    // Step: Verify cart after all three items
    await test.step('Verify cart after all three items', async () => {
      await inventoryPage.goToCart();
      await cartPage.waitForItems();
      const actualItems = await cartPage.getCartItems();
      expect(actualItems).toHaveLength(3);
      expect(actualItems).toContainEqual({ name: menItem1.name, price: menItem1.price, quantity: 1 });
      expect(actualItems).toContainEqual({ name: menItem2.name, price: menItem2.price, quantity: 1 });
      expect(actualItems).toContainEqual({ name: womenItem!.name, price: womenItem!.price, quantity: 1 });

      await page.screenshot({ path: 'test-results/cart-after-all.png' });
      await testInfo.attach('cart after all items', { path: 'test-results/cart-after-all.png' });
    });

    // Step: Remove one men's item
    await test.step('Remove first men’s item', async () => {
      console.log(`Removing: ${menItem1.name}`);
      await cartPage.removeItem(menItem1.name);
      await expect(page.locator('.shopping_cart_badge')).toHaveText('2');
      const index = expectedItems.findIndex(i => i.name === menItem1.name);
      if (index !== -1) expectedItems.splice(index, 1);
    });

    // Step: Final verification
    await test.step('Verify final cart', async () => {
      await page.waitForTimeout(1000);
      const actualItems = await cartPage.getCartItems();
      expect(actualItems).toHaveLength(2);
      expect(actualItems).toContainEqual({ name: menItem2.name, price: menItem2.price, quantity: 1 });
      expect(actualItems).toContainEqual({ name: womenItem!.name, price: womenItem!.price, quantity: 1 });

      await page.screenshot({ path: 'test-results/cart-final.png' });
      await testInfo.attach('final cart', { path: 'test-results/cart-final.png' });
    });

    // Attach console logs
    await testInfo.attach('console logs', {
      body: consoleLogs.join('\n'),
      contentType: 'text/plain'
    });

    console.log('✅ Test passed!');
  });
});
