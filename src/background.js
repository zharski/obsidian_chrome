// This runs in the background.. waiting for the icon to be clicked.. 
// It then loads the libraries required and runs the script.
// The script copies the content and adds it to your clipboard

chrome.action.onClicked.addListener(async (tab) => {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib/jquery.js']}); //https://code.jquery.com/jquery-3.5.1.min.js

    // defaulting to `[{title}]({url})` and FALSE respectively
    var defaultClippingOptions = {
        obsidianNoteFormat: "| [{title}]({url}) | |",
        addIntoObisidianFile: false,
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

                //TODO:
                //write directly into the obsidian file: https://developer.chrome.com/docs/apps/app_storage/
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
function copyToClipboard(note) {
    //navigator.clipboard api requires HTTPs. Doesn't work in case of plain HTTP
    if(window.isSecureContext)
        navigator.clipboard.writeText(note)
    else //workaround for HTTP request
    {
        // text area method
        let textArea = document.createElement("textarea");
        textArea.value = note;
        // make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((res, rej) => {
            document.execCommand('copy') ? res() : rej();
            textArea.remove();
        });
    }
}

// Get values from storage; 
async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, resolve);
    })
}