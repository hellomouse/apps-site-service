import fs from 'fs';
import path from 'path';
import DOMPurify from 'isomorphic-dompurify';

import { createDirIfNotExist } from '../../util/file.js';
import { escapeHtml, linkify, minifyHTML } from '../../util/url.js';
import { getYoutubeId, commandVideo } from '../video.js';

/**
 * Is a url a valid youtube url?
 * @param {string} url URL
 * @return {boolean} is the result youtube
 */
export function isYoutube(url) {
    if (url.endsWith('/')) url = url.substring(0, url.length - 1);
    url = url.toLowerCase();
    return (url.startsWith('https://www.youtube.com/watch?v=') ||
        url.startsWith('https://youtube.com/watch?v=') ||
        url.startsWith('https://youtu.be/') ||
        url.startsWith('https://www.youtu.be/')) && getYoutubeId(url);
}

/**
 * Download a youtube video
 * @param {string} url URL of youtube video
 * @param {string} dest Destination folder path to save html file
 * @param {string} id Id to save file names as
 * @param {*} client DB client
 */
export async function downloadYoutube(url, dest, id, client) {
    createDirIfNotExist(path.join(dest, 'tmp.tmp'));

    let videoId = `yt%23${getYoutubeId(url)}`;
    let meta = await commandVideo({ data: url }, client);
    let fileName = meta.at(-2);

    let HTML = `
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Youtube Backup</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
        <style>
body {
    font-size: 14px;
    font-family: Roboto, Arial, sans-serif;
    background-color: #0f0f0f;
    color: rgb(241, 241, 241);
    word-break: break-word;
    margin: 0 0 40px 0;
}
video {
    background: black;
    height: 524px;
    width: 100%;
}
.text {
    margin: 0 10%;
}
h1 {
    font-weight: 400;
    font-size: 18px;
    line-height 26px;
    text-size-adjust 100%;
    margin-bottom: 4px;
}
.info,.other {
    color: rgb(170, 170, 170);
    line-height: 20px;
}
.other {
    font-size: 12px;
    max-width: 600px;
}
hr {
    border: none;
    height: 0px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.channel a {
    text-decoration: none;
    color: rgb(241, 241, 241);
}
.desc {
    margin: 20px 0 20px 20px;
    max-width: 600px;
}
.desc a {
    color: rgb(62, 166, 255);
    text-decoration: none;
}
        </style>
    </head>
    <body>
        ${DOMPurify.sanitize(`<div class="container">
            <video controls loading="lazy">
                <source src="/files/videos/${videoId}/${fileName}" type="video/${fileName.split('.').at(-1)}" />
                ${meta.at(-1).map((sub, i) => `<track
    label="${sub.split('.')[1].toUpperCase()}"
    kind="subtitles"
    srclang="${sub.split('.')[1]}"
    src="/files/videos/${videoId}/${sub}"
    ${i === 0 ? 'default' : ''} />`).join('\n')}
            </video>

            <div class="text">
                <h1>${meta[5]}</h1>

                <div class="info">${meta[8].toLocaleString()} views / ${meta[4].toLocaleString('en-US')} / ${meta[10].toLocaleString('en-US') } likes</div>

                <hr>

                <div class="channel"><a href="${meta[3]}">${meta[1]}</a></div>

                <div class="desc">${linkify(escapeHtml(meta[7])).replaceAll('\n', '<br>')}</div>

                <div class="other">Video ID: ${meta[0]} / Uploader ID: ${meta[1]}<br>
                Comments: ${meta[9].toLocaleString('en-US') } / Duration: ${meta[6]}<br>
                File size: ~${meta[11].toLocaleString('en-US') } bytes<br>
                Tags: ${meta[12].join(', ') || 'None'}</div>
            </div>
        </div>`)}
    </body>
</html>`;
    HTML = minifyHTML(HTML);
    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}
