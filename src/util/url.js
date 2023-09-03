import sharp from 'sharp';
import fs from 'fs';
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
 * @param  {String} str The string to hash.
 * @return {String}     Hash of url
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
