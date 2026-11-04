import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './test-config';

test('conditional order for products under threshold using config', async ({ page }) => {
  // Helper function to generate a clean timestamp string (e.g., "2026-03-31_14-30-15")
  const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  };

  // 1. Navigate and log in using config variables
  await page.goto(TEST_CONFIG.url);
  await page.locator('[data-test="username"]').fill(TEST_CONFIG.username);
  await page.locator('[data-test="password"]').fill(TEST_CONFIG.password);
  await page.locator('[data-test="login-button"]').click();

  // 2. Get all inventory items on the page
  const items = page.locator('[data-test="inventory-item"]');
  const count = await items.count();
  console.log(`Found ${count} products on the page.`);

  let itemsAdded = 0;

  // 3. Loop through each product to check its price
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    
    const name = await item.locator('[data-test="inventory-item-name"]').textContent();
    const priceText = await item.locator('[data-test="inventory-item-price"]').textContent();

    if (priceText) {
      const priceValue = parseFloat(priceText.replace('$', ''));
      console.log(`Product: "${name?.trim()}" | Price: $${priceValue}`);

      // 4. Check against threshold from config
      if (priceValue < TEST_CONFIG.maxPriceThreshold) {
        console.log(`-> Price is under $${TEST_CONFIG.maxPriceThreshold}. Adding "${name?.trim()}" to cart.`);
        await item.locator('button').click();
        itemsAdded++;
      }
    }
  }

  // 5. Proceed to checkout only if items were added
  if (itemsAdded > 0) {
    console.log(`Total items added under $${TEST_CONFIG.maxPriceThreshold}: ${itemsAdded}. Proceeding to checkout...`);

    await page.locator('[data-test="shopping-cart-link"]').click();
    await page.locator('[data-test="checkout"]').click();
    
    // Fill customer info from config
    await page.locator('[data-test="firstName"]').fill(TEST_CONFIG.firstName);
    await page.locator('[data-test="lastName"]').fill(TEST_CONFIG.lastName);
    await page.locator('[data-test="postalCode"]').fill(TEST_CONFIG.postalCode);
    await page.locator('[data-test="continue"]').click();
    
    // 6. Pause and timestamped screenshot on Checkout Overview page
    console.log('Pausing for 10 seconds on checkout overview page...');
    await page.waitForTimeout(10000);
    const overviewTimestamp = getTimestamp();
    await page.screenshot({ path: `screenshots/checkout-overview_${overviewTimestamp}.png`, fullPage: true });

    // 7. Finish order
    await page.locator('[data-test="finish"]').click();
    await expect(page.locator('[data-test="title"]')).toContainText('Checkout: Complete!');
    console.log('Order successfully placed!');

    // 8. Timestamped screenshot and delay after completion
    const completeTimestamp = getTimestamp();
    await page.screenshot({ path: `screenshots/order-complete_${completeTimestamp}.png`, fullPage: true });
    console.log('Pausing for 10 seconds on order confirmation page...');
    await page.waitForTimeout(10000);
  } else {
    console.log(`No products were found under $${TEST_CONFIG.maxPriceThreshold}. Skipping checkout.`);
  }
});