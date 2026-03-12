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
