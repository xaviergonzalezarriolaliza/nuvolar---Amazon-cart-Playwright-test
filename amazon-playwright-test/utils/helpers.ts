import { Page } from '@playwright/test';

export function randomDelay(min = 500, max = 2000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomViewport(): { width: number; height: number } {
  const width = Math.floor(Math.random() * (1920 - 1024 + 1)) + 1024;
  const height = Math.floor(Math.random() * (1080 - 768 + 1)) + 768;
  return { width, height };
}

export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector, { delay: randomDelay(50, 150) });
  for (const char of text) {
    await page.type(selector, char, { delay: randomDelay(100, 300) });
  }
}
