import { waitTillHTMLRendered, getBrowserAndPage } from '../node_save/puppeteer_util.js';

/**
 * Save a webpage as a PDF
 * @param {string} url Url
 * @param {string} dest Destination file to save PDF
 */
export async function downloadPdf(url, dest) {
    const { browser, page } = await getBrowserAndPage();
    await page.goto(url, { timeout: 40000, waitUntil: ['networkidle0'] });
    await waitTillHTMLRendered(page);
    await page.pdf({
        path: dest,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true
    });
    await browser.close();
}
