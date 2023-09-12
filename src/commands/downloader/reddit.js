import fs from 'fs';
import path from 'path';
import https from 'https';
import fetch from 'node-fetch';
import DOMPurify from 'isomorphic-dompurify';

import { createDirIfNotExist } from '../../util/file.js';
import { minifyHTML, unescapeHtml } from '../../util/url.js';

const HEAD = `<meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Reddit Backup</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">
        <style>
body {
    background: black;
}
.container {
    background: #1a1a1b;
    border: 1px solid #343536;
    max-width: 95%;
    box-sizing: border-box;
    padding: 20px;
    width: 600px;
    color: #D7DADC;
    margin: 0 auto;
    font-size: 13px;
    font-family: 'IBM Plex Sans', sans-serif;
}
.spoiler { position: relative; }
.spoiler::after {
    content: 'SPOILER';
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-color: black;
    text-align: center;
    padding-top: 50%;
    cursor: pointer;
    font-size: 2rem;
    box-sizing: border-box;
}
.top { font-size: 0.75rem; margin: 0; margin-bottom: 4px; }
.rest { opacity: 0.7; }
h1 { margin: 0; font-size: 1.15rem; }
a { color: #4fbcff; }
code, pre { background: #272729; color: #5291f8; }
.stats { opacity: 0.7; font-size: 0.75rem; }
video { max-height: 400px; }
img { max-height: 700px; }
video, img {
    display: block;
    margin: 10px auto;
    background: black;
    width: 100%;
    object-fit: contain;
}
iframe {
    display: block;
    margin: 10px auto;
}
.badges { margin: 0; margin-top: 5px; }
.badges > span { border: 1px solid #343536; opacity: 0.7; padding: 2px 4px; margin-right: 2px; }
.badges > span.nsfw { color:red; border-color: red; opacity: 1; }
        </style>`;

/**
 * Is a url a valid reddit post url?
 * @param {string} url URL
 * @return {boolean} is the result reddit
 */
export function isRedditPost(url) {
    return /^https:\/\/www\.reddit\.com\/r\/.+?\/comments\/.+?\/.+?\/$/g.test(url);
}

/**
 * Is a url a valid reddit comment url?
 * @param {string} url URL
 * @return {boolean} is the result reddit
 */
export function isRedditComment(url) {
    return /^https:\/\/www\.reddit\.com\/r\/.+?\/comments\/.+?\/comment\/.+?\/.+?$/g.test(url);
}

/**
 * Download a post from reddit
 * @param {string} url URL of reddit post
 * @param {string} dest Destination folder path to save sound and html file
 * @param {string} id Id to save file names as
 */
