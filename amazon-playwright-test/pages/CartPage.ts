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
