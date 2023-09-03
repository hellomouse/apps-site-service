import fs from 'fs';
import path from 'path';

/**
 * Creates a directory if it doesn't exist
 * @param {string} dir Directory, can be a file (file name removed)
 */
export function createDirIfNotExist(dir) {
    dir = path.dirname(dir);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
