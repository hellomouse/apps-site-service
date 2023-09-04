import fs from 'fs';
import path from 'path';
import minifier from 'html-minifier';
import fetch from 'node-fetch';
import https from 'https';

import { createDirIfNotExist } from '../../util/file.js';

/**
 * Is a url a valid newgrounds song url?
 * @param {string} url URL
 * @return {boolean} is the result newgrounds
 */
export async function isNewgrounds(url) {
    if (url.endsWith('/')) url = url.substring(0, url.length - 1);
    return /^https:\/\/www\.newgrounds\.com\/audio\/listen\/\d+$/g.test(url);
}

/**
 * Download a song from newgrounds
 * @param {string} url URL of newgrounds, ie https://www.newgrounds.com/audio/listen/717033
 * @param {string} dest Destination folder path to save sound and html file
 * @param {string} id Id to save file names as
 */
export async function downloadNewgrounds(url, dest, id) {
    createDirIfNotExist(path.join(dest, 'tmp.tmp'));

    const response = await fetch(url);
    const body = await response.text();

    let songUrl = body.match(/https:\\\/\\\/audio\.ngfiles\.com\\\/\d+\\\/.+?\.mp3/);
    let songComments = body.match(/id="author_comments"\s*>\s*<p>([\S\s]+?)<\/p>/);
    songComments = songComments ? songComments[1] : 'No comment provided';

    let songTitle = body.match(/<div class="pod-head" itemprop="itemReviewed">\s*<h2 .+?>([\s\S]+?)<\/h2>/);
    songTitle = songTitle ? songTitle[1] : 'No title found';

    if (!songUrl) throw new Error('Failed to find song url');
    songUrl = songUrl[0].replaceAll('\\/', '/');

    await https.get(songUrl, resp => resp.pipe(fs.createWriteStream(path.join(dest, id + '.mp3'))));

    let HTML = `
<!DOCTYPE HTML>
<html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Newgrounds Backup - ${songTitle}</title>
        <style>
body {
    background: black;
    font-family: Arial,
        Helvetica,
        sans-serif;
    font-size: 14px;
}
.container, h1 {
    max-width: 95%;
    box-sizing: border-box;
    margin: 0 auto;
    width: 600px;
}
.container {
    background-color: #0F0B0C;
    border: 1px solid #000;
    color: #c9bebe;
    padding: 30px;
    box-shadow: inset 0px 0px 0px 2px rgb(255 255 255 / 3%);
}
audio { width: 100%; }
a {
    color: #fda238;
    text-decoration: none;
}
h1 {
    background: linear-gradient(to bottom, #433f5a 0%, #2f2c3f 48%, #282635 53%, #1d1828 100%);
    border: 1px solid #000;
    color: white;
    padding: 10px;
    font-size: 1.25rem;
    margin-top: 40px;
    font-family:
        "Arial Narrow",
        sans-serif;
}
        </style>
    </head>
    <body>
        <h1>${songTitle}</h1>
        <div class="container">
            <audio controls>
                <source src="${id + '.mp3'}"  type= "audio/mp3"> </source>
            </audio>
            <p>${songComments}</p>
            <small>This is a Newgrounds song backup generated from Hellomouse Apps</small>
        </div>
    </body>
</html>`;
    HTML = minifier.minify(HTML, {
        removeComments: true,
        removeOptionalTags: true,
        minifyCSS: true,
        collapseBooleanAttributes: true,
        collapseWhitespace: true
    });

    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}
