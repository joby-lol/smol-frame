
const { test, expect } = require('@playwright/test');

test('updates a frame without reloading the page', async ({ page }) => {
    await page.goto('/tests/fixture.php');

    // A marker that would disappear after a real page reload.
    await page.evaluate(() => window.testMarker = true);

    await page.getByRole('link', { name: 'Next' }).click();

    await expect(page.locator('#value')).toHaveText('next');
    await expect(page).toHaveURL(/page=next/);

    expect(await page.evaluate(() => window.testMarker)).toBe(true);
});

test('submits a GET form into its frame', async ({ page }) => {
    await page.goto('/tests/fixture.php');

    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#value')).toHaveText('submitted');
    await expect(page).toHaveURL(/page=submitted/);
});

test('follows a server-directed 204 redirect', async ({ page }) => {
    await page.goto('/tests/fixture.php');

    await page.getByRole('link', { name: 'Redirect' }).click();

    await expect(page).toHaveURL(/page=redirected/);
    await expect(page.locator('#value')).toHaveText('redirected');
});
