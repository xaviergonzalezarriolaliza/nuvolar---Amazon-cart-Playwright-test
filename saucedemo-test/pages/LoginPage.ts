import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('https://www.saucedemo.com/');
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.fill('#user-name', username);
    await this.page.fill('#password', password);
    await this.page.click('#login-button');

    await this.page.waitForSelector('.inventory_list', { timeout: 5000 });
    await this.page.waitForLoadState('networkidle');
  }
}
