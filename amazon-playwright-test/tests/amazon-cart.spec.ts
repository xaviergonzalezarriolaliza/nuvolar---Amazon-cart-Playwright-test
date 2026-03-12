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
