import { Page } from '@playwright/test';
import { BASE_URL, LOGIN_SELECTORS, INVENTORY_SELECTORS, TIMEOUTS } from '../utils/constants';

export class LoginPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(BASE_URL);
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.fill(LOGIN_SELECTORS.USERNAME, username);
    await this.page.fill(LOGIN_SELECTORS.PASSWORD, password);
    await this.page.click(LOGIN_SELECTORS.LOGIN_BUTTON);

    await this.page.waitForSelector(INVENTORY_SELECTORS.LIST, { timeout: TIMEOUTS.DEFAULT });
    await this.page.waitForLoadState('networkidle');
  }
}
