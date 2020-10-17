const {ipcRenderer} = require('electron');
ipcRenderer.setMaxListeners(1000);

// Async message handler
ipcRenderer.on('asynchronous-message', (event, arg) => {
    id = arg.split('%%')[0];
    console.log(arg)
    if (id.localeCompare('bookList') === 0) {

        // Initialise bookListDiv scroll window
        if(!document.getElementById("bookListDiv").hasChildNodes()) {
            document.getElementById("bookListDiv").setAttribute("class", "bookListDiv")
            var list = document.createElement('ul')
            list.setAttribute("class", "bookList")
            list.setAttribute("id", "bookList")
            document.getElementById("bookListDiv").appendChild(list);
        } 

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
        if(document.getElementById(id)) {
            var spanElem = document.createElement('span')
            spanElem.setAttribute("class", "status")
            var textElem = document.createTextNode(arg.split('%%')[1]);
            spanElem.appendChild(textElem);
            if(document.getElementById(id).hasChildNodes()) {
                document.getElementById(id).replaceChild(spanElem, document.getElementById(id).childNodes[0]);
            }
            else {
                document.getElementById(id).appendChild(spanElem);
            }
        }
    }
    else {
        if(document.getElementById(id)) {
            var spanElem = document.createElement('span')
            spanElem.setAttribute("class", "status")
            var textElem = document.createTextNode(arg.split('%%')[1]);
            spanElem.appendChild(textElem);
            if(document.getElementById(id).hasChildNodes()) {
                document.getElementById(id).replaceChild(spanElem, document.getElementById(id).childNodes[0]);
            }
            else {
                document.getElementById(id).appendChild(spanElem);
            }
        }
    }
})

//Async message sender
// ipcRenderer.send('asynchronous-message', 'async ping')
// ipcRenderer.removeListener('asynchronous-reply', ()=>{})
