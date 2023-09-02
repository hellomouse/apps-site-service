
import { scrape } from '../node_save/nodeSavePageWE.js';

/**
 * Save a webpage as a HTML
 * @param {string} url Url
 * @param {string} dest Destination file to save HTML
 */
export async function downloadHtml(url, dest) {
    await scrape({
        url: url,
        path: dest
    });
}
