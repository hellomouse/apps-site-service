import ogs from 'open-graph-scraper';

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36';

/**
 * Save a webpage as a HTML
 * @param {string} url Url
 * @return {object} Preview data
 */
export async function downloadPreview(url) {
    const options = {
        url,
        fetchOptions: {
            headers: {
                // Twitter has user agent rules for bots
                'user-agent': url.split('//')[1].startsWith('twitter.com') ?
                    'Twitterbot/1.1' : userAgent
            }
        }
    };

    const data = await ogs(options);
    if (!data.error) {
        let result = data.result;
        return {
            title: result.ogTitle || result.ogSiteName,
            desc: result.ogDescription || 'No description provided',
            name: result.ogSiteName,
            image: result.ogImage ? result.ogImage[0]?.url : ''
        };
    }
    return { error: true };
}
