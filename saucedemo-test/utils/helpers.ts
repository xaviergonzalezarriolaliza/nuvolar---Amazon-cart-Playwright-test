import { Page } from '@playwright/test';

export function randomDelay(min = 100, max = 300): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomIndices(count: number, max: number): number[] {
  const indices = Array.from({ length: max }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}
