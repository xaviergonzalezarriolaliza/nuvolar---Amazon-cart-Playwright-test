Amazon cart Playwright test
============================

Summary
-------
This repository contains a Playwright test that automates a best-effort cart flow on Amazon.com:
- Search "hats for men", open first product, add to cart (qty 2 when possible)
- Verify cart totals
- Search "hats for women", open first product, add to cart (qty 1)
- Verify cart totals
- Change the first item's quantity in cart from 2 to 1 and verify totals update

Notes about the scenario and changes made
----------------------------------------
- The original spec assumed stable selectors and deterministic cart behaviour. In practice Amazon's UI varies by region, product, and A/B tests. The test therefore:
  - Uses resilient fallback selectors for prices, quantities and subtotal.
  - Computes a "computedTotal" from visible item prices*quantities and compares it with the displayed subtotal with a small tolerance to allow for shipping/taxes or rounding.
  - Accepts that the site might force quantity to 1 (out-of-stock limits) and asserts conservatively where needed.

Files
-----
- [playwright.config.ts](playwright.config.ts)
- [tests/cart.spec.ts](tests/cart.spec.ts)
- [package.json](package.json)

Setup (local machine)
----------------------
1. Install Node.js (v16+ recommended).
2. Install dependencies and Playwright browsers:

```bash
npm install
npx playwright install
```

Run the tests
-------------
Run headless:

```bash
npm test
```

Run with headed browser (visible):

```bash
npm run test:headed
```

Limitations and reliability
---------------------------
- Amazon may present region prompts, CAPTCHA or bot-detection which will fail automation. This test is "best-effort" and designed to fail fast and provide useful debug output when Amazon's UI differs.
- If the test fails due to selector mismatches, inspect the page in headed mode and adjust selectors in [tests/cart.spec.ts](tests/cart.spec.ts).

Improvements (optional)
-----------------------
- Add retry logic or a Playwright recorder snapshot to stabilize selectors for a specific locale.
- Persist test artifacts or HTML screenshots on failure for easier debugging.

Playwright — POM refactor
-------------------------
- Refactor: the full scenario test was refactored to use a Page Object Model (POM).
- New files (tests/pages):
  - `SearchPage.ts` — search and open first result
  - `ProductPage.ts` — quantity handling, add-to-cart, overlay removal
  - `CartPage.ts` — cart parsing, change item quantity, totals
- Test updated: `tests/amazon-cart.spec.ts` now uses the POM classes and includes more resilient assertions for SKU/availability differences.

Quick commands
- Run the single scenario (Chromium):

```bash
npx playwright test tests/amazon-cart.spec.ts --project=chromium
```

- Open last HTML report:

```bash
npx playwright show-report
```

Notes
- The POM split keeps selectors and page behaviors isolated for easier maintenance. If you need me to commit these changes and open a PR, I can do that next.
