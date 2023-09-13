/** */
/*                                                                      */
/*      Based on: Save Page WE - Generic WebExtension - Background Page */
/*                (forked on December 31, 2018)                         */
/*      Copyright (C) 2016-2018 DW-dev                                  */
/*                                                                      */
/*      Adapted for Node/Puppeteer by Markus Mobius                     */
/*      markusmobius@gmail.com                                          */
/*                                                                      */
/*      Distributed under the GNU General Public License version 2      */
/*      See LICENCE.txt file and http://www.gnu.org/licenses/           */
/*                                                                      */
/** */
import fs from 'fs';
import { EventEmitter } from 'events';
import DOMPurify from 'isomorphic-dompurify';
import { waitTillHTMLRendered, getBrowserAndPage } from '../node_save/puppeteer_util.js';

EventEmitter.defaultMaxListeners = 50;

/**
 * Scrape a webpage
 * @param {object} task { url: url to download, path: path to save at }
 */
export async function scrape(task) {
    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

    const { browser, page } = await getBrowserAndPage();
    await page.goto(task.url, { timeout: 40000, waitUntil: ['networkidle0'] });
    await waitTillHTMLRendered(page);
    await page.addScriptTag({ path: './src/node_save/nodeSavePageWE_client.js' });

    await page.evaluate(async params => {
        // eslint-disable-next-line no-undef
        runSinglePage(params);
    }, { 'lazyload': task.lazyload });

    let savedPageHTML = '';
    while (true) {
        savedPageHTML = await page.evaluate(async () => {
            // eslint-disable-next-line no-undef
            return htmlFINAL;
        }, {});
        if (savedPageHTML !== 'NONE')
            break;
        await snooze(100);
    }

    // Sanitize & embed in iframe
    savedPageHTML = DOMPurify.sanitize(savedPageHTML, { WHOLE_DOCUMENT: true });
    savedPageHTML = savedPageHTML.replace(/&/g, '&amp;amp;').replace(/"/g, '&quot;');
    savedPageHTML = `
    <head><meta content='width=device-width, initial-scale=1.0' name='viewport'><meta charset="UTF-8">
    <style>
        body, html: { margin: 0; padding: 0; height: 100%; overflow: hidden; }
        div { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    </style></head><body>
    <div><iframe  width="100%" height="100%" frameborder="0" seamless sandbox srcdoc="${savedPageHTML}"/></div></body>
    `;

    // now inject resources back into page
    fs.writeFileSync(task.path, savedPageHTML);
    await browser.close();
}
