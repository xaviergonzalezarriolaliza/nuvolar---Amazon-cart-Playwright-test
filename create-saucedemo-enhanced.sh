#!/bin/bash

set -e

PROJECT_DIR="saucedemo-test"
rm -rf "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR"/{pages,utils,tests}
cd "$PROJECT_DIR"

# ------------------- package.json -------------------
cat > package.json << 'EOF'
{
  "name": "saucedemo-test",
  "version": "1.0.0",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
EOF

# ------------------- playwright.config.ts (enhanced) -------------------
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html'],
    ['list'] // also show steps in console
  ],
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',   // keep video on failure
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
EOF

# ------------------- utils/helpers.ts -------------------
cat > utils/helpers.ts << 'EOF'
import { Page } from '@playwright/test';

export function randomDelay(min = 100, max = 300): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomIndices(count: number, max: number): number[] {
  const indices = Array.from({ length: max }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}
EOF

# ------------------- pages/LoginPage.ts -------------------
cat > pages/LoginPage.ts << 'EOF'
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('https://www.saucedemo.com/');
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.fill('#user-name', username);
    await this.page.fill('#password', password);
    await this.page.click('#login-button');

    await this.page.waitForSelector('.inventory_list', { timeout: 5000 });
    await this.page.waitForLoadState('networkidle');
  }
}
EOF

# ------------------- pages/InventoryPage.ts -------------------
cat > pages/InventoryPage.ts << 'EOF'
import { Page } from '@playwright/test';
import { randomDelay } from '../utils/helpers';

export class InventoryPage {
  constructor(private page: Page) {}

  async waitForInventory(): Promise<void> {
    await this.page.waitForSelector('.inventory_list', { timeout: 10000 });
  }

  async getProductNamesAndPrices(): Promise<Array<{ name: string; price: number }>> {
    await this.waitForInventory();
    const items = await this.page.$$('.inventory_item');
    const products = [];
    for (const item of items) {
      const name = await item.$eval('.inventory_item_name', el => el.textContent?.trim() || '');
      const priceText = await item.$eval('.inventory_item_price', el => el.textContent?.trim() || '');
      const price = parseFloat(priceText.replace('$', ''));
      products.push({ name, price });
    }
    return products;
  }

  async addItemToCart(productName: string): Promise<void> {
    const item = await this.page.$(`.inventory_item:has-text("${productName}")`);
    if (!item) throw new Error(`Product "${productName}" not found`);
    const addButton = await item.$('button');
    if (!addButton) throw new Error(`Add button not found for "${productName}"`);
    await addButton.click({ delay: randomDelay(100, 200) });
  }

  async goToCart(): Promise<void> {
    await this.page.click('.shopping_cart_link');
  }
}
EOF

# ------------------- pages/CartPage.ts -------------------
cat > pages/CartPage.ts << 'EOF'
import { Page } from '@playwright/test';
import { randomDelay } from '../utils/helpers';

export class CartPage {
  constructor(private page: Page) {}

  async waitForItems(): Promise<void> {
    await this.page.waitForSelector('.cart_item');
  }

  async getCartItems(): Promise<Array<{ name: string; price: number; quantity: number }>> {
    const items = await this.page.$$('.cart_item');
    const result = [];
    for (const item of items) {
      const name = await item.$eval('.inventory_item_name', el => el.textContent?.trim() || '');
      const priceText = await item.$eval('.inventory_item_price', el => el.textContent?.trim() || '');
      const price = parseFloat(priceText.replace('$', ''));
      const qtyText = await item.$eval('.cart_quantity', el => el.textContent?.trim() || '1');
      const quantity = parseInt(qtyText, 10);
      result.push({ name, price, quantity });
    }
    return result;
  }

  async removeItem(itemName: string): Promise<void> {
    const item = await this.page.$(`.cart_item:has-text("${itemName}")`);
    if (!item) throw new Error(`Item "${itemName}" not found in cart`);
    const removeButton = await item.$('button');
    await removeButton?.click();
    await this.page.waitForTimeout(randomDelay(500, 1000));
  }
}
EOF

# ------------------- tests/saucedemo.spec.ts (fully enhanced) -------------------
cat > tests/saucedemo.spec.ts << 'EOF'
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
EOF

cd ..

echo "✅ Enhanced SauceDemo project created in ./$PROJECT_DIR"
echo ""
echo "Next steps:"
echo "  cd $PROJECT_DIR"
echo "  npm install"
echo "  npx playwright install"
echo "  npm run test:headed"