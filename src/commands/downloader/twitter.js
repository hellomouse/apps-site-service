import fs from 'fs';
import path from 'path';
import minifier from 'html-minifier';

import getTwitterMedia from '../../util/twitter.js';
import { createDirIfNotExist } from '../../util/file.js';
import { escapeHtml, linkify } from '../../util/url.js';

/**
 * Is a url a valid twitter url?
 * @param {string} url URL
 * @return {boolean} is the result twitter
 */
export async function isTwitter(url) {
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
        buffer: true,
        text: true
    });

    let data = '';
    for (let media of result.media) {
        let ext = media.url.split('?')[0].split('.').at(-1);
        if (media.type === 'image')
            data += `<img src="data:${ext};base64,` + media.buffer.toString('base64') + '">';
        else if (media.type === 'video')
            data += `
    <video controls>
        <source type="video/${ext}" src="data:video/${ext};base64,${media.buffer.toString('base64')}">
    </video>`;
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
    HTML = minifier.minify(HTML, {
        removeComments: true,
        removeOptionalTags: true,
        minifyCSS: true,
        collapseBooleanAttributes: true,
        collapseWhitespace: true,
        decodeEntities: true
    });

    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}
