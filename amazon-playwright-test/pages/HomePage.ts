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
