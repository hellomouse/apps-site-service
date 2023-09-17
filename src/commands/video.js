import { fileDir } from '../../config.js';
import { validateUrl } from '../util/url.js';
import { downloadBilibili, downloadYoutube, addVideoMetaToDb } from '../util/ytdlp.js';
import path from 'path';

/**
 * Get youtube id
 * @param {string} url URL of youtube video
 * @return {string} ID or '' if not found
 */
export function getYoutubeId(url) {
    let match = url.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
    return (match && match[1]) ? match[1] : '';
}

/**
 * Get bilibili id
 * @param {string} url URL of bilibili video
 * @return {string} ID or '' if not found
 */
export function getBilibiliId(url) {
    let match = url.match(/https?:\/\/www\.bilibili\.com\/video\/([A-Za-z0-9-_]+)\/?/);
    return (match && match[1]) ? match[1] : '';
}

/**
 * Command to export
 * @param {object} data Data from DB
 * @param {object} client DB Client
 * @return {string} VideoID result is stored at
 */
export async function commandVideo(data, client) {
    validateUrl(data.data);

    let videoId = '';
    let yId = getYoutubeId(data.data);

    if (yId) { // Youtube video
        videoId = `yt#${yId}`;
        let jsonPath = path.join(fileDir, 'videos', videoId);
        await downloadYoutube(yId, jsonPath);
        await addVideoMetaToDb(jsonPath, videoId, client);
        return videoId;
    }

    let bId = getBilibiliId(data.data);
    if (bId) { // Bilibili video
        videoId = `bilibili#${bId}`;
        let jsonPath = path.join(fileDir, 'videos', videoId);
        await downloadBilibili(bId, jsonPath);
        await addVideoMetaToDb(jsonPath, videoId, client);
        return videoId;
    }
    throw new Error('Could not find youtube or bilibili ID');
}
