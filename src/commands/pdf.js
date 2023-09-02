import { waitTillHTMLRendered, getBrowserAndPage } from '../node_save/puppeteer_util.js';
import { createDirIfNotExist } from '../util/file.js';
import { fileDir } from '../../config.js';
import { validateUrl } from '../util/url.js';
import path from 'path';

/**
 * Save a webpage as a PDF
 * @param {string} url Url
 * @param {string} dest Destination file to save PDF
 */
export async function downloadPdf(url, dest) {
    const { browser, page } = await getBrowserAndPage();
    await page.goto(url, { timeout: 40000, waitUntil: ['networkidle0'] });
    await waitTillHTMLRendered(page);
    createDirIfNotExist(dest);
    await page.pdf({
        path: dest,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true
    });
    await browser.close();
}

/**
 * Command to export
 * @param {object} data Data from DB
 * @param {object} client DB Client
 */
export async function commandPdf(data, client) {
    validateUrl(data.data);
    await downloadPdf(data.data, path.join(fileDir, data.id + '.pdf'));
}