export async function downloadRedditPost(url, dest, id) {
    if (url.endsWith('/'))
        url = url.substring(0, url.length - 1);
    const response = await fetch('https://api.reddit.com/api/info/?id=t3_' + url.split('/').at(-2) + '&raw_json=1');
    let data = await response.json();
    data = data.data.children[0].data;

    createDirIfNotExist(path.join(dest, 'tmp.tmp'));

    let media = '';
    if (data.is_video) {
        let vidUrl = data.media.reddit_video.fallback_url || data.media.reddit_video.scrubber_media_url;
        let ext = vidUrl.split('?')[0].split('.').at(-1);
        let filename = `${id}-vid.${ext}`;
        await https.get(vidUrl, resp => resp.pipe(fs.createWriteStream(path.join(dest, filename))));
        media = `<video controls width="${data.media.reddit_video.width}" height="${data.media.reddit_video.height}">
            <source type="video/${ext}" src="${filename}"></video>`;
    } else if (data.gallery_data) {
        let i = 0;
        for (let item of data.gallery_data.items) {
            let ext = data.media_metadata[item.media_id].m.split('/').at(-1);
            let iurl = unescapeHtml(data.media_metadata[item.media_id].s.u);
            let filename = `${id}-img${i}.${ext}`;

            await https.get(iurl, resp => resp.pipe(fs.createWriteStream(path.join(dest, filename))));
            media += `<img src="${filename}" loading="lazy">`;
            if (item.caption)
                media += `<p>${item.caption}</p>`;
            i += 1;
        }
    } else if (data.media && data.media.oembed)
        media = data.media.oembed.html;
    else if (data.url)
        try {
            let ext = data.url.split('?')[0].split('.').at(-1);
            if (ext.includes('/') || ext.includes('.'))
                throw new Error('Invalid file to download');
            if (!['jpg', 'jpeg', 'jpeg:large', 'jpg:large', 'png', 'gif', 'bmp', 'webp'].includes(ext))
                throw new Error('Not an image');

            let filename = `${id}-img.${ext}`;
            let resp = await https.get(data.url);
            await resp.pipe(fs.createWriteStream(path.join(dest, filename)));
            media = `<img src="${filename}" loading="lazy">`;
        } catch (e) {
            // Ignore in case url is invalid
        }

    let badges = [];
    if (data.edited) badges.push('EDITED');
    if (data.pinned) badges.push('PINNED');
    if (data.over_18) badges.push('NSFW');
    if (data.locked) badges.push('LOCKED');

    let HTML = `
<!DOCTYPE HTML>
<html>
    <head>
        ${HEAD}
    </head>
    <body>
        <div class="container">
            <p class="top"><b>${data.subreddit_name_prefixed}</b> <span class="rest">Posted by u/${data.author || '[deleted]'} on ${(new Date(data.created * 1000)).toLocaleString('en-US')}</span></p>
            <h1>${data.title}</h1>
            ${badges.length ? `<p class="badges">
                ${badges.map(x => `<span ${x === 'NSFW' ? 'class="nsfw"' : ''}>${x}</span>`).join('')}</p>` : ''}

            <div id="m" class="${data.spoiler ? 'spoiler' : ''}">
            ${media}
            ${data.selftext_html || ''}
            </div>

            <div class="stats">
                +${data.ups} / -${data.downs} / Original post can be found <a href="${data.permalink}">here</a> /
                This Reddit post was archived by Hellomouse Apps
            </div>
        </div>

        ${data.spoiler ? `<script>
            let m = document.getElementById('m');
            m.addEventListener('click', () => m.classList.remove('spoiler'))
        </script>` : ''}
    </body>
</html>`;
    HTML = DOMPurify.sanitize(HTML, { WHOLE_DOCUMENT: true });
    HTML = minifyHTML(HTML);
    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}

/**
 * Download a comment from reddit
 * @param {string} url URL of reddit comment
 * @param {string} dest Destination folder path to save sound and html file
 * @param {string} id Id to save file names as
 */
export async function downloadRedditComment(url, dest, id) {
    if (url.endsWith('/'))
        url = url.substring(0, url.length - 1);
    const response = await fetch('https://api.reddit.com/api/info/?id=t1_' + url.split('/').at(-2) + '&raw_json=1');
    let data = await response.json();
    data = data.data.children[0].data;

    createDirIfNotExist(path.join(dest, 'tmp.tmp'));

    let HTML = `
<!DOCTYPE HTML>
<html>
    <head>${HEAD}</head>
    <body>
        <div class="container">
            <p class="top"><b>${data.subreddit_name_prefixed}</b> <span class="rest">Comment by u/${data.author || '[deleted]'} on ${(new Date(data.created * 1000)).toLocaleString('en-US')}</span></p>
            ${data.body_html || ''}
            <div class="stats">
                +${data.ups} / -${data.downs} / Original comment can be found <a href="${data.permalink}">here</a> /
                This Reddit comment was archived by Hellomouse Apps
            </div>
        </div>
    </body>
</html>`;
    HTML = DOMPurify.sanitize(HTML, { WHOLE_DOCUMENT: true });
    HTML = minifyHTML(HTML);
    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}
