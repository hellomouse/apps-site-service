import createSubscriber from 'pg-listen';
import pg from 'pg';
import log from 'simple-node-logger';

import { dbUser, dbPassword, dbIp, dbPort, dbName } from '../config.js';
import { commandHtml } from './commands/html.js';
import { commandPdf } from './commands/pdf.js';
import { commandScreenshot } from './commands/screenshot.js';
import { commandPinPreview } from './commands/preview.js';
import { commandMedia } from './commands/special_download.js';
import { commandVideo } from './commands/video.js';
import { commandAddMusicToPlaylist, commandDownloadMusic } from './commands/music.js';

import { errorDoNothing, errorPdf, errorScreenshot, errorHtml } from './commands/errors.js';

const CHANNEL = 'hellomouse_apps_site_update'; // Should match NOTIFY on rust side
const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbIp}:${dbPort}/${dbName}`;
const logger = log.createSimpleLogger();

// Queue
let queueRunning = [false, false];
let queueAlreadyAdded = new Set();

// Commands
const COMMANDS = {
    'pin_preview': commandPinPreview,
    'pdf': commandPdf,
    'html': commandHtml,
    'screenshot': commandScreenshot,
    'media': commandMedia,
    'video_download': commandVideo,
    'music_add_urls_to_playlist': commandAddMusicToPlaylist,
    'music_download': commandDownloadMusic
};

const COMMAND_ERROR = {
    'pin_preview': errorDoNothing,
    'pdf': errorPdf,
    'html': errorHtml,
    'screenshot': errorScreenshot,
    'media': errorHtml,
    'video_download': errorDoNothing,
    'music_add_urls_to_playlist': errorDoNothing,
    'music_download': errorDoNothing
};

// Create clients
const subscriber = createSubscriber({ connectionString });
const client = new pg.Client({ connectionString });

/**
 * Queue process loop
 * @param {Array} queue Queue to process
 * @param {number} queueRunningIndex Index of task group in queueRunning
 */
async function processQueue(queue, queueRunningIndex) {
    if (queueRunning[queueRunningIndex]) return;
    queueRunning[queueRunningIndex] = true;
    while (queue.length > 0) {
        const toProcess = queue.shift();
        const cmd = toProcess.name;
        logger.info(`Processing command ${cmd} ${toProcess.data} from ${toProcess.requestor}`);

        await client.query('UPDATE site.status SET status = $1 WHERE id = $2;', ['processing', toProcess.id]);
        let errored = false;

        try {
            await (COMMANDS[cmd] || (async () => {
                logger.error(`Command ${cmd} does not exist`);
            }))(toProcess, client);
        } catch (e) {
            await (COMMAND_ERROR[cmd] || (async () => {
                logger.error(`Command error ${cmd} does not exist`);
            }))(toProcess, client);

            logger.warn(e);
            errored = true;
        }

        queueAlreadyAdded.delete(toProcess.id);
        await client.query('UPDATE site.status SET finished = $1, status = $2 WHERE id = $3;',
            [
                new Date(),
                !errored ? 'completed' : 'errored',
                toProcess.id
            ]
        );
    }
    queueRunning[queueRunningIndex] = false;
}

/**
 * Get queue
 * @param {boolean} preview only get preview tasks? if false only gets non-preview tasks
 * @return {Array} queue
 */
async function getQueue(preview) {
    const queue = [];
    const query = preview ?
        `SELECT * FROM site.status WHERE status = 'queued' AND name = 'pin_preview'  ORDER BY priority desc, created asc;` :
        `SELECT * FROM site.status WHERE status = 'queued' AND name != 'pin_preview' ORDER BY priority desc, created asc;`;
    const rows = (await client.query(query)).rows;
    if (!rows || rows.length === 0) return [];

    for (let row of rows)
        if (!queueAlreadyAdded.has(row.id)) {
            queueAlreadyAdded.add(row.id);
            queue.push(row);
        }
    return queue;
}

/** Add from DB to the queue */
async function updateQueue() {
    let queue1 = await getQueue(true);
    let queue2 = await getQueue(false);
    processQueue(queue1, 0);
    processQueue(queue2, 1);
}

/** Clear finished tasks older than 1 hour and "stuck in processing" tasks made 2 or more days ago */
async function clearOldFinishedTasks() {
    await client.query(`DELETE FROM site.status WHERE (status = 'processing') AND created < now() - interval '2 day';`);
    await client.query(`DELETE FROM site.status WHERE (status = 'errored' OR status = 'completed') AND finished < now() - interval '1 hour';`);
}

subscriber.notifications.on(CHANNEL, async () => {
    setTimeout(updateQueue, 500);
});

subscriber.events.on('error', error => {
    logger.error('Fatal database connection error:', error);
    process.exit(1);
});

process.on('exit', async () => {
    subscriber.close();
    await client.end();
});


/** Listen for db updates */
async function connect() {
    await client.connect();
    await subscriber.connect();
    await subscriber.listenTo(CHANNEL);

    logger.info('Connected to DB, listening...');

    // Create necessary tables
    await client.query(`CREATE TABLE IF NOT EXISTS video_meta (
            id text NOT NULL PRIMARY KEY,
            uploader TEXT NOT NULL,
            uploader_id TEXT NOT NULL,
            uploader_url TEXT NOT NULL,
            upload_date timestamptz NOT NULL,
            title TEXT NOT NULL,
            duration_string TEXT NOT NULL,
            description TEXT NOT NULL,
            view_count INTEGER NOT NULL,
            comment_count INTEGER NOT NULL,
            like_count INTEGER NOT NULL,
            filesize INTEGER NOT NULL,
            tags TEXT[] NOT NULL,
            thumbnail_file TEXT NOT NULL,
            video_file TEXT NOT NULL,
            subtitle_files TEXT[] NOT NULL
        );`);

    // Listen
    updateQueue();
    setInterval(clearOldFinishedTasks, 10 * 60 * 1000); // Clear old finished tasks every 10 min
}

connect();
