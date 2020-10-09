const authorize = require('./authorize')
const fs = require('fs');
const {google} = require('googleapis');
const utils = require('./utils')
const stream = require("stream");

const FILE_IDS = 'my_files/driveFileIds.json';
const LAST_DIFF = 'my_files/lastDiff.json';

function operate() {
    utils.sendIpcMessage("Syncing highlights...")
    var auth = null;
    authorize.operate(function(returnedAuth) {
        auth = returnedAuth;
        maybeCreateInitialFolder(auth, syncHighlights);
    });
}

function maybeCreateInitialFolder(auth, callback) {
    fs.open(FILE_IDS,'r', function(err, fd){
      if (err) {
        createInitialFolder(auth, callback);
      }
      else
        callback(auth);
    })
}

function createInitialFolder(auth, callback) {
    var driveFileIds = null;
    var writeDriveFileIdsJSONError = false;
    var fileMetadata = {
        'name': 'Accio Kindle Highlights',
        'mimeType': 'application/vnd.google-apps.folder'
    };
    const drive = google.drive({version: 'v3', auth});
    drive.files.create({
        resource: fileMetadata,
        fields: 'id'
    })
    .then(function (response) {
        // Handle the response
        driveFileIds = {
            rootFolderId: response.data.id
        };
    },
    function (err) {
        console.error(err);
    })
    .then(function () {
        var driveFileIdsJSON = JSON.stringify(driveFileIds);
        utils.writeFile(FILE_IDS, driveFileIdsJSON, function(error)
        {
            if(error) writeDriveFileIdsJSONError = true;
            else callback(auth);
        });
    });
}

function syncHighlights(auth) {
    console.log("Syncing highlights main")
    var lastDiff = null;
    var driveFileIds = null;
    var callbacks = 2;

    fs.open(LAST_DIFF,'r', function(err, fd){
        if (!err) {
            utils.readFile(LAST_DIFF, function callback(error, data)
            {
                if (error) readKindleError = true;
                else lastDiff = JSON.parse(data);
            
                if (--callbacks == 0) beginSync();
            });
        }
        else {
            if (--callbacks == 0) beginSync();
        }
    });

    utils.readFile(FILE_IDS, function callback(error, data)
    {
        if (error) readKindleError = true;
        else driveFileIds = JSON.parse(data);

        if (--callbacks == 0) beginSync();
    });

    function beginSync() {
        if (lastDiff) {
            newLastDiff = {
                highlights : {}
            }
            if (!('bookFiles' in driveFileIds)) {
                console.log("Setting bookFiles to empty")
                driveFileIds.bookFiles = {}
            }
            for (var bookName of Object.keys(lastDiff.highlights)) {
                if (!(bookName in driveFileIds.bookFiles)) {
                    createNewGoogleDoc(auth, bookName, lastDiff, newLastDiff, driveFileIds, updateExistingGoogleDoc)
                }
                else {
                    updateExistingGoogleDoc(auth, bookName, lastDiff, newLastDiff, driveFileIds)
                }
            }
            utils.sendIpcMessage("Finished syncing highlights...")

        }
        else {
            utils.sendIpcMessage("No unsynced highlights found!")
        }
    }
}

function updateExistingGoogleDoc(auth, bookName, lastDiff, newLastDiff, driveFileIds) {
    // Updating existing google doc
    const drive = google.drive({version: 'v3', auth});
    console.log(bookName, "Book exists")
    const documentId = driveFileIds.bookFiles[bookName];
    drive.files.export({
        fileId: documentId,
        mimeType: "text/plain",
        },
        { responseType: "stream" },
        (err, { data }) => {
            if (err) {
                console.log(err);
                return;
            }
            let buf = [];
            data.on("data", (e) => buf.push(e));
            data.on("end", () => {
                const content = lastDiff.highlights[bookName];
                console.log(content)
                buf.push(Buffer.from(content, "binary"));
                const bufferStream = new stream.PassThrough();
                bufferStream.end(Uint8Array.from(Buffer.concat(buf)));
                var media = {
                    body: bufferStream,
                };
                drive.files.update({
                    fileId: documentId,
                    resource: {},
                    media: media,
                    fields: "id, name",
                })
                .then(function (response) {
                    // Handle the response
                    console.log(response.data.name, "File updated")
                    },
                    function (err) {
                    console.error(err);
                    newLastDiff.highlights[bookName] = highlights[bookName];
                })
                .then(function(){
                    updateLastDiffJson(newLastDiff);
                })
            });
        }
    );
    function updateLastDiffJson(newLastDiff) {
        var newLastDiffJSON = JSON.stringify(newLastDiff);
        utils.writeFile(LAST_DIFF, newLastDiffJSON, function(error)
        {
            if(error) writeDriveFileIdsJSONError = true;
        });
    }
}

function createNewGoogleDoc(auth, bookName, lastDiff, newLastDiff, driveFileIds, callback) {
    // Creating a new Google DOC
    console.log(bookName, "doesnt exist")
    const drive = google.drive({version: 'v3', auth});
    var fileMetadata = {
        name: bookName,
        parents: [driveFileIds.rootFolderId],
        mimeType: "application/vnd.google-apps.document"
    };
    drive.files.create({
        resource: fileMetadata,
        fields: 'id, name', 
    })
    .then(function (response) {
        // Handle the response
        driveFileIds.bookFiles[response.data.name] = response.data.id
        console.log(response.data.name, "File created")
        updateDriveFileIds(driveFileIds)
        callback(auth, bookName, lastDiff, newLastDiff, driveFileIds)
        },
        function (err) {
            console.error(err);
        }   
    )
    .then(function(){
        updateDriveFileIds(driveFileIds)
    })

    function updateDriveFileIds(driveFileIds) {
        var driveFileIdsJSON = JSON.stringify(driveFileIds);
        utils.writeFile(FILE_IDS, driveFileIdsJSON, function(error)
        {
            if(error) writeDriveFileIdsJSONError = true;
        });
    }
}

module.exports = { operate }