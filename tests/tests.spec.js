import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './test-config';

test('conditional order for products under threshold using config', async ({ page }, testInfo) => {
  // 1. Log the active browser project name to verify execution environment
  console.log(`---> Running test on browser project: ${testInfo.project.name}`);

  // Helper function to generate a clean timestamp string (e.g., "2026-11-04_17-56-00")
  const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  };

  // 2. Navigate and log in using config variables
  await page.goto(TEST_CONFIG.url);
  await page.locator('[data-test="username"]').fill(TEST_CONFIG.username);
  await page.locator('[data-test="password"]').fill(TEST_CONFIG.password);
  await page.locator('[data-test="login-button"]').click();

  // 3. Ensure we land successfully on the inventory page
  await page.waitForURL('**/inventory.html');

  // 4. Explicitly wait for inventory items to render before querying elements (prevents race conditions)
  const items = page.locator('[data-test="inventory-item"]');
  await items.first().waitFor({ state: 'visible', timeout: 10000 });

  const count = await items.count();
  console.log(`Found ${count} products on the page.`);

  let itemsAdded = 0;

  // 5. Loop through each product to check its price
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    
    const name = await item.locator('[data-test="inventory-item-name"]').textContent();
    const priceText = await item.locator('[data-test="inventory-item-price"]').textContent();

    if (priceText) {
      const priceValue = parseFloat(priceText.replace('$', ''));
      console.log(`Product: "${name?.trim()}" | Price: $${priceValue}`);

      // 6. Check against threshold from config
      if (priceValue < TEST_CONFIG.maxPriceThreshold) {
        console.log(`-> Price is under $${TEST_CONFIG.maxPriceThreshold}. Adding "${name?.trim()}" to cart.`);
        await item.locator('button').click();
        itemsAdded++;
      }
    }
  }

  // 7. Proceed to checkout only if items were added
  if (itemsAdded > 0) {
    console.log(`Total items added under $${TEST_CONFIG.maxPriceThreshold}: ${itemsAdded}. Proceeding to checkout...`);

    await page.locator('[data-test="shopping-cart-link"]').click();
    await page.locator('[data-test="checkout"]').click();
    
    // Fill customer info from config
    await page.locator('[data-test="firstName"]').fill(TEST_CONFIG.firstName);
    await page.locator('[data-test="lastName"]').fill(TEST_CONFIG.lastName);
    await page.locator('[data-test="postalCode"]').fill(TEST_CONFIG.postalCode);
    await page.locator('[data-test="continue"]').click();
    
    // 8. Pause and timestamped screenshot on Checkout Overview page (saved in 'screenshots' folder)
    console.log('Pausing for 10 seconds on checkout overview page...');
    await page.waitForTimeout(10000);
    const overviewTimestamp = getTimestamp();
    await page.screenshot({ path: `screenshots/checkout-overview_${overviewTimestamp}.png`, fullPage: true });

    // 9. Finish order
    await page.locator('[data-test="finish"]').click();
    await expect(page.locator('[data-test="title"]')).toContainText('Checkout: Complete!');
    console.log('Order successfully placed!');

    // 10. Timestamped screenshot and delay after completion
    const completeTimestamp = getTimestamp();
    await page.screenshot({ path: `screenshots/order-complete_${completeTimestamp}.png`, fullPage: true });
    console.log('Pausing for 10 seconds on order confirmation page...');
    await page.waitForTimeout(10000);
  } else {
    console.log(`No products were found under $${TEST_CONFIG.maxPriceThreshold}. Skipping checkout.`);
  }
});