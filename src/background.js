// Constants
const NOTIFICATION_ID = 'obsidian';
const YOUTUBE_REGEX = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

const DEFAULT_CLIPPING_OPTIONS = {
    noteFormat: "| [{title}]({url}) | |",
    addIntoFile: false,
    fileNamePattern: '{prefix}-{year}-{month}{postfix}.md',
    filePrefix: 'links',
    filePostfix: ''
};

const MESSAGE_TYPES = {
    WRITE_NOTE: 'WRITE_NOTE',
    WRITE_RESULT: 'WRITE_RESULT'
};

// Offscreen document management
async function hasOffscreenDocument() {
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });
    return contexts.length > 0;
}

async function setupOffscreenDocument() {
    if (await hasOffscreenDocument()) {
        return;
    }
    await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ['BLOBS'],
        justification: 'Write notes to local files via File System Access API'
    });
}

// Send note to offscreen document for file writing
async function writeNoteToFile(note, fileSettings) {
    await setupOffscreenDocument();

    const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.WRITE_NOTE,
        target: 'offscreen',
        note: note,
        fileSettings: fileSettings
    });

    if (!response) {
        throw new Error('NO_RESPONSE');
    }

    if (response.success) {
        return response;
    } else {
        throw new Error(response.error);
    }
}

// Main extension click handler
chrome.action.onClicked.addListener(async (tab) => {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['lib/jquery.js']
        });

        const settings = await getFromStorage(DEFAULT_CLIPPING_OPTIONS);

        const injectionResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: formatNote,
            args: [{ obsidianNoteFormat: settings.noteFormat }]
        });

        if (injectionResult?.[0]?.result) {
            const note = injectionResult[0].result;

            if (settings.addIntoFile) {
                // Write to file mode
                try {
                    const result = await writeNoteToFile(note, settings);
                    await sendNotification('Note added to ' + result.filename);
                } catch (error) {
                    if (error.message === 'NO_FOLDER_CONFIGURED') {
                        await sendNotification('Please configure a folder in extension settings.');
                    } else if (error.message === 'PERMISSION_DENIED' || error.message === 'PERMISSION_EXPIRED') {
                        await sendNotification('Folder permission expired. Please re-select folder in settings.');
                    } else if (error.message === 'NO_RESPONSE') {
                        await sendNotification('Communication error. Please try again.');
                    } else {
                        await sendNotification('Failed to write note: ' + error.message);
                    }
                }
            } else {
                // Clipboard mode (existing behavior)
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: copyToClipboard,
                    args: [note]
                });
                await sendNotification('Your note has been copied!');
            }
        }
    } catch (error) {
        console.error('Error in extension operation:', error);
        await sendNotification('Failed to process note. Please try again.');
    }
});

function sendNotification(message) {
    const opt = {
        type: 'basic',
        title: 'Obsidian',
        message: message,
        priority: 2,
        iconUrl: 'icons/favicon-128x128.png'
    };

    return new Promise((resolve, reject) => {
        // Use unique ID to prevent notification being silently replaced
        const notificationId = NOTIFICATION_ID + '_' + Date.now();
        chrome.notifications.create(notificationId, opt, () => {
            if (chrome.runtime.lastError) {
                console.error('Notification error:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log('Notification sent:', message);
                resolve();
            }
        });
    });
}

function formatNote(clippingOptions) {
    var title = document.title.replace(/\//g, '').replace(/\|/g, '-');
    var url = extractUrl();
    var selection = document.getSelection();

    var note = clippingOptions.obsidianNoteFormat;
    note = note.replace(/{clip}/g, selection);
    note = note.replace(/{url}/g, url);
    note = note.replace(/{title}/g, title);

    return note;

    function extractUrl() {
        const youtubeRegExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
        var match = window.location.href.match(youtubeRegExp);

        if (match && match[7].length == 11) {
            return window.location.href;
        }

        return window.location.origin + window.location.pathname;
    }
}

async function copyToClipboard(note) {
    if (window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(note);
            return true;
        } catch (error) {
            console.error('Clipboard API failed:', error);
            return fallbackCopy(note);
        }
    }
    return fallbackCopy(note);
}

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.cssText = 'position: fixed; left: -999999px; top: -999999px';

    try {
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        textArea.remove();
        return success;
    } catch (error) {
        console.error('Fallback copy failed:', error);
        textArea.remove();
        throw error;
    }
}

async function getFromStorage(defaults) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(defaults, resolve);
    });
}
