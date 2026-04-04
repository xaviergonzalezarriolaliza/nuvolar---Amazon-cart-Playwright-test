import { Page } from '@playwright/test';
import { randomDelay } from '../utils/helpers';
import { INVENTORY_SELECTORS, TIMEOUTS, DELAYS, APP_CONFIG, ERROR_MESSAGES } from '../utils/constants';

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
      const price = parseFloat(priceText.replace(APP_CONFIG.CURRENCY, ''));
      products.push({ name, price });
    }
    return products;
  }

  async addItemToCart(productName: string): Promise<void> {
    const item = await this.page.$(`${INVENTORY_SELECTORS.ITEM}:has-text("${productName}")`);
    if (!item) throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND(productName));
    const addButton = await item.$(INVENTORY_SELECTORS.ADD_TO_CART_BUTTON);
    if (!addButton) throw new Error(ERROR_MESSAGES.ADD_BUTTON_NOT_FOUND(productName));
    await addButton.click({ delay: randomDelay(DELAYS.ADD_ITEM.MIN, DELAYS.ADD_ITEM.MAX) });
  }

  async goToCart(): Promise<void> {
    await this.page.click(INVENTORY_SELECTORS.CART_LINK);
  }
}
