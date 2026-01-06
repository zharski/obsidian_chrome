// IndexedDB constants
const DB_NAME = 'obsidian-extension-db';
const DB_VERSION = 1;
const STORE_NAME = 'file-handles';
const HANDLE_KEY = 'directory-handle';

// Open IndexedDB database
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

// Get directory handle from IndexedDB
async function getDirectoryHandle() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(HANDLE_KEY);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// Get ISO week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Generate filename from pattern and settings
function generateFilename(pattern, prefix, postfix) {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const week = getWeekNumber(now).toString().padStart(2, '0');
    const date = now.getDate().toString().padStart(2, '0');

    return pattern
        .replace(/{prefix}/g, prefix)
        .replace(/{postfix}/g, postfix)
        .replace(/{year}/g, year)
        .replace(/{month}/g, month)
        .replace(/{week}/g, week)
        .replace(/{date}/g, date);
}

// Write note to file
async function writeNoteToFile(note, fileSettings) {
    const directoryHandle = await getDirectoryHandle();

    if (!directoryHandle) {
        throw new Error('NO_FOLDER_CONFIGURED');
    }

    // Check current permission state (can't request in offscreen context)
    const permission = await directoryHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
        throw new Error('PERMISSION_EXPIRED');
    }

    // Generate filename (use empty string if prefix/postfix not set)
    const filename = generateFilename(
        fileSettings.fileNamePattern || '{prefix}-{year}-{month}{postfix}.md',
        fileSettings.filePrefix ?? '',
        fileSettings.filePostfix ?? ''
    );

    // Validate filename has .md extension
    const finalFilename = filename.endsWith('.md') ? filename : filename + '.md';

    // Get or create file
    const fileHandle = await directoryHandle.getFileHandle(finalFilename, { create: true });

    // Read existing content
    const file = await fileHandle.getFile();
    const existingContent = await file.text();

    // Table header for new files
    const TABLE_HEADER = '| Links | Tags |\n| ---- | ---- |';

    // Append note with newline, add table header if new file
    let newContent;
    if (existingContent) {
        newContent = existingContent + '\n' + note;
    } else {
        newContent = TABLE_HEADER + '\n' + note;
    }

    // Write to file
    const writable = await fileHandle.createWritable();
    await writable.write(newContent);
    await writable.close();

    return { success: true, filename: finalFilename };
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.target !== 'offscreen') {
        return false;
    }

    if (message.type === 'WRITE_NOTE') {
        writeNoteToFile(message.note, message.fileSettings)
            .then((result) => {
                sendResponse({
                    success: true,
                    filename: result.filename
                });
            })
            .catch((error) => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        return true; // Indicates async response
    }

    return false;
});
