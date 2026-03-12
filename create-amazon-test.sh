#!/bin/bash

set -e

PROJECT_DIR="amazon-playwright-test"
rm -rf "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR"/{pages,utils,tests}
cd "$PROJECT_DIR"

# ------------------- package.json -------------------
cat > package.json << 'EOF'
{
  "name": "amazon-playwright-test",
  "version": "1.0.0",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.10.0",
    "playwright-extra": "^4.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2",
    "typescript": "^5.3.0"
  }
}
EOF

# ------------------- playwright.config.ts -------------------
cat > playwright.config.ts << 'EOF'
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
EOF

# ------------------- utils/helpers.ts -------------------
cat > utils/helpers.ts << 'EOF'
import { Page } from '@playwright/test';

export function randomDelay(min = 500, max = 2000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomViewport(): { width: number; height: number } {
  const width = Math.floor(Math.random() * (1920 - 1024 + 1)) + 1024;
  const height = Math.floor(Math.random() * (1080 - 768 + 1)) + 768;
  return { width, height };
}

export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector, { delay: randomDelay(50, 150) });
  for (const char of text) {
    await page.type(selector, char, { delay: randomDelay(100, 300) });
  }
}
EOF

# ------------------- pages/HomePage.ts -------------------
cat > pages/HomePage.ts << 'EOF'
import { Page } from '@playwright/test';
import { humanType, randomDelay } from '../utils/helpers';

export class HomePage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('https://www.amazon.com/', { waitUntil: 'load' });
  }

  async searchFor(searchTerm: string): Promise<void> {
    await this.page.waitForSelector('input[name="field-keywords"]');
    await humanType(this.page, 'input[name="field-keywords"]', searchTerm);
    await this.page.keyboard.press('Enter', { delay: randomDelay(100, 300) });
    await this.page.waitForSelector('div[data-component-type="s-search-result"]', { timeout: 15000 });
  }
}
EOF

# ------------------- pages/SearchResultsPage.ts -------------------
cat > pages/SearchResultsPage.ts << 'EOF'
import { Page } from '@playwright/test';
import { randomDelay } from '../utils/helpers';

export class SearchResultsPage {
  constructor(private page: Page) {}

  async isCaptchaPresent(): Promise<boolean> {
    const bodyText = await this.page.textContent('body');
    return bodyText?.toLowerCase().includes('captcha') ?? false;
  }

  async clickNthProduct(index: number): Promise<boolean> {
    await this.page.waitForSelector('div[data-component-type="s-search-result"] a', { timeout: 10000 });
    const productLinks = await this.page.$$('div[data-component-type="s-search-result"] a');
    if (index >= productLinks.length) return false;
    try {
      await productLinks[index].waitForElementState('visible', { timeout: 5000 });
      await productLinks[index].click({ delay: randomDelay(100, 300), timeout: 10000 });
    } catch {
      await productLinks[index].scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      try {
        await productLinks[index].click({ delay: randomDelay(100, 300), timeout: 10000 });
      } catch {
        return false;
      }
    }
    await this.page.waitForTimeout(randomDelay(500, 1000));
    try {
      await this.page.waitForURL(/\/dp\/|\/gp\/product\//, { timeout: 30000 });
      return true;
    } catch {
      await this.page.goBack({ waitUntil: 'load' }).catch(() => {});
      return false;
    }
  }

  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'load' });
  }
}
EOF

# ------------------- pages/ProductPage.ts -------------------
cat > pages/ProductPage.ts << 'EOF'
import { Page } from '@playwright/test';
import { randomDelay } from '../utils/helpers';

export class ProductPage {
  constructor(private page: Page) {}

  async getTitle(): Promise<string> {
    await this.page.waitForSelector('#productTitle', { timeout: 5000 });
    return (await this.page.textContent('#productTitle'))?.trim() || '';
  }

