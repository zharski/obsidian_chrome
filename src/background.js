// Add constants at the top
const NOTIFICATION_ID = 'obsidian';
const YOUTUBE_REGEX = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
const DEFAULT_CLIPPING_OPTIONS = {
    obsidianNoteFormat: "| [{title}]({url}) | |",
    addIntoObisidianFile: false,
};

// This runs in the background.. waiting for the icon to be clicked.. 
// It then loads the libraries required and runs the script.
// The script copies the content and adds it to your clipboard

chrome.action.onClicked.addListener(async (tab) => {
    try {
        await chrome.scripting.executeScript({ 
            target: { tabId: tab.id }, 
            files: ['lib/jquery.js']
        });

        const clippingOptions = await getFromStorage(DEFAULT_CLIPPING_OPTIONS);

        const injectionResult = await chrome.scripting.executeScript({ 
            target: { tabId: tab.id }, 
            function: formatNote, 
            args: [clippingOptions]
        });

        if (injectionResult?.[0]?.result) {
            const note = injectionResult[0].result;
            await chrome.scripting.executeScript({ 
                target: { tabId: tab.id }, 
                function: copyToClipboard, 
                args: [note]
            });
            await sendNotification('Your note has been copied!');
        }
    } catch (error) {
        console.error('Error in extension operation:', error);
        await sendNotification('Failed to copy note. Please try again.');
    }
});

function sendNotification(message) {
    const opt = {
        type: 'basic',
        title: 'Obsidian',
        message: message,
        priority: 1,
        iconUrl: 'icons/favicon-128x128.png'
    };
    
    return new Promise((resolve, reject) => {
        chrome.notifications.create(NOTIFICATION_ID, opt, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

function formatNote(clippingOptions){ 
    var title = document.title.replace(/\//g, '').replace(/\|/g, '-')//cleaning the description. Need to replace '|' to avoid conflict with *.md markdown 
    var url = extractUrl()
    var selection = document.getSelection()

    // Replace the placeholders: (with regex so multiples are replaced as well..)
    var note = clippingOptions.obsidianNoteFormat
    note = note.replace(/{clip}/g, selection)
    note = note.replace(/{url}/g, url)
    note = note.replace(/{title}/g, title)

    return note;

    //extract url. to be moved into separate script file and injected in manifest.json
    function extractUrl(){
        const youtubeRegExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/; //Regex to  extract video_id from Yotube URLs

        // Regexp to extract video id from Youtube pages
        var match = window.location.href.match(youtubeRegExp);

        if (match && match[7].length == 11){ //we have a valid youtube URL 
            return window.location.href
        }

        return window.location.origin + window.location.pathname; // allows to copy clean URLs and get rid of URL parameters
    }
}

//Using navigator clipboard API: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText 
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

// Get values from storage; 
async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, resolve);
    })
}