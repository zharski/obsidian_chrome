// Saves options to chrome.storage
function save_options() {
    var obsidianNoteFormat = document.getElementById('obsidian_note_format').value;
    var selectionIntoDescription = document.getElementById('add_selection_into_description').checked;

    chrome.storage.sync.set({
        obsidianNoteFormat, obsidianNoteFormat,
        selectionIntoDescription: selectionIntoDescription
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

// Load sform state using the preferences
// stored in chrome.storage.
function load_from_storage() {
    chrome.storage.sync.get({
        selectionIntoDescription: false,
        obsidianNoteFormat: `[{title}]({url})`
    }, function(options) {
        document.getElementById('obsidian_note_format').value = options.obsidianNoteFormat;
        document.getElementById('add_selection_into_description').checked = options.selectionIntoDescription;
    });
}

document.addEventListener('DOMContentLoaded', load_from_storage);
document.getElementById('save').addEventListener('click', save_options);