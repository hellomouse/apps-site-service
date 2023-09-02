
import { scrape } from '../node_save/nodeSavePageWE.js';
import { createDirIfNotExist } from '../util/file.js';
import { fileDir } from '../../config.js';
import { validateUrl } from '../util/url.js';

import path from 'path';

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

/**
 * Command to export
 * @param {object} data Data from DB
 * @param {object} client DB Client
 */
export async function commandHtml(data, client) {
    validateUrl(data.data);
    await downloadHtml(data.data, path.join(fileDir, data.id + '.html'));
}
