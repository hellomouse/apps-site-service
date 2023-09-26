import { waitTillHTMLRendered, getBrowserAndPage } from '../../node_save/puppeteer_util.js';
import fs from 'fs';
import path from 'path';
import DOMPurify from 'isomorphic-dompurify';

import { minifyHTML } from '../../util/url.js';
import { createDirIfNotExist } from '../../util/file.js';

/**
 * Is a url a valid pixiv url?
 * @param {string} url URL
 * @return {boolean} is the result pixiv
 */
export function isPixiv(url) {
    if (url.endsWith('/')) url = url.substring(0, url.length - 1);
    return /^https:\/\/(www\.)?pixiv\.net\/[a-z]+\/artworks\/\d+(#\d*)?$/g.test(url);
}

/**
 * Download images from pixiv
 * @param {string} url URL of pixiv
 * @param {string} dest Destination folder path to save sound and html file
 * @param {string} id Id to save file names as
 */
export async function downloadPixiv(url, dest, id) {
    url = url.split('#')[0];
    const { browser, page } = await getBrowserAndPage();
    page.setExtraHTTPHeaders({ referer: 'https://www.pixiv.net' });

    await page.setRequestInterception(true);
    page.on('request', req => {
        if (req.resourceType() === 'font') req.abort();
        else req.continue();
    });

    if (fs.existsSync('secret/pixiv-cookies.txt'))
        try {
            let data = fs.readFileSync('secret/pixiv-cookies.txt');
            await page.setCookie(...JSON.parse(data));
        } catch (e) {
            console.error(e);
        }

    await page.goto(url, { timeout: 40000, waitUntil: ['networkidle0'] });
    await waitTillHTMLRendered(page);

    let result = await page.evaluate(async () => {
        let expandDescBtn = [...document.getElementsByTagName('button')]
            .filter(b => b.innerText.toLowerCase().trim() === 'continue reading')[0];
        if (expandDescBtn) {
            expandDescBtn.click();
            await new Promise(r => setTimeout(r, 100));
        }

        let expandBtn = [...document.getElementsByTagName('button')]
            .filter(b => ['reading works', 'show all'].includes(b.innerText.toLowerCase().trim()))[0];
        if (expandBtn) { // Show all images
            expandBtn.click();
            await new Promise(r => setTimeout(r, 10000));
        }

        // Scroll all images into view to replace lazy loaders
        let imgs = [...document.getElementsByClassName('gtm-expand-full-size-illust')];
        while (!imgs.every(a => a && (a.href || a.src || a.getElementsByTagName('img')[0]))) {
            for (let img of imgs) {
                img.scrollIntoView();
                await new Promise(r => setTimeout(r, 200));
            }
            imgs = [...document.getElementsByClassName('gtm-expand-full-size-illust')];
        }

        let imgSrcs = imgs.map(a => a.href || a.src || a.getElementsByTagName('img')[0].src);
        let artist = document.getElementsByClassName('sc-10gpz4q-6')[0];
        let desc = document.getElementsByClassName('sc-1u8nu73-5')[0];
        let tags = [...document.getElementsByClassName('sc-1u8nu73-4')][0];
        let title = document.getElementsByClassName('sc-1u8nu73-3')[0];
        return {
            src: imgSrcs,
            title: title ? title.innerText : 'Unknown Title',
            desc: desc ? desc.innerText : '',
            tags: tags ? [...tags.getElementsByTagName('li')].map(x => '#' + x.innerText).join(' ') : '',
            artist: artist.innerText,
            artistUrl: artist.href
        };
    });

    let images = [];
    let i = 0;

    for (let src of result.src) {
        let source = await page.goto(src);
        let imageName = `${id}-${i}.${src.split('.').at(-1)}`;

        images.push(imageName);
        fs.writeFile(path.join(dest, imageName), await source.buffer(), err => {
            if (err) return console.log(err);
        });
        i++;
    }
    await browser.close();

    createDirIfNotExist(path.join(dest, 'tmp.tmp'));

    let HTML = `
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pixiv Backup</title>
        <style>
body {
    backgrond: rgba(0, 0, 0, 0.02);
}
.container {
    max-width: 95%;
    width: 704px;
    margin: 0 auto;
    padding-bottom: 120px;
    font-size: 14px;
}

img {
    max-width: 704px;
    max-height: 739.2px;
    display: block;
    margin: 5px auto;
}
h1 {
    margin-top: 20px;
    font-size: 20px; 
    line-height: 24px;
}
p {
    opacity: 0.52;
}
.tags {
    margin-top: 20px;
    color: rgb(61, 118, 153);
}
.artist {
    margin-top: 20px;
}
.artist a {
    text-decoration: none;
    font-weight: bold;
    color: black;
}
        </style>
    </head>
    <body>
        <div class="container">
            ${DOMPurify.sanitize(`
            ${images.map(src => `<img src="${src}" alt="Pixiv art">`)}

            <h1>${result.title}</h1>
            <p>${result.desc.replaceAll('\n', '<br>')}</p>

            <div class="tags">${result.tags}</div>

            <div class="artist"><a href="${result.artistUrl}">${result.artist}</a></div>
            `)}
        </div>
    </body>
</html>`;
    HTML = minifyHTML(HTML);
    fs.writeFileSync(path.join(dest, id + '.html'), HTML);
}
