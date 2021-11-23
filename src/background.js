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

    var clippingOptions = await getFromStorage(defaultClippingOptions)

    var result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, function:formatNote, args: [clippingOptions]});
    var note = result[0].result
    
    chrome.scripting.executeScript({ target: { tabId: tab.id }, function:copyToClipboard, args: [note]});

    sendNotification('Your note has been copied!')
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
    var url = window.location.href
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

function copyToClipboard(note) {
    console.log("note: " + note)
    // Add to a note, prepare to copy to the clipboard
    // Create text-input to copy from:
    var copyFrom = $('<textarea/>');

    // Create text to copy and paste in the textarea
    copyFrom.text(note);
    $('body').append(copyFrom);

    // Select & copy the content
    copyFrom.select();
    document.execCommand('copy');
    
    // Remove textarea
    copyFrom.remove();
    chrome.runtime.sendMessage([note])
}

// Get the obsidianNoteFormat and selectionIntoDescription from storage; 
async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, resolve);
    })
}