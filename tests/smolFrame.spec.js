const { test, expect } = require('@playwright/test');

const fixture = '/tests/fixture.php';

async function markDocument(page) {
    await page.evaluate(() => { window.testMarker = true; });
}

async function expectSameDocument(page) {
    expect(await page.evaluate(() => window.testMarker)).toBe(true);
}

async function expectNewDocument(page) {
    expect(await page.evaluate(() => window.testMarker)).toBeUndefined();
}

test.beforeEach(async ({ page }) => {
    await page.goto(fixture);
});

test.describe('frame navigation', () => {
    test('intercepts a link, updates its frame, and preserves the document', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Next' }).click();
        await expect(page.locator('#value')).toHaveText('next');
        await expect(page).toHaveURL(/page=next/);
        await expect(page.locator('#request-frame')).toHaveText('main');
        await expect(page.locator('#main')).toHaveAttribute('data-current-url', /page=next/);
        await expectSameDocument(page);
    });

    test('updates a specifically targeted frame without replacing the original', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Target auxiliary' }).click();
        await expect(page.locator('#aux #aux-value')).toHaveText('aux initial');
        // The response includes #aux, but its content is unchanged by this fixture.
        await expect(page.locator('#aux')).toHaveAttribute('data-current-url', /page=aux-link/);
        await expect(page.locator('#value')).toHaveText('initial');
        await expectSameDocument(page);
    });

    test('updates synchronized content and document title', async ({ page }) => {
        await page.getByRole('link', { name: 'Next' }).click();
        await expect(page.locator('#synced')).toHaveText('Synced: next');
        await expect(page).toHaveTitle('Test page: next');
    });

    test('restores frame content through browser Back and Forward', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Next' }).click();
        await expect(page.locator('#value')).toHaveText('next');
        await page.getByRole('link', { name: 'Second' }).click();
        await expect(page.locator('#value')).toHaveText('second');

        await page.goBack();
        await expect(page.locator('#value')).toHaveText('next');
        await expect(page).toHaveURL(/page=next/);

        await page.goForward();
        await expect(page.locator('#value')).toHaveText('second');
        await expect(page).toHaveURL(/page=second/);
        await expectSameDocument(page);
    });

    test('stateless frames do not alter the browser URL', async ({ page }) => {
        await page.goto(`${fixture}?stateless=1`);
        await markDocument(page);
        const initialURL = page.url();
        await page.getByRole('link', { name: 'Next' }).click();
        await expect(page.locator('#value')).toHaveText('next');
        expect(page.url()).toBe(initialURL);
        await expectSameDocument(page);
    });
});

test.describe('forms', () => {
    test('GET submission preserves the document and encodes parameters', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('button', { name: 'Submit GET' }).click();
        await expect(page.locator('#value')).toHaveText('submitted');
        await expect(page.locator('#method')).toHaveText('GET');
        await expect(page).toHaveURL(/page=submitted/);
        await expectSameDocument(page);
    });

    test('POST submission updates the frame without pushing history', async ({ page }) => {
        await markDocument(page);
        const initialURL = page.url();
        await page.getByRole('button', { name: 'Submit POST', exact: true }).click();
        await expect(page.locator('#value')).toHaveText('posted');
        await expect(page.locator('#method')).toHaveText('POST');
        expect(page.url()).toBe(initialURL);
        await expectSameDocument(page);
    });

    test('submitter formmethod overrides the form method', async ({ page }) => {
        await markDocument(page);
        const initialURL = page.url();
        await page.getByRole('button', { name: 'Submit POST override' }).click();
        await expect(page.locator('#value')).toHaveText('submitted');
        await expect(page.locator('#method')).toHaveText('POST');
        expect(page.url()).toBe(initialURL);
        await expectSameDocument(page);
    });

    test('native constraint validation blocks an invalid form', async ({ page }) => {
        await page.locator('form[method="get"] input[name="page"]').fill('');
        await markDocument(page);
        await page.getByRole('button', { name: 'Submit GET' }).click();
        await expect(page.locator('#value')).toHaveText('initial');
        await expectSameDocument(page);
    });
});

