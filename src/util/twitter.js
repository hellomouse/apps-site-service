import Axios from 'axios';

/**
 * Get twitter media data
 * @param {string} url A URL or an object with a URL property, and optionally a buffer and/or text property
 * @param {*} [options] An object with a buffer and/or text property
 * @return {Promise<*>}
 */
export default async function getTwitterMedia(url, options) {
    let input = {};

    if (typeof url === 'object') if (url.url) input = url;
    else return { found: false, error: 'No URL provided' };
    else if (typeof url === 'string') input.url = url;
    else return { found: false, error: 'Invalid first argument' };

    if (options) Object.keys(options).forEach(key => input[key] = options[key]);

    if (/\/\/twitter.com/.test(input.url)) {
        let apiURL = input.url.replace('//twitter.com', '//api.vxtwitter.com');

        let result = await Axios.get(apiURL).then(res => res.data).catch(err => {
            return { found: false, error: 'An issue occurred. Make sure the twitter link is valid.' };
        });
        if (!result.media_extended) return { found: false, error: 'No media found' };
        let output = {
            found: true,
            media: result.media_extended.map(x => ({ url: x.url, type: x.type })),
            date: result.date,
            likes: result.likes,
            replies: result.replies,
            retweets: result.retweets,
            authorName: result.user_name,
            authorUsername: result.user_screen_name
        };
        if (input.text) output.text = result.text;
        if (input.buffer)
            for (let media of output.media)
                media.buffer = await Axios.get(media.url, { responseType: 'arraybuffer' })
                    .then(res => Buffer.from(res.data, 'binary'))
                    .catch(err => {
                        console.error('Error getting buffer: ', err);
                        return undefined;
                    });

        return output;
    } return { found: false, error: `Invalid URL: ${input.url}` };
}
