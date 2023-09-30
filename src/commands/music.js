
import { isNewgrounds, downloadNewgrounds } from './downloader/newgrounds.js';
import { isSoundCloud, downloadSoundCloud } from './downloader/soundcloud.js';
import { isYoutube, downloadYoutube } from './downloader/youtube.js';
import { isBilibili, downloadBilibili } from './downloader/bilibili.js';

import { getYoutubeId, getBilibiliId } from './video.js';

import { v4 as uuidv4 } from 'uuid';

/**
 * Convert song to stored ID
 * @param {string} url URL of song
 * @return {string} ID or 'unknown'
 */
export function songUrlToId(url) {
    if (url.endsWith('/'))
        url = url.substring(0, url.length - 1);
    if (isYoutube(url))
        return `yt#${getYoutubeId(url)}`;
    if (isBilibili(url))
        return `bilibili#${getBilibiliId(url)}`;
    if (isSoundCloud(url))
        return `soundcloud#${url.split('/').at(-1)}`;
    if (isNewgrounds(url))
        return `newgrounds#${url.split('/').at(-1)}`;
    return `unknown`;
}

/**
 * Command to export
 * @param {object} data Data from DB
 * @param {object} client DB Client
 */
export async function commandAddMusicToPlaylist(data, client) {
    let tmp = data.data.split(',');
    let playlistId = tmp[0];
    let songUrls = tmp.slice(1).filter(url =>
        isNewgrounds(url) || isBilibili(url) || isYoutube(url) || isSoundCloud(url));
    let songIds = songUrls.map(songUrlToId);

    // Insert songs into playlist
    await client.query('INSERT into music.playlist_songs VALUES($1, UNNEST($2::text[]), $3, $4) ON CONFLICT DO NOTHING;',
        [playlistId, songIds, data.requestor, new Date()]);

    // Queue song downloads
    let uuids = songUrls.map(_ => uuidv4());
    await client.query('INSERT INTO site.status VALUES(unnest($1::uuid[]), $2, $3, $4, unnest($5::text[]), $6, $7, $8);',
        [uuids, new Date(), new Date(), 'music_download', songUrls, data.requestor, -1, 'queued']
    );
}

/**
 * Command to export
 * @param {object} data Data from DB
 * @param {object} client DB Client
 */
export async function commandDownloadMusic(data, client) {
    // TODO
}
