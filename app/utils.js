const fs = require('fs');
var ipcMain = require('electron').ipcMain;
ipcMain.setMaxListeners(1000);

function createFile(filename, callback, arg1) {
    fs.open(filename,'r',function(err, fd){
      if (err) {
        fs.writeFile(filename, '', function(err) {
            if(err) {
                console.log(err);
            }
            console.log(filename, "Creating file, doesn't exist already");
        });
      }
      callback(arg1);
    });
}

function readFile(filename, callback) {
    fs.readFile(filename, 'utf8', function(err, data) {
        callback(err, data)
      });
}

function writeFile(filename, data, callback) {
    fs.writeFile(filename, data, function (err)
    {
        callback(err)
    });
}

function sendIpcMessage(win, message) {
    win.webContents.on('did-stop-loading', function() { 
        win.webContents.send('asynchronous-message', message)
    })
    win.webContents.send('asynchronous-message', message)
    // }
    // Event handler for asynchronous incoming messages
    // ipcMain.on('asynchronous-reply', (event, arg) => {
        // console.log(arg)

        // Event emitter for sending asynchronous messages
        // event.sender.send('asynchronous-reply', message)
        // ipcMain.removeListener('asynchronous-message', ()=>{})
    // })
}

module.exports = { createFile, readFile, writeFile, sendIpcMessage }