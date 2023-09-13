import sharp from 'sharp';
import fs from 'fs';
import minifier from 'html-minifier';
import { escape, unescape } from 'html-escaper';
import { createDirIfNotExist } from './file.js';

/**
 * Throws if url is invalid or unsafe
 * @param {string} url Url
 * @throws Exception
 */
export function validateUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://'))
        throw new Error('URL is not allowed');
}

/**
 * Download an image and resize to size (webp)
 * @param {string} url URL to image
 * @param {object} size { width, height }
 * @param {string} dest Destination for image
 */
export async function downloadImage(url, size, dest) {
    if (url.startsWith('//'))
        url = 'https:' + url;

    const response = await fetch(url, {
        method: 'GET',
        size: 10e6 // 10 MB
    }).catch(e => {
        throw e;
    });

    const imageBuff = await sharp(Buffer.from(await response.arrayBuffer()))
        .resize(size.width, size.height, { fit: 'cover' })
        .webp()
        .toBuffer();

    createDirIfNotExist(dest);
    await fs.writeFile(dest, imageBuff, () => {});
}

/**
 * Returns a hash code from a string, should be same as
 * the client's hash function
 * @param  {string} str The string to hash.
 * @return {string}     Hash of url
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
export function urlHash(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    let u = str.split('://')[1];
    return u.replace(/[^A-Za-z0-9_-]/g, '').substring(0, 210) + hash;
}

/**
 * Escape html
 * @param {string} text Text to escape
 * @return {string} Text with escaped HTML
 */
export function escapeHtml(text) {
    return escape(text);
}


/**
 * Unescape html
 * @param {string} text Text to unescape
 * @return {string} Text with unescaped HTML
 */
export function unescapeHtml(text) {
    return unescape(text);
}


/**
 * Convert urls in text to <a> tags
 * @param {string} text Text
 * @return {string} Converted
 */
export function linkify(text) {
    const exp = /(\b((https?|ftp|file):\/\/|(www))[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|]*)/ig;
    return text.replace(exp, '<a href=\'$1\'>$1</a>');
}

/**
 * Minify html
 * @param {string} html HTML
 * @return {string} Minified html
 */
export function minifyHTML(html) {
    return minifier.minify(html, {
        removeComments: true,
        removeOptionalTags: true,
        minifyCSS: true,
        collapseBooleanAttributes: true,
        collapseWhitespace: true,
        decodeEntities: true
    });
}
