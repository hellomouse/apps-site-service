import { fileDir } from '../../config.js';
import { validateUrl } from '../util/url.js';
import { downloadHtml } from './html.js';

import { isImgur, downloadImgur } from './downloader/imgur.js';
import { isNewgrounds, downloadNewgrounds } from './downloader/newgrounds.js';
import { isSoundCloud, downloadSoundCloud } from './downloader/soundcloud.js';
import { isTwitter, downloadTwitter } from './downloader/twitter.js';
import { isRedditPost, isRedditComment, downloadRedditPost, downloadRedditComment } from './downloader/reddit.js';

import path from 'path';
import { downloadYoutube, isYoutube } from './downloader/youtube.js';

/**
 * Command to export
 * @param {object} data Data from DB
 * @param {object} client DB Client
 */
export async function commandMedia(data, client) {
    validateUrl(data.data);
    let dest = path.join(fileDir, 'site_downloads');
    if (isImgur(data.data))
        await downloadImgur(data.data, dest, data.id);
    else if (isNewgrounds(data.data))
        await downloadNewgrounds(data.data, dest, data.id);
    else if (isSoundCloud(data.data))
        await downloadSoundCloud(data.data, dest, data.id);
    else if (isTwitter(data.data))
        await downloadTwitter(data.data, dest, data.id);
    else if (isRedditPost(data.data))
        await downloadRedditPost(data.data, dest, data.id);
    else if (isRedditComment(data.data))
        await downloadRedditComment(data.data, dest, data.id);
    else if (isYoutube(data.data))
        await downloadYoutube(data.data, dest, data.id, client);
    else
        await downloadHtml(data.data, path.join(fileDir, 'site_downloads', data.id + '.html'));
}
