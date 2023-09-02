import createSubscriber from 'pg-listen';
import pg from 'pg';
import { dbUser, dbPassword, dbIp, dbPort, dbName } from '../config.js';

const CHANNEL = 'hellomouse_apps_site_update'; // Should match NOTIFY on rust side
const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbIp}:${dbPort}/${dbName}`;

// Queue
const queue = [];
let queueRunning = false;
let queueAlreadyAdded = new Set();

// Commands
const COMMANDS = {
    'preview': async data => {
        console.log('Processing', data);
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

        // TODO: try catch
        await (COMMANDS[cmd] || (async () => {
            console.error(`Command ${cmd} does not exist`);
        }))(toProcess.data);

        queueAlreadyAdded.delete(toProcess.id);
        await client.query('DELETE FROM site.queue WHERE id = $1;', [toProcess.id]);
    }
    queueRunning = false;
}

/** Add from DB to the queue */
async function updateQueue() {
    const rows = (await client.query('SELECT * FROM site.queue ORDER BY created;')).rows;
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
    console.error('Fatal database connection error:', error);
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
    updateQueue();
}

connect();