  async hasAddToCartButton(): Promise<boolean> {
    try {
      await this.page.waitForSelector('#add-to-cart-button', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async isCustomizable(): Promise<boolean> {
    try {
      await this.page.waitForSelector('input[name="submit.customize"]', { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async hasPrice(): Promise<boolean> {
    const priceSelectors = [
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-offscreen',
      '.a-price-whole'
    ] as const;
    for (const sel of priceSelectors) {
      const el = await this.page.$(sel);
      if (el) {
        const text = await el.textContent();
        if (text && /\d/.test(text) && !text.includes('-')) return true;
      }
    }
    const whole = await this.page.$('.a-price-whole');
    const fraction = await this.page.$('.a-price-fraction');
    if (whole && fraction) {
      const wholeText = await whole.textContent();
      const fractionText = await fraction.textContent();
      if (wholeText && fractionText && /\d/.test(wholeText) && /\d/.test(fractionText)) {
        return true;
      }
    }
    return false;
  }

  async capturePrice(): Promise<number> {
    const priceSelectors = [
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-offscreen',
      '.a-price-whole'
    ] as const;
    let priceText: string | null = null;
    for (const sel of priceSelectors) {
      const el = await this.page.$(sel);
      if (el) {
        const text = await el.textContent();
        if (text && /\d/.test(text) && !text.includes('-')) {
          priceText = text;
          break;
        }
      }
    }
    if (!priceText) {
      const whole = await this.page.$('.a-price-whole');
      const fraction = await this.page.$('.a-price-fraction');
      if (whole && fraction) {
        const wholeText = await whole.textContent();
        const fractionText = await fraction.textContent();
        if (wholeText && fractionText && /\d/.test(wholeText) && /\d/.test(fractionText)) {
          priceText = wholeText + '.' + fractionText;
        }
      }
    }
    if (!priceText) {
      throw new Error('Could not capture price');
    }
    const cleaned = priceText.replace(/[^0-9.]/g, '');
    if (!cleaned) throw new Error('Price text contains no digits');
    return parseFloat(cleaned);
  }

  async addToCart(): Promise<void> {
    await this.page.click('#add-to-cart-button', { delay: randomDelay(200, 500) });
  }

  async waitForCartCount(expectedCount: number): Promise<void> {
    await this.page.waitForFunction((expected: number) => {
      const countEl = document.querySelector('#nav-cart-count');
      return countEl && parseInt(countEl.textContent || '0', 10) >= expected;
    }, expectedCount, { timeout: 15000 });
  }

  async isCaptchaPage(): Promise<boolean> {
    const bodyText = await this.page.textContent('body');
    return bodyText?.toLowerCase().includes('captcha') ?? false;
  }
}
EOF

# ------------------- pages/CartPage.ts -------------------
cat > pages/CartPage.ts << 'EOF'
import { Page } from '@playwright/test';
import { randomDelay } from '../utils/helpers';

export class CartPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('https://www.amazon.com/gp/cart/view.html', { waitUntil: 'load' });
  }

  async emptyCart(): Promise<void> {
    while (await this.page.$('.sc-list-item')) {
      const deleteBtn = await this.page.$('input[value="Delete"], .sc-action-delete input');
      if (deleteBtn) {
        await deleteBtn.click({ delay: randomDelay(200, 400) });
        await this.page.waitForTimeout(randomDelay(1000, 2000));
      } else break;
    }
  }

  async getCartItems(): Promise<Array<{ title: string; price: number; quantity: number }>> {
    await this.page.waitForSelector('.sc-list-item', { timeout: 15000 });
    const items = await this.page.$$('.sc-list-item');
    const cartItems = [];
    for (const item of items) {
      const title = await item.$eval('.sc-product-title', el => el.textContent?.trim() || '');
      const priceText = await item.$eval('.sc-product-price, .sc-price', el => el.textContent?.trim() || '');
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      let quantity = 1;
      const qtySelect = await item.$('.a-native-dropdown, select');
      if (qtySelect) {
        quantity = parseInt(await qtySelect.inputValue(), 10);
      } else {
        const qtyText = await item.$eval('.a-dropdown-prompt', el => el.textContent?.trim() || '').catch(() => '');
        if (qtyText) quantity = parseInt(qtyText, 10);
      }
      cartItems.push({ title, price, quantity });
    }
    return cartItems;
  }

  async deleteFirstItem(): Promise<void> {
    const deleteBtn = await this.page.$('input[value="Delete"]');
    if (!deleteBtn) throw new Error('Delete button not found');
    await deleteBtn.click({ delay: randomDelay(200, 400) });
    await this.page.waitForTimeout(randomDelay(1000, 2000));
  }
}
EOF

# ------------------- tests/amazon-cart.spec.ts (with logging tables) -------------------
cat > tests/amazon-cart.spec.ts << 'EOF'
import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { randomViewport, randomDelay } from '../utils/helpers';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';

chromium.use(StealthPlugin());

test.describe('Amazon cart flow – 9-step scenario (stealth)', () => {
  let browser: Browser;
  let page: Page;
  let context: BrowserContext;
  let homePage: HomePage;
  let searchResultsPage: SearchResultsPage;
  let productPage: ProductPage;
  let cartPage: CartPage;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
      ],
    });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    const { width, height } = randomViewport();
    context = await browser.newContext({
      viewport: { width, height },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      geolocation: { longitude: -122.4194, latitude: 37.7749 },
    });
    page = await context.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    await page.setDefaultTimeout(30000);

    homePage = new HomePage(page);
    searchResultsPage = new SearchResultsPage(page);
    productPage = new ProductPage(page);
    cartPage = new CartPage(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  async function findValidProduct(searchTerm: string, maxAttempts = 30): Promise<{ url: string; price: number; title: string }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await homePage.goto();
      await homePage.searchFor(searchTerm);

      if (await searchResultsPage.isCaptchaPresent()) {
        console.log('CAPTCHA detected on search results, waiting and retrying...');
        await page.waitForTimeout(10000);
        continue;
      }

      const navigationSuccess = await searchResultsPage.clickNthProduct(attempt);
      if (!navigationSuccess) {
        console.log(`Product ${attempt + 1} navigation failed, trying next...`);
        continue;
      }

      await page.waitForTimeout(randomDelay(500, 1000));

      const isCaptcha = await productPage.isCaptchaPage();
      if (isCaptcha) {
        console.log(`CAPTCHA detected on product page, retrying...`);
        await page.goto('https://www.amazon.com/', { waitUntil: 'load' });
        continue;
      }

      const isCustom = await productPage.isCustomizable();
      if (isCustom) {
        console.log(`Product ${attempt + 1} is customizable, skipping...`);
        await searchResultsPage.goBack();
        continue;
      }

      const hasButton = await productPage.hasAddToCartButton();
      const hasPrice = await productPage.hasPrice();

      if (hasButton && hasPrice) {
        const price = await productPage.capturePrice();
        const title = await productPage.getTitle();
        console.log(`✅ Found valid product at attempt ${attempt + 1}: "${title}" price $${price}`);
        return { url: page.url(), price, title };
      }

      console.log(`Product ${attempt + 1} is invalid (button: ${hasButton}, price: ${hasPrice}), trying next...`);
      await searchResultsPage.goBack();
    }
    throw new Error('Could not find a valid product with Add to Cart and single price');
  }

  // Helper to print comparison table
  function printComparison(expected: Array<{ title: string; qty: number; unitPrice: number }>, actual: Array<{ title: string; price: number; quantity: number }>, stage: string) {
    console.log(`\n📊 ${stage} – Comparison Table`);
    console.log('Expected:');
    console.log('| # | Item (title truncated) | Qty | Unit Price | Subtotal |');
    expected.forEach((e, i) => {
      const shortTitle = e.title.length > 40 ? e.title.substring(0, 37) + '...' : e.title;
      console.log(`| ${i+1} | ${shortTitle} | ${e.qty} | $${e.unitPrice.toFixed(2)} | $${(e.qty * e.unitPrice).toFixed(2)} |`);
    });
    console.log('\nActual (from cart):');
    console.log('| # | Item (title truncated) | Qty | Unit Price | Subtotal |');
    actual.forEach((a, i) => {
      const shortTitle = a.title.length > 40 ? a.title.substring(0, 37) + '...' : a.title;
      console.log(`| ${i+1} | ${shortTitle} | ${a.quantity} | $${a.price.toFixed(2)} | $${(a.quantity * a.price).toFixed(2)} |`);
    });
    const expTotal = expected.reduce((sum, e) => sum + e.qty * e.unitPrice, 0);
    const actTotal = actual.reduce((sum, a) => sum + a.quantity * a.price, 0);
    const expQty = expected.reduce((sum, e) => sum + e.qty, 0);
    const actQty = actual.reduce((sum, a) => sum + a.quantity, 0);
    console.log(`\nExpected total: $${expTotal.toFixed(2)} (qty ${expQty})`);
    console.log(`Actual total:   $${actTotal.toFixed(2)} (qty ${actQty})`);
    console.log('----------------------------------------');
  }

  test('should add two different hats and adjust quantity', async () => {
    // Step 1: Empty cart
    await cartPage.goto();
    await cartPage.emptyCart();

    // Expected items tracking
    const expectedItems: Array<{ title: string; qty: number; unitPrice: number }> = [];

    // Steps 2-4: Add men's hat twice
    const menProduct = await findValidProduct('hats for men');
    const menPrice = menProduct.price;
    const menTitle = menProduct.title;
    expectedItems.push({ title: menTitle, qty: 2, unitPrice: menPrice });
    console.log(`\n🟦 Adding men's hat twice: ${menTitle} @ $${menPrice} each`);

    await productPage.addToCart();
    await productPage.waitForCartCount(1);
    await page.goto(menProduct.url, { waitUntil: 'load' });
    await page.waitForTimeout(randomDelay(1500, 2500));
    const buttonPresent = await productPage.hasAddToCartButton();
    if (!buttonPresent) {
      console.log('Add to Cart button not found after revisit, refreshing...');
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(randomDelay(1500, 2500));
    }
    await productPage.addToCart(); // second click
    await productPage.waitForCartCount(2);

    // Get cart items and compare
    await cartPage.goto();
    let cartItems = await cartPage.getCartItems();
    printComparison(expectedItems, cartItems, 'After men\'s hats');
    const expTotal = expectedItems.reduce((sum, e) => sum + e.qty * e.unitPrice, 0);
    const actTotal = cartItems.reduce((sum, a) => sum + a.quantity * a.price, 0);
    expect(actTotal).toBeCloseTo(expTotal, 2);
    expect(cartItems.reduce((sum, a) => sum + a.quantity, 0)).toBe(2);

    // Steps 5-7: Add women's hat once
    const womenProduct = await findValidProduct('hats for women');
    const womenPrice = womenProduct.price;
    const womenTitle = womenProduct.title;
    expectedItems.push({ title: womenTitle, qty: 1, unitPrice: womenPrice });
    console.log(`\n🟪 Adding women's hat once: ${womenTitle} @ $${womenPrice}`);

    await productPage.addToCart();
    await productPage.waitForCartCount(3);

    // Get cart items and compare
    await cartPage.goto();
    cartItems = await cartPage.getCartItems();
    printComparison(expectedItems, cartItems, 'After both items');
    const expTotal2 = expectedItems.reduce((sum, e) => sum + e.qty * e.unitPrice, 0);
    const actTotal2 = cartItems.reduce((sum, a) => sum + a.quantity * a.price, 0);
    expect(actTotal2).toBeCloseTo(expTotal2, 2);
    expect(cartItems.reduce((sum, a) => sum + a.quantity, 0)).toBe(3);

    // Steps 8-9: Reduce men's hat to 1 by deleting one
    // Update expected: reduce men's hat quantity from 2 to 1
    expectedItems[0].qty = 1;
    console.log(`\n🔁 Deleting one men's hat, new expected qty for that item: 1`);

    await cartPage.goto();
    await cartPage.deleteFirstItem();
    await productPage.waitForCartCount(2);

    cartItems = await cartPage.getCartItems();
    printComparison(expectedItems, cartItems, 'After deletion');

    const expTotal3 = expectedItems.reduce((sum, e) => sum + e.qty * e.unitPrice, 0);
    const actTotal3 = cartItems.reduce((sum, a) => sum + a.quantity * a.price, 0);
    expect(actTotal3).toBeCloseTo(expTotal3, 2);
    expect(cartItems.reduce((sum, a) => sum + a.quantity, 0)).toBe(2);

    console.log('✅ Test passed!');
  });
});
EOF

cd ..

echo "✅ Project successfully created in ./$PROJECT_DIR"
echo ""
echo "Next steps:"
echo "  cd $PROJECT_DIR"
echo "  npm install"
echo "  npx playwright install"
echo "  npm run test:headed"