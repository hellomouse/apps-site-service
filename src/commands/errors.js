import path from 'path';
import fs from 'fs';
import { createDirIfNotExist } from '../util/file.js';
import { fileDir } from '../../config.js';

/**
 * Make destination
 * @param {*} data Data (toProcess)
 * @param {string} ext Extension
 * @return {string} dest
 */
function makeDest(data, ext) {
    let dest = path.join(fileDir, 'site_downloads', data.id + '.' + ext);
    createDirIfNotExist(dest);
    return dest;
}

/**
 * Do nothing on error
 * @param {*} toProcess To process
 * @param {*} client DB client
 */
export async function errorDoNothing(toProcess, client) {}

/**
 * Create an error PDF
 * @param {*} toProcess To process
 * @param {*} client DB client
 */
export async function errorPdf(toProcess, client) {
    let dest = makeDest(toProcess, 'pdf');
    await fs.copyFile('./src/commands/error_files/error.pdf', dest, err => {
        if (err) throw err;
    });
}

/**
 * Create an error screenshot at output
 * @param {*} toProcess To process
 * @param {*} client DB client
 */
export async function errorScreenshot(toProcess, client) {
    let dest = makeDest(toProcess, 'webp');
    await fs.copyFile('./src/commands/error_files/error.webp', dest, err => {
        if (err) throw err;
    });
}

/**
 * Create an error HTML file at output
 * @param {*} toProcess To process
 * @param {*} client DB client
 */
export async function errorHtml(toProcess, client) {
    let dest = makeDest(toProcess, 'html');
    await fs.copyFile('./src/commands/error_files/error.html', dest, err => {
        if (err) throw err;
    });
}
