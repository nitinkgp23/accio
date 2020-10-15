const {ipcRenderer} = require('electron');
ipcRenderer.setMaxListeners(1000);

// Async message handler
ipcRenderer.on('asynchronous-message', (event, arg) => {
    id = arg.split('%%')[0];
    if (id.localeCompare('bookList') === 0) {
        bookName = arg.split('%%')[1];
        bookStatus = arg.split('%%')[2];

        var spanElem = document.getElementById(bookName);
        if(!!spanElem) {
            listItemImg = spanElem.childNodes[0];
            listItemImg.setAttribute("class", "custom");
            if(bookStatus === 'Syncing' || bookStatus === 'Initialising') {
                listItemImg.setAttribute("alt", bookStatus);
                listItemImg.setAttribute("src", "assets/icons8-spinner-48.png")
            }
            else if(bookStatus === 'Error') {
                listItemImg.setAttribute("alt", bookStatus);
                listItemImg.setAttribute("src", "assets/icons8-cancel.svg")
            }
            else if(bookStatus === 'Done') {
                listItemImg.setAttribute("alt", bookStatus);
                listItemImg.setAttribute("src", "assets/icons8-ok-48.svg")
            }
            spanElem.replaceChild(listItemImg, spanElem.childNodes[0]);
        }
        else {

            var listItem = document.createElement('li')
            var listItemPara = document.createElement('p')
            var listItemSpan = document.createElement('span')
            var listItemName = document.createTextNode(bookName);
            var listItemImg = document.createElement("img");

            listItemImg.setAttribute("class", "custom");
            if(bookStatus === 'Syncing' || bookStatus === 'Initialising') {
                listItemImg.setAttribute("alt", bookStatus);
                listItemImg.setAttribute("src", "assets/icons8-spinner-48.png")
            }
            else if(bookStatus === 'Error') {
                listItemImg.setAttribute("alt", bookStatus);
                listItemImg.setAttribute("src", "assets/icons8-cancel.svg")
            }
            else if(bookStatus === 'Done') {
                listItemImg.setAttribute("alt", bookStatus);
                listItemImg.setAttribute("src", "assets/icons8-ok-48.svg")
            }

            listItemSpan.setAttribute("class", "icon svgicon");
            listItemSpan.setAttribute("id", bookName);
            listItemSpan.appendChild(listItemImg)
            // If the book is seen first time, add a new icon in front of it.
            if(bookStatus === 'Initialising') {
                var listItemImgInitial = document.createElement("img");
                listItemImgInitial.setAttribute("class", "custom");
                listItemImgInitial.setAttribute("alt", bookStatus);
                listItemImgInitial.setAttribute("src", "assets/newicon.png")

                listItemSpan.appendChild(listItemImgInitial)
            }
            listItemPara.appendChild(listItemName);
            listItemPara.appendChild(listItemSpan);

            listItem.appendChild(listItemPara);

            var list = document.getElementById('bookList');
            list.appendChild(listItem)
        }
    }
    else if (id.localeCompare('finalStatus') === 0) {
        if(document.getElementById(id))
            document.getElementById(id).innerHTML = arg.split('%%')[1];
    }
    else {
        if(document.getElementById(id))
            document.getElementById(id).innerHTML = arg.split('%%')[1];
    }
})

//Async message sender
// ipcRenderer.send('asynchronous-message', 'async ping')
// ipcRenderer.removeListener('asynchronous-reply', ()=>{})
