// IndexedDB constants
const DB_NAME = 'obsidian-extension-db';
const DB_VERSION = 1;
const STORE_NAME = 'file-handles';
const HANDLE_KEY = 'directory-handle';

// DOM Elements (initialized on DOMContentLoaded)
let txt_noteFormat, chb_addIntoFile, inpt_filePrefix, inpt_filePostfix;
let inpt_filePattern, spn_filenamePreview, inpt_folderPath;
let fileSettingsSection, selectFolderBtn;

// Initialize DOM references
function initDOMReferences() {
    txt_noteFormat = document.getElementById('note_format');
    chb_addIntoFile = document.getElementById('add_into_file');
    inpt_filePrefix = document.getElementById('file_prefix');
    inpt_filePostfix = document.getElementById('file_postfix');
    inpt_filePattern = document.getElementById('file_pattern');
    spn_filenamePreview = document.getElementById('filename_preview');
    inpt_folderPath = document.getElementById('folder_path');
    fileSettingsSection = document.getElementById('file_settings_section');
    selectFolderBtn = document.getElementById('select_folder_btn');
}

// IndexedDB operations
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

async function storeDirectoryHandle(handle) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(handle, HANDLE_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

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

// Folder picker
async function selectFolder() {
    try {
        const directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });

        // Request persistent permission
        const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
        console.log('Permission granted:', permission);

        if (permission !== 'granted') {
            showStatus('Permission denied. Please try again.');
            return;
        }

        await storeDirectoryHandle(directoryHandle);
        inpt_folderPath.value = directoryHandle.name;

        // Store folder name in chrome.storage for display purposes
        chrome.storage.sync.set({ folderName: directoryHandle.name });

        showStatus('Folder selected: ' + directoryHandle.name);
        updatePermissionStatus('granted');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error selecting folder:', error);
            showStatus('Failed to select folder');
        }
    }
}

// Check and display permission status
async function checkPermissionStatus() {
    try {
        const handle = await getDirectoryHandle();
        if (handle) {
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            updatePermissionStatus(permission);
            return permission;
        }
    } catch (error) {
        console.error('Error checking permission:', error);
    }
    updatePermissionStatus('none');
    return 'none';
}

function updatePermissionStatus(status) {
    const folderInput = document.getElementById('folder_path');
    if (status === 'granted') {
        folderInput.style.borderColor = '#5cb85c';
        folderInput.title = 'Permission: granted';
    } else if (status === 'prompt') {
        folderInput.style.borderColor = '#f0ad4e';
        folderInput.title = 'Permission: needs re-authorization (click Select Folder)';
    } else {
        folderInput.style.borderColor = '';
        folderInput.title = '';
    }
}

// Get ISO week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Filename preview
function updateFilenamePreview() {
    const pattern = inpt_filePattern.value || '{prefix}-{year}-{month}{postfix}.md';
    const prefix = inpt_filePrefix.value;
    const postfix = inpt_filePostfix.value;

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const week = getWeekNumber(now).toString().padStart(2, '0');
    const date = now.getDate().toString().padStart(2, '0');

    let filename = pattern
        .replace(/{prefix}/g, prefix)
        .replace(/{postfix}/g, postfix)
        .replace(/{year}/g, year)
        .replace(/{month}/g, month)
        .replace(/{week}/g, week)
        .replace(/{date}/g, date);

    // Ensure .md extension
    if (!filename.endsWith('.md')) {
        filename += '.md';
    }

    spn_filenamePreview.textContent = filename;
}

// Toggle file settings visibility
function toggleFileSettings() {
    const isEnabled = chb_addIntoFile.checked;
    fileSettingsSection.style.display = isEnabled ? 'block' : 'none';
}

// Save options
function save_options() {
    const options = {
        noteFormat: txt_noteFormat.value,
        addIntoFile: chb_addIntoFile.checked,
        filePrefix: inpt_filePrefix.value,
        filePostfix: inpt_filePostfix.value,
        fileNamePattern: inpt_filePattern.value
    };

    chrome.storage.sync.set(options, () => {
        showStatus('Options saved.');
    });
}

// Load options
async function load_from_storage() {
    // Load chrome.storage settings
    chrome.storage.sync.get({
        noteFormat: '| [{title}]({url}) | |',
        addIntoFile: false,
        filePrefix: 'links',
        filePostfix: '',
        fileNamePattern: '{prefix}-{year}-{month}{postfix}.md',
        folderName: ''
    }, async (options) => {
        txt_noteFormat.value = options.noteFormat;
        chb_addIntoFile.checked = options.addIntoFile;
        inpt_filePrefix.value = options.filePrefix;
        inpt_filePostfix.value = options.filePostfix;
        inpt_filePattern.value = options.fileNamePattern;

        // Display stored folder name
        if (options.folderName) {
            inpt_folderPath.value = options.folderName;
        }

        // Load folder handle from IndexedDB to verify it still exists
        try {
            const handle = await getDirectoryHandle();
            if (handle) {
                inpt_folderPath.value = handle.name;
            }
        } catch (error) {
            console.error('Error loading folder handle:', error);
        }

        toggleFileSettings();
        updateFilenamePreview();
    });
}

function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    setTimeout(() => { status.textContent = ''; }, 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initDOMReferences();
    load_from_storage();

    // Event listeners
    document.getElementById('save').addEventListener('click', save_options);
    chb_addIntoFile.addEventListener('change', toggleFileSettings);
    selectFolderBtn.addEventListener('click', selectFolder);

    // Preview update listeners
    inpt_filePrefix.addEventListener('input', updateFilenamePreview);
    inpt_filePostfix.addEventListener('input', updateFilenamePreview);
    inpt_filePattern.addEventListener('input', updateFilenamePreview);

    // Check permission status on load
    checkPermissionStatus();
});
