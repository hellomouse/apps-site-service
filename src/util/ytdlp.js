import YTDlpWrap_ from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';

const YTDlpWrap = YTDlpWrap_.default;

await YTDlpWrap.downloadFromGithub();
const ytDlpWrap = new YTDlpWrap();

/**
 * Downloads youtube video with subtitles, prefer at most 720p
 * @param {string} id Youtube video id
 * @param {string} dest Destination folder, video and subs go inside
 */
export async function downloadYoutube(id, dest) {
    let url = `https://www.youtube.com/watch?v=${id}`;
    await ytDlpWrap.execPromise([
        url,
        // '--download-archive', 'yt-dlp/downloaded.txt',
        '--no-post-overwrites', '--quiet',
        '--write-thumbnail', '--write-info-json',
        '-S', 'vcodec:h264',
        '--cookies', 'yt-dlp/yt-cookies.txt',
        '-f', 'bestvideo[height<=720]+bestaudio',
        '-o', path.join(dest, 'output.%(ext)s')
    ]);
    await ytDlpWrap.execPromise([
        url,
        '--no-post-overwrites', '--quiet',
        '--cookies', 'yt-dlp/yt-cookies.txt',
        '--sub-langs', 'all,-live_chat', '--write-subs',
        '--skip-download',
        '-o', path.join(dest, 'subs.%(ext)s')
    ]);
}

/**
 * Downloads bilibili, prefer at most 720p
 * @param {string} id Bilibili video id
 * @param {string} dest Destination folder, video goes inside
 */
export async function downloadBilibili(id, dest) {
    let url = `https://www.bilibili.com/video/${id}`;
    await ytDlpWrap.execPromise([
        url,
        // '--download-archive', 'yt-dlp/downloaded.txt',
        '--no-post-overwrites', '--quiet',
        '--write-thumbnail', '--write-info-json',
        '-S', 'vcodec:h264',
        '--cookies', 'yt-dlp/bilibili-cookies.txt',
        '-f', 'bestvideo[height<=720]+bestaudio',
        '-o', path.join(dest, 'output.%(ext)s')
    ]);
}

/**
 * Add video metadata to database. Also deletes the output info json
 * @param {string} jsonPath Path to the json (not including the file itself)
 * @param {string} videoId ID of the video, should have the output.info.json downloaded
 * @param {*} client DB client
 * @return {Array} Array of parameters passed to DB
 */
export async function addVideoMetaToDb(jsonPath, videoId, client) {
    let data = JSON.parse(fs.readFileSync(path.join(jsonPath, 'output.info.json')));
    let files = fs.readdirSync(jsonPath);

    let thumbnailFile = files.filter(f => ['webp', 'png', 'jpg', 'gif', 'jpeg', 'bmp', 'svg']
        .includes(f.split('.').at(-1).toLowerCase()) && f.split('.').length <= 2)[0] || '';
    let videoFile = files.filter(f =>
        ['mp4', 'mov', 'webm', 'wmv', 'avi', 'flv', 'mkv', 'mts', 'm4v', 'mpg', 'mpeg', 'ts', 'm2p', 'asf', '3gp']
            .includes(f.split('.').at(-1).toLowerCase()) && f.split('.').length <= 2)[0] || '';
    let subtitleFiles = files.filter(f => f.startsWith('subs.'));

    let timestamp = (data['timestamp'] || data['release_timestamp']);
    timestamp = timestamp ? new Date(timestamp * 1000) :
        new Date(+data['upload_date'].substring(0, 4), +data['upload_date'].substring(4, 6) - 1, +data['upload_date'].substring(6, 8));

    let params = [
        videoId,
        data['uploader'],
        data['uploader_id'] || 'Unknown id',
        data['uploader_url'] || '',
        timestamp,
        data['fulltitle'],
        data['duration_string'],
        data['description'] || 'No description provided',
        data['view_count'] || 0,
        data['comment_count'] || 0,
        data['like_count'] || 0,
        data['filesize_approx'],
        data['tags'] || [],
        thumbnailFile,
        videoFile,
        subtitleFiles
    ];

    await client.query(`INSERT INTO video_meta
            (id, uploader, uploader_id, uploader_url, upload_date, title, duration_string,
                description, view_count, comment_count, like_count, filesize, tags,
                thumbnail_file, video_file, subtitle_files)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO NOTHING;`, params);
    fs.unlinkSync(path.join(jsonPath, 'output.info.json'));
    return params;
}
