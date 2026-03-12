/// <reference types="cypress" />

describe('Amazon cart flow – 9-step scenario (diagnostic, bilingual)', () => {
  const humanDelay = () => cy.wait(Math.floor(Math.random() * 1000) + 500);

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });
  });

  afterEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });
  });

  it('should add two different men’s hats, then a women’s hat, then remove one men’s hat', () => {
    // --- Empty cart ---
    cy.visit('https://www.amazon.com/gp/cart/view.html');
    cy.get('body').then(($body) => {
      if ($body.find('.sc-list-item').length) {
        cy.log('Clearing cart...');
        cy.get('.sc-list-item').each(($el) => {
          cy.wrap($el)
            .find('input[value="Delete"], .sc-action-delete input, .sc-action-delete .a-declarative')
            .first()
            .click({ force: true });
          humanDelay();
        });
        cy.get('.sc-list-item', { timeout: 10000 }).should('not.exist');
      }
    });

    cy.setCookie('csm-hit', 'tb:PDC1R05SVG3PNKQQH5E1+s-PDC1R05SVG3PNKQQH5E1|1773235376951&t:1773235376951&adb:adblk_no');

    // --- Helper: search, open first product that contains "hat" or "sombrero" in title, capture details, add to cart ---
    const addFirstProduct = (searchTerm, productNumber) => {
      cy.log(`🔍 [${productNumber}] Starting search for: ${searchTerm}`);
      cy.visit('https://www.amazon.com/');
      cy.get('input[type="text"][name="field-keywords"]', { timeout: 15000 }).should('be.visible');
      cy.get('input[type="text"][name="field-keywords"]').clear().type(searchTerm + '{enter}');

      cy.get('div[data-component-type="s-search-result"]', { timeout: 15000 }).should('be.visible');
      cy.log(`✅ [${productNumber}] Search results loaded`);

      // Get the first search result title
      cy.get('div[data-component-type="s-search-result"]').first().within(() => {
        cy.get('h2').first().invoke('text').then((text) => {
          const productTitle = text.trim();
          cy.log(`📦 [${productNumber}] Raw search title: "${productTitle}"`);
          // Accept either English "hat" or Spanish "sombrero" (case insensitive)
          const titleLower = productTitle.toLowerCase();
          expect(titleLower.includes('hat') || titleLower.includes('sombrero')).to.be.true;
        });
        cy.get('a').first().should('be.visible').click({ force: true });
      });

      cy.location('pathname', { timeout: 20000 }).should((pathname) => {
        expect(pathname).to.match(/\/dp\/|\/gp\/product\//);
      });
      cy.log(`✅ [${productNumber}] Product page loaded`);

      // Capture price
      const buyBoxSelector = '#buyNewSection, #buyBoxAccordion, #corePrice_desktop, .a-box-inner, #buyBox';
      const priceSelector = '#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen, .a-price-whole';

      return cy.get('#productTitle').invoke('text').then((title) => {
        const finalTitle = title.trim();
        cy.log(`📦 [${productNumber}] Final product title: "${finalTitle}"`);

        return cy.get(buyBoxSelector)
          .find(priceSelector)
          .first()
          .invoke('text')
          .then((priceText) => {
            cy.log(`💰 [${productNumber}] Raw price text: "${priceText}"`);

            if (priceText.match(/^\d+$/)) {
              return cy.get('.a-price-fraction').first().invoke('text').then((fraction) => {
                const fullPrice = priceText + '.' + fraction;
                const currency = fullPrice.replace(/[\d.,\s]/g, '').trim();
                const price = parseFloat(fullPrice.replace(/[^0-9.]/g, ''));
                return { title: finalTitle, price, currency };
              });
            } else {
              const currency = priceText.replace(/[\d.,\s]/g, '').trim();
              const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
              return cy.wrap({ title: finalTitle, price, currency });
            }
          });
      }).then((item) => {
        // Get current cart count
        cy.get('#nav-cart-count').invoke('text').then((text) => {
          const oldCount = parseInt(text.trim(), 10) || 0;
          cy.log(`📊 [${productNumber}] Cart count BEFORE click: ${oldCount}`);

          cy.get('#add-to-cart-button').should('be.visible').click();
          cy.log(`🖱️ [${productNumber}] Clicked Add to Cart`);

          // Wait for count to increase (assertion only, no commands inside)
          cy.get('#nav-cart-count', { timeout: 15000 }).should(($el) => {
            const newCount = parseInt($el.text().trim(), 10);
            expect(newCount).to.equal(oldCount + 1);
          });

          // Log the new count after assertion passes
          cy.get('#nav-cart-count').invoke('text').then((text) => {
            const newCount = parseInt(text.trim(), 10);
            cy.log(`📊 [${productNumber}] Cart count AFTER click: ${newCount}`);
          });

          // Check for error messages
          cy.get('body').then(($body) => {
            if ($body.find('#attach-added-to-cart-message, .a-alert-success').length) {
              cy.log(`✅ [${productNumber}] "Added to Cart" confirmation seen`);
            } else if ($body.find('.a-alert-error').length) {
              const errorText = $body.find('.a-alert-error').text();
              cy.log(`❌ [${productNumber}] Error message found: ${errorText}`);
            } else {
              cy.log(`ℹ️ [${productNumber}] No confirmation or error message`);
            }
          });
        });

        humanDelay();
        return cy.wrap(item);
      });
    };

    // --- Helper: open cart, compute total and quantity, with retry and HTML logging on failure ---
    const assertCart = (expectedTotal, expectedQty, stepName, retry = true) => {
      cy.log(`🛒 ASSERT CART: ${stepName}`);
      cy.get('#nav-cart').click();
      humanDelay();

      cy.get('.sc-cart-header', { timeout: 15000 }).should('be.visible');
      cy.log('✅ Cart page loaded');

      cy.get('.sc-list-item', { timeout: 15000 }).then(($items) => {
        if ($items.length !== expectedQty) {
          cy.log(`⚠️ Expected ${expectedQty} items but found ${$items.length}.`);
          
          // Log the entire cart HTML for debugging
          cy.document().then((doc) => {
            const html = doc.documentElement.outerHTML;
            cy.log('📄 Cart page HTML (truncated):', html.substring(0, 2000));
          });

          if (retry) {
            cy.log('🔄 Refreshing cart and retrying once...');
            cy.reload();
            cy.get('.sc-cart-header', { timeout: 15000 }).should('be.visible');
            cy.get('.sc-list-item', { timeout: 15000 }).should('have.length', expectedQty);
          } else {
            throw new Error(`Cart item count mismatch: expected ${expectedQty}, found ${$items.length}`);
          }
        } else {
          cy.log(`✅ Cart has ${expectedQty} items as expected`);
        }
      });

      cy.get('#nav-cart-count').invoke('text').then((countText) => {
        const headerCount = parseInt(countText.trim(), 10);
        cy.log(`Cart header count: ${headerCount} (expected ${expectedQty})`);
        expect(headerCount).to.equal(expectedQty);
      });

      let cartTotal = 0;
      let cartQty = 0;
      cy.get('.sc-list-item').each(($item, index) => {
        const title = Cypress.$($item).find('.sc-product-title').text().trim();
        const priceText = Cypress.$($item).find('.sc-product-price, .sc-price').first().text().trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        cartTotal += price;
        cartQty += 1;
        cy.log(`  Cart item ${index + 1}: "${title}" | Price: ${price}`);
      }).then(() => {
        cy.log(`Cart computed total: ${cartTotal.toFixed(2)}, expected total: ${expectedTotal.toFixed(2)}`);
        cy.log(`Cart computed quantity: ${cartQty}, expected quantity: ${expectedQty}`);
        expect(cartTotal).to.be.closeTo(expectedTotal, 0.02);
        expect(cartQty).to.equal(expectedQty);
      });
    };

    // --- Execute steps with numbered products ---
    let menHat1, menHat2, womenHat;

    cy.log('🟦 STEP 2 & 3: Adding first men’s hat');
    addFirstProduct('hats for men', 'MEN1').then((item) => {
      menHat1 = item;
      cy.log(`✅ First men's hat: $${menHat1.price} – "${menHat1.title}"`);

      cy.log('🟦 Adding second men’s hat');
      return addFirstProduct('hats for men', 'MEN2');
    }).then((item) => {
      menHat2 = item;
      cy.log(`✅ Second men's hat: $${menHat2.price} – "${menHat2.title}"`);

      cy.log('🟦 STEP 4: Verifying cart after two men’s hats');
      assertCart(menHat1.price + menHat2.price, 2, 'After two men’s hats');

      cy.log('🟪 STEP 5 & 6: Adding women’s hat');
      return addFirstProduct('hats for women', 'WOMEN');
    }).then((item) => {
      womenHat = item;
      cy.log(`✅ Women's hat: $${womenHat.price} – "${womenHat.title}"`);

      cy.log('🟪 STEP 7: Verifying cart after all items');
      assertCart(menHat1.price + menHat2.price + womenHat.price, 3, 'After all items');

      cy.log('🔁 STEP 8: Removing one men’s hat');
      cy.get('#nav-cart').click();
      humanDelay();
      cy.get('.sc-cart-header', { timeout: 15000 }).should('be.visible');

      cy.get('.sc-list-item').first().find('input[value="Delete"]').click({ force: true });
      humanDelay();

      cy.get('#nav-cart-count', { timeout: 10000 }).should('contain', '2');

      cy.log('🔁 STEP 9: Verifying cart after removal');
      assertCart(menHat2.price + womenHat.price, 2, 'After removal');

      cy.log('✅ Test completed successfully!');
    });
  });
});