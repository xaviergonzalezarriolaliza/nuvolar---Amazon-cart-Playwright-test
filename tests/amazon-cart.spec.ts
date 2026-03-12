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

  async function findValidProduct(searchTerm: string, maxAttempts = 15): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await homePage.goto();
      await homePage.searchFor(searchTerm);
      await searchResultsPage.clickNthProduct(attempt);
      
      await page.waitForTimeout(randomDelay(500, 1000));
      
      const isCaptcha = await productPage.isCaptchaPage();
      if (isCaptcha) {
        console.log(`CAPTCHA detected on attempt ${attempt + 1}, retrying...`);
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
        return page.url();
      }
      
      console.log(`Product ${attempt + 1} is invalid (button: ${hasButton}, price: ${hasPrice}), trying next...`);
      await searchResultsPage.goBack();
    }
    throw new Error('Could not find a valid product with Add to Cart and price');
  }

  test('should add two different hats and adjust quantity', async () => {
    // Step 1: Empty cart
    await cartPage.goto();
    await cartPage.emptyCart();

    // Steps 2-4: Add men's hat twice
    const menUrl = await findValidProduct('hats for men');
    const menPrice = await productPage.capturePrice();
    await productPage.addToCart();
    await productPage.waitForCartCount(1);
    
    // Revisit the product page to add it again
    await page.goto(menUrl, { waitUntil: 'load' });
    await page.waitForTimeout(randomDelay(1500, 2500));
    const buttonPresent = await productPage.hasAddToCartButton();
    if (!buttonPresent) {
      console.log('Add to Cart button not found after revisit, refreshing...');
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(randomDelay(1500, 2500));
    }
    await productPage.addToCart(); // second click
    await productPage.waitForCartCount(2);

    // Verify cart after men's hats
    await cartPage.goto();
    let cart = await cartPage.getCartDetails();
    expect(cart.total).toBeCloseTo(menPrice * 2, 2);
    expect(cart.qty).toBe(2);

    // Steps 5-7: Add women's hat once
    const womenUrl = await findValidProduct('hats for women');
    const womenPrice = await productPage.capturePrice();
    await productPage.addToCart();
    await productPage.waitForCartCount(3);

    // Verify cart after both items
    await cartPage.goto();
    cart = await cartPage.getCartDetails();
    expect(cart.total).toBeCloseTo(menPrice * 2 + womenPrice, 2);
    expect(cart.qty).toBe(3);

    // Steps 8-9: Reduce men's hat to 1 by deleting one
    await cartPage.goto();
    await cartPage.deleteFirstItem();
    await productPage.waitForCartCount(2); // cart count decreases

    cart = await cartPage.getCartDetails();
    expect(cart.total).toBeCloseTo(menPrice + womenPrice, 2);
    expect(cart.qty).toBe(2);

    console.log('✅ Test passed!');
  });
});
