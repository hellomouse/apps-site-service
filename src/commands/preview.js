import ogs from 'open-graph-scraper';
import { validateUrl, downloadImage, urlHash } from '../util/url.js';
import { fileDir } from '../../config.js';
import path from 'path';

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36';

/**
 * Save a webpage as a HTML
 * @param {string} url Url
 * @return {object} Preview data
 */
export async function downloadPreview(url) {
    const options = {
        url,
        fetchOptions: {
            headers: {
                // Twitter has user agent rules for bots
                'user-agent': url.split('//')[1].startsWith('twitter.com') ?
                    'Twitterbot/1.1' : userAgent
            }
        }
    };

    const data = await ogs(options);
    if (!data.error) {
        let result = data.result;
        return {
            title: result.ogTitle || result.ogSiteName,
            desc: result.ogDescription || 'No description provided',
            name: result.ogSiteName,
            image: result.ogImage ? result.ogImage[0]?.url : ''
        };
    }
    throw new Error('Failed to get');
}

/**
 * Command to export
 * @param {object} data Data from DB
 * @param {object} client DB Client
 */
export async function commandPinPreview(data, client) {
    // Format of data.data: pin uuid|url
    const splitIndex = data.data.indexOf('|'); // Split on first |
    const url = data.data.substring(splitIndex + 1);
    const pinId = data.data.substring(0, splitIndex);

    validateUrl(url);
    const preview = await downloadPreview(url);

    const pin = (await client.query('SELECT * FROM board.pins WHERE id = $1;', [pinId])).rows[0];
    if (!pin) return;

    let newContent = pin.content.split('\n');
    while (newContent.length < 5)
        newContent.push('');
    newContent[2] = preview.image;
    newContent[3] = preview.title;
    newContent[4] = preview.desc;
    newContent = newContent.join('\n');

    if (preview.image)
        await downloadImage(preview.image, { width: 60, height: 60 },
            path.join(fileDir, 'thumb', urlHash(url) + '.webp'));

    let result = await client.query('UPDATE board.pins SET content = $2 WHERE id = $1;', [pinId, newContent]);
    if (result.rowCount < 1) throw new Error('Failed to update pin, maybe it was deleted');
}
