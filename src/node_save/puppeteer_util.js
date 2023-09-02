import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// eslint-disable-next-line new-cap
const stealthPlugin = StealthPlugin();
stealthPlugin.enabledEvasions.delete('iframe.contentWindow');
stealthPlugin.enabledEvasions.delete('navigator.plugins');
puppeteer.use(stealthPlugin);

export const waitTillHTMLRendered = async (page, timeout = 30000) => {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
        let html = await page.content();
        let currentHTMLSize = html.length;
        if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize)
            countStableSizeIterations++;
        else
            countStableSizeIterations = 0;
        if (countStableSizeIterations >= minStableSizeIterations)
            break;

        lastHTMLSize = currentHTMLSize;
        await page.waitForTimeout(checkDurationMsecs);
    }
};

export const getBrowserAndPage = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--disable-features=BlockInsecurePrivateNetworkRequests',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials',
            '--disable-web-security',
            '--proxy-server=\'direct://\'',
            '--proxy-bypass-list=*'
        ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36');

    await page.setViewport({
        width: 1600,
        height: 10000
    });

    await page.setBypassCSP(true);
    return { browser, page };
};
