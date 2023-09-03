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
