Amazon cart Playwright test
============================


2026 - 03 - 12 Finally we moved to testing against saucedemo.com for easiness and quickness after a huge effor trying to beat Amazon anti-bot measures which were really frustrating my attempts.
--------------------------------------------------------
# SauceDemo 9‑Step Cart Flow – Playwright Test

This project contains a **Playwright** test that automates a realistic e‑commerce shopping cart scenario on [SauceDemo](https://www.saucedemo.com), a demo site built specifically for practicing test automation. The test is written in TypeScript and follows the Page Object Model pattern for maintainability and readability.

After a long and frustrating battle with Amazon’s aggressive anti‑bot defenses, we finally switched to SauceDemo – and had a reliable, passing test within minutes. This README tells the story and explains how the test works.

---

## 📜 The Original 9‑Step Scenario

The original goal was to automate the following flow on a real e‑commerce site (Amazon):

1. Go to the home page  
2. Search for “hats for men”  
3. Add the first hat to the cart with **quantity 2**  
4. Open the cart and verify the total price and quantity  
5. Search for “hats for women”  
6. Add the first hat to the cart with **quantity 1**  
7. Open the cart and verify the total price and quantity  
8. Change the men’s hat quantity from 2 to 1 in the cart  
9. Verify the updated totals  

This is a perfect candidate for testing cart functionality, but Amazon makes it **extremely difficult** to automate.

---

## ⚔️ The Long Road: Amazon vs. Automation

We first tried with **Cypress**, then switched to **Playwright** with every anti‑detection trick we knew:

- Stealth plugins (`puppeteer-extra-plugin-stealth`)  
- Random viewport sizes and user agents  
- Human‑like typing delays  
- Rotating through search results to find valid products  
- CAPTCHA detection and retries  
- Revisiting product pages to add items twice  

Despite all this, Amazon’s WAF consistently blocked us: timeouts, 503 errors, CAPTCHAs, and price elements that refused to be found. After a full day of debugging, we had to accept that **fighting Amazon is a losing battle**.

---

## 🏝️ The Switch to SauceDemo

[SauceDemo](https://www.saucedemo.com) is a **purpose‑built demo application** for testing automation skills. It offers:

- No CAPTCHAs, rate limiting, or bot detection  
- Predictable, stable selectors (many with `data-test` attributes)  
- A simple inventory with fixed, known prices  
- A cart that behaves consistently  
- Multiple user types (`standard_user`, `locked_out_user`, etc.)  

With SauceDemo, the same 9‑step scenario was implemented in minutes and **never fails** due to anti‑bot measures. This is a testament to the importance of choosing the right tool for the job.

---

## 🔄 Adapting the 9 Steps for SauceDemo

SauceDemo’s cart has one important limitation: **you cannot increase the quantity of an already added product**. Clicking “Add to Cart” on an item that is already in the cart **removes** it. Therefore, to simulate “quantity 2” for the men’s hat, we use **two different men’s products**.

The adapted flow is:

1. **Login** to SauceDemo with `standard_user`.  
2. **Add two different “men’s” items** (randomly chosen from the inventory) – this replaces “men’s hat quantity 2”.  
3. **Open the cart and verify** that both items are present and the total price matches their sum.  
4. **Add one “women’s” item** (randomly chosen, distinct from the two men’s items).  
5. **Open the cart and verify** all three items.  
6. **Remove one of the men’s items** – this replaces “reduce men’s hat quantity to 1”.  
7. **Open the cart and verify** that one men’s item and the women’s item remain, and the total is correct.

The core logic – **add two items, add a third, remove one, check totals** – is preserved. This gives us the same level of confidence in the cart functionality, without fighting a live site.

---

## 🧩 Why Three Products? (Avoiding Stock Issues)

A real e‑commerce site might have products with only one unit in stock. If we tried to add the same product twice, the second addition could fail due to unavailability. By using **two distinct products** for the men’s “quantity 2”, we eliminate that risk entirely. SauceDemo has ample inventory, but the principle is sound: never assume you can add unlimited quantities of a single product.

We also choose **three random products** each run. This adds variety to the test and helps uncover any hidden assumptions about product names or prices.

---

## 📊 Detailed Logging

At every important step, the test prints a clear table comparing **expected items** (what the test thinks should be in the cart) with **actual items** (what Playwright reads from the cart). This makes debugging trivial – you can see exactly what went wrong and where.

Example output:

📊 After two men’s items – Expected vs Actual
Expected Items:
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |
| 1 | Sauce Labs Backpack | 1 | $29.99 | $29.99 |
| 2 | Sauce Labs Bolt T-Shirt| 1 | $15.99 | $15.99 |

Actual Cart Items:
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |
| 1 | Sauce Labs Backpack | 1 | $29.99 | $29.99 |
| 2 | Sauce Labs Bolt T-Shirt| 1 | $15.99 | $15.99 |

Expected total: $45.98
Actual total: $45.98


other full example:

🎲 Randomly selected products:
Men's item 1: "Sauce Labs Onesie" @ $7.99                                                                                                                                                                                     
Men's item 2: "Sauce Labs Bike Light" @ $9.99                                                                                                                                                                                 
Women's item: "Sauce Labs Backpack" @ $29.99                                                                                                                                                                                  
                                                                                                                                                                                                                              
🟦 Adding first men's item: Sauce Labs Onesie

🟦 Adding second men's item: Sauce Labs Bike Light

📊 After two men’s items – Expected vs Actual
Expected Items:                                                                                                                                                                                                               
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |                                                                                                                                                                   
| 1 | Sauce Labs Onesie | 1 | $7.99 | $7.99 |                                                                                                                                                                                 
| 2 | Sauce Labs Bike Light | 1 | $9.99 | $9.99 |                                                                                                                                                                             
                                                                                                                                                                                                                              
Actual Cart Items:
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |                                                                                                                                                                   
| 1 | Sauce Labs Onesie | 1 | $7.99 | $7.99 |                                                                                                                                                                                 
| 2 | Sauce Labs Bike Light | 1 | $9.99 | $9.99 |                                                                                                                                                                             
                                                                                                                                                                                                                              
Expected total: $17.98
Actual total:   $17.98                                                                                                                                                                                                        
----------------------------------------                                                                                                                                                                                      
                                                                                                                                                                                                                              
🟪 Adding women's item: Sauce Labs Backpack

📊 After all three items – Expected vs Actual
Expected Items:                                                                                                                                                                                                               
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |                                                                                                                                                                   
| 1 | Sauce Labs Onesie | 1 | $7.99 | $7.99 |                                                                                                                                                                                 
| 2 | Sauce Labs Bike Light | 1 | $9.99 | $9.99 |                                                                                                                                                                             
| 3 | Sauce Labs Backpack | 1 | $29.99 | $29.99 |                                                                                                                                                                             
                                                                                                                                                                                                                              
Actual Cart Items:
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |                                                                                                                                                                   
| 1 | Sauce Labs Onesie | 1 | $7.99 | $7.99 |                                                                                                                                                                                 
| 2 | Sauce Labs Bike Light | 1 | $9.99 | $9.99 |                                                                                                                                                                             
| 3 | Sauce Labs Backpack | 1 | $29.99 | $29.99 |                                                                                                                                                                             
                                                                                                                                                                                                                              
Expected total: $47.97
Actual total:   $47.97                                                                                                                                                                                                        
----------------------------------------                                                                                                                                                                                      
                                                                                                                                                                                                                              
🔁 Removing first men's item: Sauce Labs Onesie

📊 After removal – Expected vs Actual
Expected Items:                                                                                                                                                                                                               
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |                                                                                                                                                                   
| 1 | Sauce Labs Bike Light | 1 | $9.99 | $9.99 |                                                                                                                                                                             
| 2 | Sauce Labs Backpack | 1 | $29.99 | $29.99 |                                                                                                                                                                             

🔁 Removing first men's item: Sauce Labs Onesie

📊 After removal – Expected vs Actual
Expected Items:
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |
| 1 | Sauce Labs Bike Light | 1 | $9.99 | $9.99 |
| 2 | Sauce Labs Backpack | 1 | $29.99 | $29.99 |

Actual Cart Items:
| # | Item Name (truncated) | Qty | Unit Price | Subtotal |
| 1 | Sauce Labs Bike Light | 1 | $9.99 | $9.99 |
| 2 | Sauce Labs Backpack | 1 | $29.99 | $29.99 |

Expected total: $39.98
Actual total:   $39.98
----------------------------------------

✅ Test passed!
  1 passed (8.6s)

---

## 🚀 Running the Test

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository (or create the project from the script)
git clone <your-repo-url>
cd saucedemo-test

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install


Run the test
------------

# Run in headed mode (browser visible)
npm run test:headed

# Run in headless mode (default)
npm test

# View the HTML report after a run
npm run report

🎯 Conclusion
While it’s tempting to automate against a live, heavily defended site like Amazon, the effort often outweighs the benefits. Switching to a test‑friendly environment like SauceDemo allowed us to focus on what really matters: writing a robust, maintainable test that validates the cart flow. The 9‑step scenario is faithfully represented, and we now have a stable, fast test suite that we can run with confidence.

The journey through Cypress, Playwright, stealth plugins, and endless debugging taught us a lot about automation – but in the end, the simplest solution (a proper demo site) was also the most effective.

this are just the logs while trying to test in Amazon:

2026 - 03 - 09  Summary
-----------------------
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
- Added beforeEach and afterEach hooks to the Cypress test to clear cookies, local storage, and session storage. This was key to achieving consistent, repeatable test runs, especially when rerunning tests multiple times or after reopening Cypress.
