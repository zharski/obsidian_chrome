// This runs in the background.. waiting for the icon to be clicked.. 
// It then loads the libraries required and runs the script.
// The script copies the content and adds it to your clipboard

chrome.action.onClicked.addListener(async (tab) => {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib/jquery.js']}); //https://code.jquery.com/jquery-3.5.1.min.js
    
    // defaulting to `[{title}]({url})` and FALSE respectively
    var defaultClippingOptions = {
        obsidianNoteFormat: "[{title}]({url})",
        selectionIntoDescription: false,
    }

    //extracting options from storage
    var clippingOptions = await getFromStorage(defaultClippingOptions)

    await chrome.scripting.executeScript({ target: { tabId: tab.id }, function:formatNote, args: [clippingOptions]},
        (injectionResults) => {
            if (injectionResults[0].result) {
                //Obsidian Note is formated in result of formatNote() function execution
                var note = injectionResults[0].result

                // Copying to clipboard and sending notification to a user
                chrome.scripting.executeScript({ target: { tabId: tab.id }, function:copyToClipboard, args: [note]})
                    .then(sendNotification('Your note has been copied!'))
                    .catch(err => {
                        console.log('Writing to clipboard', err);
                    })

                //write directly into the obsidian file
                    //file path == if file exsits return path, otherwise create a new file and return path to a new file
                    //write note into the file
            }
        });
});

function sendNotification(message){
    var opt = {
        type: 'basic',
        title: 'Obsidian',
        message: message,
        priority: 1,
        iconUrl:'icons/favicon-128x128.png'
    };
    chrome.notifications.create('obsidian', opt);
}

function formatNote(clippingOptions){
    var title = document.title.replace(/\//g, '')
    var url = window.location.origin + window.location.pathname //workaround allows to copy clean URLs and get rid of URL parameters
    var selection = document.getSelection()

    console.log("title: " + title)
    console.log("url: " + url)
    console.log("selection: " + selection)

    // Replace the placeholders: (with regex so multiples are replaced as well..)
    var note = clippingOptions.obsidianNoteFormat
    note = note.replace(/{clip}/g, selection)
    note = note.replace(/{url}/g, url)
    note = note.replace(/{title}/g, title)

    return note
}

//Using navigator clipboard API: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText 
function copyToClipboard(note) {
    navigator.clipboard.writeText(note)
}

// Get the obsidianNoteFormat and selectionIntoDescription from storage; 
async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, resolve);
    })
}