/**
 * Throws if url is invalid or unsafe
 * @param {string} url Url
 * @throws Exception
 */
export function validateUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://'))
        throw new Error('URL is not allowed');
}
