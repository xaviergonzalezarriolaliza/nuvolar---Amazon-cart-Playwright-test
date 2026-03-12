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
