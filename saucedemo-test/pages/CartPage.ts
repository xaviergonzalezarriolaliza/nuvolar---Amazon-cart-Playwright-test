import { Page } from '@playwright/test';
import { randomDelay } from '../utils/helpers';
import { CART_SELECTORS, INVENTORY_SELECTORS, DELAYS, APP_CONFIG, ERROR_MESSAGES } from '../utils/constants';

export class CartPage {
  constructor(private page: Page) {}

  async waitForItems(): Promise<void> {
    await this.page.waitForSelector(CART_SELECTORS.ITEM);
  }

  async getCartItems(): Promise<Array<{ name: string; price: number; quantity: number }>> {
    const items = await this.page.$$(CART_SELECTORS.ITEM);
    const result = [];
    for (const item of items) {
      const name = await item.$eval(INVENTORY_SELECTORS.ITEM_NAME, el => el.textContent?.trim() || '');
      const priceText = await item.$eval(INVENTORY_SELECTORS.ITEM_PRICE, el => el.textContent?.trim() || '');
      const price = parseFloat(priceText.replace(APP_CONFIG.CURRENCY, ''));
      const qtyText = await item.$eval(CART_SELECTORS.QUANTITY, el => el.textContent?.trim() || APP_CONFIG.DEFAULT_QTY.toString());
      const quantity = parseInt(qtyText, 10);
      result.push({ name, price, quantity });
    }
    return result;
  }

  async removeItem(itemName: string): Promise<void> {
    const item = await this.page.$(`${CART_SELECTORS.ITEM}:has-text("${itemName}")`);
    if (!item) throw new Error(ERROR_MESSAGES.ITEM_NOT_FOUND_IN_CART(itemName));
    const removeButton = await item.$(CART_SELECTORS.REMOVE_BUTTON);
    await removeButton?.click();
    await this.page.waitForTimeout(randomDelay(DELAYS.REMOVE_ITEM.MIN, DELAYS.REMOVE_ITEM.MAX));
  }
}
