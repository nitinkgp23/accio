const {ipcRenderer} = require('electron')

// Async message handler
ipcRenderer.on('asynchronous-reply', (event, arg) => {
    console.log(arg)
    if(document.getElementById("kindleMessage"))
        document.getElementById("kindleMessage").innerHTML = arg
})

//Async message sender
ipcRenderer.send('asynchronous-message', 'async ping')

function kindleMessage(message) {
    document.getElementById("kindle").innerHTML = message;
}
