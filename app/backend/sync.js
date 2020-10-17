const authorize = require('./authorize')
const fs = require('fs');
const {google} = require('googleapis');
const utils = require('./utils')
const stream = require("stream");
const kindle = require('./kindle');
const { sendIpcMessage } = require('./utils');

const FILE_IDS = 'my_files/driveFileIds.json';
const LAST_DIFF = 'my_files/lastDiff.json';

var winObject = null;
var forLoopLength;
var isNoError;

/**
 * The landing function for the script. Creates Oauth2 client and uses
 * the client to initialise the process. 
 * */ 
function operate(win) {
    var auth = null;
    winObject = win;
    authorize.operate(function(auth) {
        // auth = returnedAuth;
        maybeCreateDriveRootFolder(auth, syncHighlights);
    });
}

/**
 * Takes OAuth2 client as input, and a callback function to call after
 * it has created the DriveRoot Folder.
 * 
 * It checks for the presence of FILE_IDS. Its absence implies the program
 * is being initialised for the first time. Hence, create the root folder on
 * Google Drive.
 * 
 * And then call SyncHighlights().
 */
function maybeCreateDriveRootFolder(auth, callback) {
    fs.open(FILE_IDS,'r', function(err, fd){
      if (err) {
        createDriveRootFolder(auth, callback);
      }
      else
        callback(auth);
    })
}

/**
 * Takes OAuth2 client as input, and a callback function to call after
 * it has created the DriveRoot Folder.
 * 
 * Only call SyncHighlights() when no error has been encountered.
 * 
 * Error sources:
 *  1. Request to Drive API failed.
 *  2. Writing driveFileIDs to JSON failed.
 */
function createDriveRootFolder(auth, callback) {
    utils.sendIpcMessage(winObject, 'highlightSyncStatus%%Initialising Root Folder on drive.')
    var driveFileIds = null;
    var fileMetadata = {
        'name': 'Accio Kindle Highlights',
        'mimeType': 'application/vnd.google-apps.folder'
    };

    // Send request to DriveAPI to create root folder in Google drive.
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
            if(error)
                console.error(err);
            else
                callback(auth);
        });
    });
}

/**
 * Function responsible for syncing highlights from LAST_DIFF to google docs
 * online.
 * 
 * Sources of Error:
 *  1. Reading LAST_DIFF failed
 */
function syncHighlights(auth) {
    var lastDiff = null;
    var driveFileIds = null;
    var callbacks = 2;
    // var readKindleError = false;

    /**
     * Check if LAST_DIFF exists. If file exists, try reading the file.
     * If reading LAST_DIFF is successful, parse the read data and store
     * in an object. Wait for FILE_IDS to be read and call beginSync()
     * thereafter.
     * If reading LAST_DIFF fails, throw an error.
     * 
     * If LAST_DIFF doesn't exist, simply wait for FILE_IDS to be read and
     * call beginSync() thereafter.
     * */

    fs.open(LAST_DIFF,'r', function(err, fd){
        if (!err) {
            utils.readFile(LAST_DIFF, function callback(error, data)
            {
                if (error)
                    // readKindleError = true;
                    console.error(error)
                else
                    lastDiff = JSON.parse(data);
            
                if (--callbacks == 0) beginSync();
            });
        }
        else {
            if (--callbacks == 0) beginSync();
        }
    });

    /**
     * FILE_IDS must exist at this point. Try reading the file.
     * If reading FILE_IDS is successful, parse the read data and store
     * in an object. Wait for LAST_DIFF to be read and call beginSync()
     * thereafter.
     * 
     * If reading FILE_IDS fails, throw an error.
     * */
    utils.readFile(FILE_IDS, function callback(error, data)
    {
        if (error)
            // readKindleError = true;
            console.error(error)
        else
            driveFileIds = JSON.parse(data);

        if (--callbacks == 0) beginSync();
    });

    /**
     * beginSync() function begins to sync the contents of lastDiff online.
     */
    function beginSync() {
        // Check if lastDiff is not null, and its highlights attribute is not
        // empty.
        if(lastDiff && Object.keys(lastDiff.highlights).length !== 0) {
            if(!kindle.isNewHighlightsFound) {
                sendIpcMessage(winObject, 'highlightStatusLocal%%Unsynced highlights found locally!')
            }
            sendIpcMessage(winObject, 'highlightSyncStatus%%Syncing highlights..')
            // If lastDiff exists, go ahead with syncing.
            // newLastDiff will contain all the highlights which was not able
            // to sync in this run, due to some error.
            newLastDiff = {
                highlights : {}
            }

            // Initialising for the first time, a book is being synced.
            if (!('bookFiles' in driveFileIds)) {
                driveFileIds.bookFiles = {}
            }

            var isHighlightsPresent = false;
            forLoopLength = Object.keys(lastDiff.highlights).length;
            isNoError = true;

            // Looping over all the highlights present.
            for (var bookName of Object.keys(lastDiff.highlights)) {
                isHighlightsPresent = true;

                // If this is a new book, create a new Google Doc for this,
                // and then make a call to update the respective highlights
                // to this Doc.
                if (!(bookName in driveFileIds.bookFiles)) {
                    createNewGoogleDoc(auth, bookName, lastDiff, newLastDiff,
                                       driveFileIds, updateExistingGoogleDoc)
                }

                // If this book already exists, only update the new highlights.
                else {
                    updateExistingGoogleDoc(auth, bookName, lastDiff,
                                            newLastDiff, driveFileIds)
                }
            }
        }

        else if(lastDiff){
            // lastDiff exists implies No unsynced highlights were found.
            utils.sendIpcMessage(winObject, 'highlightSyncStatus%%No unsynced highlights found locally.')
        }

        else {
            // If lastDiff doesn't exist, flash a message to HTML that
            // Kindle hasn't been connected for the first time.
            utils.sendIpcMessage(winObject, "highlightSyncStatus%%Connect Kindle to sync \
                                  your first highlights!")
        }
    }
}

