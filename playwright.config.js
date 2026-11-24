
const { defineConfig } = require('@playwright/test');

const baseURL = 'http://127.0.0.1:8765';

module.exports = defineConfig({
    testDir: './tests',
    workers: 1,

    use: {
        baseURL,
        browserName: 'chromium',
        trace: 'retain-on-failure',
    },

    webServer: {
        command: 'php -S 127.0.0.1:8765 -t .',
        url: `${baseURL}/tests/fixture.php`,
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
