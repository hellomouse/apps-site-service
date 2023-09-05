import fs from 'fs';
import path from 'path';
import https from 'https';

import getTwitterMedia from '../../util/twitter.js';
import { createDirIfNotExist } from '../../util/file.js';
import { escapeHtml, linkify, minifyHTML } from '../../util/url.js';

/**
 * Is a url a valid twitter url?
 * @param {string} url URL
 * @return {boolean} is the result twitter
 */
export function isTwitter(url) {
    if (url.endsWith('/')) url = url.substring(0, url.length - 1);
    return /^https:\/\/twitter\.com\/.+?\/status\/\d+\?*[A-Za-z0-9=_-]*$/g.test(url);
}

/**
 * Download a tweet from twitter
 * @param {string} url URL of tweet
 * @param {string} dest Destination folder path to save sound and html file
 * @param {string} id Id to save file names as
 */
export async function downloadTwitter(url, dest, id) {
    let result = await getTwitterMedia(url, {
        buffer: false,
        text: true
    });

    let [data, i] = ['', 0];
    for (let media of result.media) {
        let ext = media.url.split('?')[0].split('.').at(-1);
        let filename = `${id}-${i}.${ext}`;
        await https.get(media.url, resp => resp.pipe(fs.createWriteStream(path.join(dest, filename))));

        if (media.type === 'image')
            data += `<img src="${filename}" loading="lazy">`;
        else if (media.type === 'video')
            data += `<video controls><source type="video/${ext}" src="${filename}"></video>`;
        i += 1;
    }

    createDirIfNotExist(path.join(dest, 'tmp.tmp'));

    result.text = linkify(escapeHtml(result.text));
    let HTML = `
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Twitter Backup</title>
        <style>
.container {
    border: 1px solid #ddd;
    max-width: 95%;
    box-sizing: border-box;
    width: 500px;
    margin: 100px auto;
    padding: 15px;
}
img, video { width: 100%; display: block; margin-bottom: 5px; }
.text { margin-top: 5px; }
.author { font-size: 0.85rem; margin: 0; }
.light { opacity: 0.8; margin-left: 5px; }
.stats { opacity: 0.8; font-size: 0.85rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <p class="author"><b>${result.authorName}</b><span class="light">@${result.authorUsername} ${result.date}</span></p>
            <p class="text">${result.text}</p>
            ${data}

            <br>
            <span class="stats">${result.replies} Replies / ${result.retweets} Retweets / ${result.likes} Likes</span>
        </div>
    </body>
</html>`;
    HTML = minifyHTML(HTML);

    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}
