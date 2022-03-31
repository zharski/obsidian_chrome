//form elements
var txt_noteFormat = document.getElementById('note_format')
var chb_addIntoFile = document.getElementById('add_into_file')
var inpt_notesLocation = document.getElementById('notes_location')

// Saves options to chrome.storage
function save_options() {
    var noteFormat = txt_noteFormat.value;
    var addIntoFile = chb_addIntoFile.checked;
    var notesLocation = inpt_notesLocation.value;

    chrome.storage.sync.set({
        noteFormat: noteFormat,
        addIntoFile: addIntoFile,
        notesLocation: notesLocation
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Changes are saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 300);
    });
}

// Load sform state using the preferences
// stored in chrome.storage.
function load_from_storage() {
    chrome.storage.sync.get({
        noteFormat: `| [{title}]({url}) | |`,
        addIntoFile: false,
        notesLocation: ''
    }, function(options) {
        txt_noteFormat.value = options.noteFormat;
        chb_addIntoFile.checked = options.addIntoFile;
        inpt_notesLocation.disabled = !options.addIntoFile;
        inpt_notesLocation.value = options.notesLocation
    });
}

function toogle_folder_input(){
    inpt_notesLocation.disabled = !chb_addIntoFile.checked
}

document.addEventListener('DOMContentLoaded', load_from_storage);
document.getElementById('save').addEventListener('click', save_options);
chb_addIntoFile.addEventListener('click', toogle_folder_input);