import fs from 'fs';
import path from 'path';
import DOMPurify from 'isomorphic-dompurify';

import { createDirIfNotExist } from '../../util/file.js';
import { escapeHtml, linkify, minifyHTML } from '../../util/url.js';
import { getBilibiliId, commandVideo } from '../video.js';

/**
 * Is a url a valid bilibili url?
 * @param {string} url URL
 * @return {boolean} is the result bilibili
 */
export function isBilibili(url) {
    if (url.endsWith('/')) url = url.substring(0, url.length - 1);
    url = url.toLowerCase();
    return (url.startsWith('https://www.bilibili.com/video/') ||
        url.startsWith('https://bilibili.com/video/')) && getBilibiliId(url);
}

/**
 * Download a bilibili video
 * @param {string} url URL of bilibili video
 * @param {string} dest Destination folder path to save html file
 * @param {string} id Id to save file names as
 * @param {*} client DB client
 */
export async function downloadBilibili(url, dest, id, client) {
    createDirIfNotExist(path.join(dest, 'tmp.tmp'));

    let videoId = `bilibili%23${getBilibiliId(url)}`;
    let meta = await commandVideo({ data: url }, client);
    let fileName = meta.at(-2);

    let HTML = `
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Bilibili Backup</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
        <style>
body {
    font-size: 15px;
    font-family: Roboto, Arial, sans-serif;
    background-color: white;
    color: rgb(24, 25, 28);
    word-break: break-word;
    margin: 0;
}
video {
    background: black;
    height: 446px;
    width: 100%;
}
.container {
    margin: 60px auto;
    max-width: 700px;
}
.info, .channel {
    display: inline-block;
    margin-bottom: 20px;
}
h1 {
    font-weight: 500;
    font-size: 20px;
    line-height: 28px;
    text-size-adjust: 100%;
    margin-bottom: 4px;
}
.info,.other {
    color: rgb(148, 153, 160);
    font-size: 13px;
}
.other {
    font-size: 13px;
    max-width: 600px;
}
hr {
    border: none;
    height: 0px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.channel a {
    text-decoration: none;
    color: rgb(251, 114, 153);
    font-size: 15px;
    margin-left: 30px;
}
.desc {
    margin: 20px 0;
    max-width: 600px;
}
.desc a {
    color: rgb(0, 138, 197);
    text-decoration: none;
}
</style>
    </head>
    <body>
        ${DOMPurify.sanitize(`<div class="container">
            <h1>${meta[5]}</h1>

            <div class="info">${meta[8].toLocaleString()} views / ${meta[4].toLocaleString('en-US')} / ${meta[10].toLocaleString('en-US')} likes</div>

            <div class="channel"><a href="${meta[3]}">${meta[1]}</a></div>

            <video controls loading="lazy">
                <source src="/files/videos/${videoId}/${fileName}" type="video/${fileName.split('.').at(-1)}" />
                ${meta.at(-1).map((sub, i) => `<track
    label="${sub.split('.')[1].toUpperCase()}"
    kind="subtitles"
    srclang="${sub.split('.')[1]}"
    src="/files/videos/${videoId}/${sub}"
    ${i === 0 ? 'default' : ''} />`).join('\n')}
            </video>

            <div class="desc">${linkify(escapeHtml(meta[7])).replaceAll('\n', '<br>')}</div>
            <hr>

            <div class="other">Video ID: ${meta[0]} / Uploader ID: ${meta[1]}<br>
            Comments: ${meta[9].toLocaleString('en-US')} / Duration: ${meta[6]}<br>
            File size: ~${meta[11].toLocaleString('en-US')} bytes<br>
            Tags: ${meta[12].join(', ') || 'None'}</div>
        </div>`)}
    </body>
</html>`;
    HTML = minifyHTML(HTML);
    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}
