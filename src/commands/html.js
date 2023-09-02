
import { scrape } from '../node_save/nodeSavePageWE.js';
import { createDirIfNotExist } from '../util/file.js';

/**
 * Save a webpage as a HTML
 * @param {string} url Url
 * @param {string} dest Destination file to save HTML
 */
export async function downloadHtml(url, dest) {
    createDirIfNotExist(dest);
    await scrape({
        url: url,
        path: dest
    });
}
