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
