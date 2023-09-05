import { waitTillHTMLRendered, getBrowserAndPage } from '../node_save/puppeteer_util.js';
import { createDirIfNotExist } from '../util/file.js';
import { fileDir } from '../../config.js';
import { validateUrl } from '../util/url.js';
import path from 'path';

/**
 * Save a webpage as a WEBP
 * @param {string} url Url
 * @param {string} dest Destination file to save PDF
 */
export async function downloadWEBP(url, dest) {
    const { browser, page } = await getBrowserAndPage();
    await page.setViewport({
        width: 1920,
        height: 1080
    });
    await page.goto(url, { timeout: 40000, waitUntil: ['networkidle0'] });
    await waitTillHTMLRendered(page);
    createDirIfNotExist(dest);

    let height = await page.evaluate(() => document.body.scrollHeight);
    await page.screenshot({
        path: dest,
        type: 'webp',
        clip: {
            x: 0,
            y: 0,
            width: page.viewport().width,
            height: Math.max(1080, height)
        },
        optimizeForSpeed: true
    });
    await browser.close();
}

/**
 * Command to export
 * @param {object} data Data from DB
 * @param {object} client DB Client
 */
export async function commandScreenshot(data, client) {
    validateUrl(data.data);
    await downloadWEBP(data.data, path.join(fileDir, 'site_downloads', data.id + '.webp'));
}
