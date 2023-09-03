import createSubscriber from 'pg-listen';
import pg from 'pg';
import log from 'simple-node-logger';

import { dbUser, dbPassword, dbIp, dbPort, dbName } from '../config.js';
import { commandHtml } from './commands/html.js';
import { commandPdf } from './commands/pdf.js';
import { commandPinPreview } from './commands/preview.js';

const CHANNEL = 'hellomouse_apps_site_update'; // Should match NOTIFY on rust side
const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbIp}:${dbPort}/${dbName}`;
const logger = log.createSimpleLogger();

// Queue
const queue = [];
let queueRunning = false;
let queueAlreadyAdded = new Set();

// Commands
const COMMANDS = {
    'pin_preview': commandPinPreview,
    'pdf': commandPdf,
    'html': commandHtml,
    'special': async data => {

    }
};

// Create clients
const subscriber = createSubscriber({ connectionString });
const client = new pg.Client({ connectionString });

/** Queue process loop */
async function processQueue() {
    if (queueRunning) return;
    queueRunning = true;
    while (queue.length > 0) {
        const toProcess = queue.shift();
        const cmd = toProcess.name;
        logger.info(`Processing command ${cmd} ${toProcess.data} from ${toProcess.requestor}`);

        try {
            await (COMMANDS[cmd] || (async () => {
                logger.error(`Command ${cmd} does not exist`);
            }))(toProcess, client);
        } catch (e) {
            logger.warn(e);
        }

        queueAlreadyAdded.delete(toProcess.id);
        await client.query('DELETE FROM site.queue WHERE id = $1;', [toProcess.id]);
    }
    queueRunning = false;
}

/** Add from DB to the queue */
async function updateQueue() {
    const rows = (await client.query(`SELECT * FROM site.queue ORDER BY priority desc, created asc;`)).rows;
    if (!rows || rows.length === 0) return;

    for (let row of rows) // TODO: don't duplicate
        if (!queueAlreadyAdded.has(row.id)) {
            queueAlreadyAdded.add(row.id);
            queue.push(row);
        }
    processQueue();
}

subscriber.notifications.on(CHANNEL, async () => {
    updateQueue();
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
    updateQueue();
}

connect();
