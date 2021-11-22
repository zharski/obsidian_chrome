;(async () => {
    var title = document.title.replace(/\//g, '')
    var url = window.location.href
    var defaultNoteFormat =  `[{title}]({url})`

    var defaultClippingOptions = {
        selectionIntoDescription: false,
        obsidianNoteFormat: defaultNoteFormat
    }

    async function getFromStorage(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(key, resolve);
        })
    }

    var clippingOptions = await getFromStorage(defaultClippingOptions)

    var selection = window.getSelection()

    // Replace the placeholders: (with regex so multiples are replaced as well..)
    note = clippingOptions.obsidianNoteFormat
    note = note.replace(/{clip}/g, selection)
    note = note.replace(/{url}/g, url)
    note = note.replace(/{title}/g, title)


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
    chrome.runtime.sendMessage([noteName, note])

})();