// This runs in the background.. waiting for the icon to be clicked.. 
// It then loads the libraries required and runs the clip.js script.
// clip.js copies the content and adds it to your clipboard
// Then this script creates a new tab with a redirect that opens the
// Obsidian vault with the specified note.

chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.tabs.executeScript(null, { file: "lib/webbrowser-polyfill.js" }, function() { // https://unpkg.com/webextension-polyfill@0.6.0/dist/browser-polyfill.js
    chrome.tabs.executeScript(null, { file: "lib/jquery.js" }, function() { // https://code.jquery.com/jquery-3.5.1.min.js
    chrome.tabs.executeScript(null, { file: "lib/rangy.js" }, function() { // https://raw.githubusercontent.com/timdown/rangy/1.3.0/lib/rangy-core.js
    chrome.tabs.executeScript(null, { file: "lib/moment.js" }, function() { // https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js
    chrome.tabs.executeScript(null, { file: "lib/turndown.js" }, async function() { // https://unpkg.com/turndown@7.0.0/dist/turndown.js

        // Get the obsidianNoteFormat and selectionIntoDescription from the settings, 
        // defaulting to `[{title}]({url})` and FALSE respectively
        var defaultClippingOptions = {
            obsidianNoteFormat: "[{title}]({url})",
            selectionIntoDescription: false,
        }
    
        async function getFromStorage(key) {
            return new Promise((resolve, reject) => {
                chrome.storage.sync.get(key, resolve);
            })
        }

        var clippingOptions = await getFromStorage(defaultClippingOptions)

        const obsidianNoteFormat = clippingOptions.obsidianNoteFormat;
        const selectionIntoDescription = clippingOptions.selectionIntoDescription;

        chrome.runtime.onMessage.addListener(function listener(result) {
            // Remove listener to prevent trigger multiple times
            chrome.runtime.onMessage.removeListener(listener);

            console.log(result)

            var noteName = result[0]
            var note = encodeURIComponent(result[1])

            console.log(noteName, note)
            
            // Redirect to page (which opens obsidian).
        });

        chrome.tabs.executeScript(tab.id, {file: 'clip.js'}, () => {
            console.log("started clipping..")
        })
    });
    });
    });
    });
    });
});