test.describe('response protocol and errors', () => {
    test('X-Source-Frame selects replacement content', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Source override' }).click();
        await expect(page.locator('#main #remote-value')).toHaveText('from-source');
        await expectSameDocument(page);
    });

    test('X-Target-Frame selects another destination', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Target override' }).click();
        await expect(page.locator('#aux')).toHaveAttribute('data-current-url', /target=aux/);
        await expect(page.locator('#value')).toHaveText('initial');
        await expectSameDocument(page);
    });

    test('invalid target header does not leave loading state stuck or throw uncaught errors', async ({ page }) => {
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await markDocument(page);
        await page.getByRole('link', { name: 'Invalid target' }).click();
        await expect(page.locator('#main')).not.toHaveAttribute('data-frame-loading', '');
        await expect(page.locator('#value')).toHaveText('initial');
        await expectSameDocument(page);
        expect(pageErrors).toEqual([]);
        // A separate assertion for data-frame-error on #main would currently
        // expose a UX gap: the invalid override resolves to null, so the catch
        // block has no element on which to report the error.
    });

    test('server errors mark the frame and clear loading state', async ({ page }) => {
        await page.getByRole('link', { name: 'Server error' }).click();
        await expect(page.locator('#main')).toHaveAttribute('data-frame-error', /HTTP 500/);
        await expect(page.locator('#main')).not.toHaveAttribute('data-frame-loading', '');
        await expect(page.locator('#value')).toHaveText('initial');
    });

    test('a 204 redirect triggers a full page navigation', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Redirect', exact: true }).click();
        await expect(page).toHaveURL(/page=redirected/);
        await expect(page.locator('#value')).toHaveText('redirected');
        await expectNewDocument(page);
    });

    test('a 204 without X-Redirect-URL is an application protocol error', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Bad redirect' }).click();
        await expect(page.locator('#main')).toHaveAttribute('data-frame-error', /No redirect specified/);
        await expect(page.locator('#main')).not.toHaveAttribute('data-frame-loading', '');
        await expectSameDocument(page);
    });

    test('missing response frame falls back to a full page load', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Missing frame' }).click();
        await expect(page).toHaveURL(/missing=1/);
        await expect(page.locator('#main')).toHaveCount(0);
        await expectNewDocument(page);
    });

    test('data-frame-hide-missing hides an absent frame instead of reloading', async ({ page }) => {
        await page.goto(`${fixture}?hide=1`);
        await markDocument(page);
        const initialURL = page.url();
        await page.getByRole('link', { name: 'Missing frame' }).click();
        await expect(page.locator('#main')).toBeHidden();
        expect(page.url()).toBe(initialURL);
        await expectSameDocument(page);
    });
});

test.describe('native browser behavior', () => {
    test('ordinary untargeted links navigate normally', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Ordinary link' }).click();
        await expect(page).toHaveURL(/page=ordinary/);
        await expectNewDocument(page);
    });

    test('data-frame-target=_top uses normal browser navigation', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Native top' }).click();
        await expect(page).toHaveURL(/page=native/);
        await expectNewDocument(page);
    });

    test('links to a different origin use normal browser navigation', async ({ page }) => {
        await markDocument(page);
        await page.getByRole('link', { name: 'Other origin' }).click();
        await expect(page).toHaveURL('http://localhost:8765/tests/fixture.php?page=external');
        await expectNewDocument(page);
    });

    test('target=_blank opens a new tab without replacing the current page', async ({ page }) => {
        await markDocument(page);
        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            page.getByRole('link', { name: 'Native blank' }).click(),
        ]);
        await popup.waitForLoadState();
        await expect(popup).toHaveURL(/page=popup/);
        await expectSameDocument(page);
        await popup.close();
    });
});
