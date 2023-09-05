import SoundCloud from 'soundcloud-scraper';
import fs from 'fs';
import path from 'path';
import https from 'https';

import { minifyHTML } from '../../util/url.js';
import { createDirIfNotExist } from '../../util/file.js';

/**
 * Is a url a valid soundcloud song url?
 * @param {string} url URL
 * @return {boolean} is the result sound cloud
 */
export function isSoundCloud(url) {
    if (url.endsWith('/')) url = url.substring(0, url.length - 1);
    return /^https:\/\/soundcloud.com\/[^/]+\/([^/]+)$/g.test(url);
}

/**
 * Download a song from soundcloud
 * @param {string} url URL of sound cloud, ie 'https://soundcloud.com/dogesounds/alan-walker-feat-k-391-ignite'
 * @param {string} dest Destination folder path to save sound and html file
 * @param {string} id Id to save file names as
 */
export async function downloadSoundCloud(url, dest, id) {
    const client = new SoundCloud.Client();
    createDirIfNotExist(path.join(dest, 'tmp.tmp'));

    const song = await client.getSongInfo(url);
    const stream = await song.downloadProgressive();
    await stream.pipe(fs.createWriteStream(path.join(dest, id + '.mp3')));

    let imgSrc = new Promise((resolve, reject) => https.get(song.thumbnail, resp => {
        let data = [];
        resp.on('data', chunk => data.push(Buffer.from(chunk, 'binary')));
        resp.on('end', () => resolve(
            'data:' + resp.headers['content-type'] + ';base64,' + Buffer.concat(data).toString('base64')
        ));
    }));
    imgSrc = await imgSrc;

    let HTML = `
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SoundCloud Backup - ${song.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Overpass:wght@300&display=swap" rel="stylesheet">
        <style>
body {
    background: #eee;
    font-family: Overpass,
        Lucida Grande,
        Lucida Sans Unicode,
        Lucida Sans,
        Garuda,
        Verdana,
        Tahoma,
        sans-serif;
    font-size: 0.9rem;
}
.container,.container-dark {
    width: 600px;
    box-sizing: border-box;
    max-width: 95%;
    margin: 0 auto;
    padding: 10px 30px;
}
.container { background-color: white; }
.container-dark { background: linear-gradient(135deg, rgb(129, 126, 121) 0%, rgb(40, 40, 42) 100%); }
audio {
    width: 100%;
    margin-bottom: 10px;
}
.thumbnail {
    text-align: center;
    margin-bottom: 10px;
}
.thumbnail > img {
    max-width: 300px;
}
.title, .composer {
    background-color: hsl(0, 0%, 7%);
    margin: 0;
    padding: 5px;
    display: inline-block;
}
.title {
    font-size: 2rem;
    margin-bottom: 2px;
    color: #fff;
}
.composer,
.composer>a {
    font-size: 1rem;
    margin-bottom: 15px;
    color: #ddd;
    text-decoration: none !important;
}
.comment {
    padding: 5px 10px;
    border-bottom: 1px solid #ddd;
}
.comment-info {
    font-size: 0.85rem;
    opacity: 0.8;
}
.comment-info > a {
    text-decoration: none !important;
    color: black;
}
.bar {
    background-color: #f3f3f3;
    padding: 12px;
    color: #333;
}
h3 {
    margin-bottom: 5px;
    margin-top: 15px;
}
</style>
    </head>
    <body>
        <div class="container-dark">
            <span class="title">${song.title}</span><br>
            <span class="composer"><a href="${song.author.url}">${song.author.name} (@${song.author.username})</a></span><br>

            <div class="thumbnail">
                <img src="${imgSrc}" />
            </div>
            <audio controls>
                <source src="${id + '.mp3'}"  type= "audio/mp3"> </source>
            </audio>
        </div>
        <div class="container">
            <div class="bar">
                <a href="${song.url}">ID ${song.id}</a> /
                Genre: ${song.genre} /
                Published ${song.publishedAt.toLocaleDateString('en-us')}
                <br>
                ▶ ${song.playCount} / 🗨 ${song.commentsCount} / ${song.likes} Likes
            </div>

            <p>${song.description.replaceAll('\n', '<br>')}</p>

            <h3>Comments</h3>
            ${song.comments.length === 0 ? 'No comments' : ''}
            ${
    song.comments.length === 0 ? '' : song.comments.map(c => {
        return `
        <div class="comment">
            <div class="comment-info"><a href="${c.author.url}">${c.author.name}</a> / ${c.createdAt.toLocaleDateString('en-us')}</div>
            ${c.text.replaceAll('\n', '<br>')}
        </div>
        `;
    }).join('\n')
}
            <br><br>
            <small>This is a SoundCloud archive generated by Hellomouse Apps</small>
            <br><br>
        </div>
    </body>
</html>`;
    HTML = minifyHTML(HTML);

    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}
