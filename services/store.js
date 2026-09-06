const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORIES_FILE = path.join(DATA_DIR, 'stories.json');
const JOBS_FILE = path.join(DATA_DIR, 'pending_jobs.json');

if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.error('Error creating data directory:', e);
    }
}

let storiesCache = {};
let pendingJobsCache = {};

function safeLoad(filePath, defaultVal = {}) {
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.warn(`Could not read ${filePath}, initializing new cache:`, err.message);
    }
    return defaultVal;
}

function safeWrite(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error(`Failed to persist data to ${filePath}:`, err.message);
    }
}

storiesCache = safeLoad(STORIES_FILE, {});
pendingJobsCache = safeLoad(JOBS_FILE, {});

function savePendingJob(jobId, jobData) {
    pendingJobsCache[jobId] = {
        ...jobData,
        createdAt: new Date().toISOString()
    };
    safeWrite(JOBS_FILE, pendingJobsCache);
    return pendingJobsCache[jobId];
}

function getPendingJob(jobId) {
    return pendingJobsCache[jobId] || null;
}

function deletePendingJob(jobId) {
    if (pendingJobsCache[jobId]) {
        delete pendingJobsCache[jobId];
        safeWrite(JOBS_FILE, pendingJobsCache);
    }
}

function saveStory(storyData) {
    const id = storyData.id || `memoir_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record = {
        ...storyData,
        id,
        savedAt: new Date().toISOString()
    };

    storiesCache[id] = record;
    if (record.jobId) {
        storiesCache[`job_${record.jobId}`] = id;
    }

    safeWrite(STORIES_FILE, storiesCache);
    return record;
}

function getStory(idOrJobId) {
    if (!idOrJobId) return null;

    if (storiesCache[idOrJobId] && typeof storiesCache[idOrJobId] === 'object') {
        return storiesCache[idOrJobId];
    }

    const pointer = storiesCache[`job_${idOrJobId}`];
    if (pointer && storiesCache[pointer]) {
        return storiesCache[pointer];
    }

    const found = Object.values(storiesCache).find(s => 
        s && typeof s === 'object' && (s.id === idOrJobId || s.jobId === idOrJobId || s.sessionId === idOrJobId)
    );

    return found || null;
}

module.exports = {
    savePendingJob,
    getPendingJob,
    deletePendingJob,
    saveStory,
    getStory
};
