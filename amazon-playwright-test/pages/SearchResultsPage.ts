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