/**
 * 
 * Function for updating highlights to an existing Google doc.
 */
function updateExistingGoogleDoc(auth, bookName, lastDiff,
                                newLastDiff, driveFileIds) {
    utils.sendIpcMessage(winObject, "bookList%%"+bookName+"%%Syncing")
    const docs = google.docs({
        version: "v1",
        auth
    });
    const documentId = driveFileIds.bookFiles[bookName];
    const content = lastDiff.highlights[bookName];
    docs.documents.batchUpdate({
        documentId: documentId,
        resource: {
          requests: [{
            insertText: {
              text: content,
              endOfSegmentLocation: {
              },
            },
          }],
        }
    })
    .then(function(response) {
        // Handle the response
        utils.sendIpcMessage(winObject, "bookList%%"+bookName+"%%Done")
        // TODO: Remove this book from newDiff. (Go reverse)
        // TODO: Handle the case when user renames the book name online.
        allHighlightsProcessed();
        },
        function (err) {
            console.error(err);
            utils.sendIpcMessage(winObject, "bookList%%"+bookName+"%%Error")
            isNoError = false;
            // TODO: Remove below line.
            newLastDiff.highlights[bookName] = lastDiff.highlights[bookName];
            allHighlightsProcessed();
        }
    )
    .then(function(){
        updateLastDiffJson(newLastDiff);
    })
    /**
     * Function to persist newLastDiff in a file.
     */
    function updateLastDiffJson(newLastDiff) {
        var newLastDiffJSON = JSON.stringify(newLastDiff);
        utils.writeFile(LAST_DIFF, newLastDiffJSON, function(error)
        {
            if(error)
                console.error(error)
        });
    }
}

/**
 * Function to create a Google doc for a new book that the 
 * application sees.
 */
function createNewGoogleDoc(auth, bookName, lastDiff, newLastDiff,
                            driveFileIds, callback) {
    utils.sendIpcMessage(winObject, "bookList%%"+bookName+"%%Initialising")
    const drive = google.drive({version: 'v3', auth});
    var fileMetadata = {
        name: bookName,
        parents: [driveFileIds.rootFolderId],
        mimeType: "application/vnd.google-apps.document"
    };

    // Sending request to DriveAPI
    drive.files.create({
        resource: fileMetadata,
        fields: 'id, name', 
    })
    .then(function (response) {
        // Handle the response
        driveFileIds.bookFiles[response.data.name] = response.data.id
        updateDriveFileIds(driveFileIds)
        callback(auth, bookName, lastDiff, newLastDiff, driveFileIds)
        },
        function (err) {
            console.error(err);
            isNoError = false;
            utils.sendIpcMessage(winObject, "bookList%%"+bookName+"%%Error")
            allHighlightsProcessed();
        }   
    )

    /**
     * Function to persist driveFileIds in the file.
     */
    function updateDriveFileIds(driveFileIds) {
        var driveFileIdsJSON = JSON.stringify(driveFileIds);
        utils.writeFile(FILE_IDS, driveFileIdsJSON, function(error)
        {
            if(error)
                console.error(error)
        });
    }
}

function allHighlightsProcessed() {
    // When all highlights have been processed
    if(--forLoopLength === 0) {
        sendIpcMessage(winObject, 'highlightSyncStatus%%Finished syncing highlights!')
        if(isNoError) {
            sendIpcMessage(winObject, 'finalStatus%%Success')
        }
        else {
            sendIpcMessage(winObject, 'finalStatus%%Error')
        }
    }
}
module.exports = { operate }