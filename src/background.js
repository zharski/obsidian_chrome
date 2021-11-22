// This runs in the background.. waiting for the icon to be clicked.. 
// It then loads the libraries required and runs the script.
// The script copies the content and adds it to your clipboard

chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.tabs.executeScript(null, { file: "lib/jquery.js" }, async function() { // https://code.jquery.com/jquery-3.5.1.min.js

        // Get the obsidianNoteFormat and selectionIntoDescription from the settings; 
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
        });

        chrome.tabs.executeScript(tab.id, {file: 'copy.js'}, () => {
            console.log("copying... " + tab.id)
        })
    });
});