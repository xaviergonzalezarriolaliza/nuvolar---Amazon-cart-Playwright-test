import { Page } from '@playwright/test';
import { randomDelay } from '../utils/helpers';
import { INVENTORY_SELECTORS, TIMEOUTS, DELAYS } from '../utils/constants';

export class InventoryPage {
  constructor(private page: Page) {}

  async waitForInventory(): Promise<void> {
    await this.page.waitForSelector(INVENTORY_SELECTORS.LIST, { timeout: TIMEOUTS.INVENTORY });
  }

  async getProductNamesAndPrices(): Promise<Array<{ name: string; price: number }>> {
    await this.waitForInventory();
    const items = await this.page.$$(INVENTORY_SELECTORS.ITEM);
    const products = [];
    for (const item of items) {
      const name = await item.$eval(INVENTORY_SELECTORS.ITEM_NAME, el => el.textContent?.trim() || '');
      const priceText = await item.$eval(INVENTORY_SELECTORS.ITEM_PRICE, el => el.textContent?.trim() || '');
      const price = parseFloat(priceText.replace('$', ''));
      products.push({ name, price });
    }
    return products;
  }

  async addItemToCart(productName: string): Promise<void> {
    const item = await this.page.$(`${INVENTORY_SELECTORS.ITEM}:has-text("${productName}")`);
    if (!item) throw new Error(`Product "${productName}" not found`);
    const addButton = await item.$('button');
    if (!addButton) throw new Error(`Add button not found for "${productName}"`);
    await addButton.click({ delay: randomDelay(DELAYS.ADD_ITEM.MIN, DELAYS.ADD_ITEM.MAX) });
  }

  async goToCart(): Promise<void> {
    await this.page.click(INVENTORY_SELECTORS.CART_LINK);
  }
}
