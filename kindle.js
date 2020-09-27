var usb = require('usb');
var path = require('path')
var drivelist = require('drivelist');
var jsdiff = require('diff');
var utils = require('./utils')
var fs = require('fs');

CLIPPINGS_FILE = 'my_files/MyClippingsPersisted.txt'
LAST_DIFF = "my_files/lastDiff.json"
DIR = "my_files"

async function operate(callback) {
    if (!fs.existsSync(DIR)) {
        fs.mkdirSync(DIR);
    }
    var devices = usb.getDeviceList();
    devices.forEach((device) => {
        getDeviceInformation(device, async function onInformation(error, information)
        {
            if (error)
            {
                console.log("Unable to get Device information");
                return;
            }

            if (isKindleDevice(information))
            {
                const drives = await drivelist.list();
                drives.forEach((drive) => {
                    filepath = getMyClippingsPath(drive);
                    if(filepath){
                        console.log("Kindle found!");
                        initialize(filepath, function(filepath)
                        {
                            actOnFile(filepath, callback);
                        });
                    }
                });
            }
        });
    });
}

function initialize(filepath, callback) {
    utils.createFile(CLIPPINGS_FILE, callback, filepath);
}

function actOnFile(filepath, callback) {
    var persistedData = null;
    var kindleData = null;
    var readPersistedError = false;
    var readKindleError = false;
    var writePersistedError = false;
    var callbacks = 2;

    utils.readFile(CLIPPINGS_FILE, function(error, data)
    {
        if (error) readPersistedError = true;
        else persistedData = data;

        if (--callbacks == 0) actOnFilePost(callback);
    });

    utils.readFile(filepath, function(error, data)
    {
        if (error) readKindleError = true;
        else kindleData = data;

        if (--callbacks == 0) actOnFilePost(callback);
    });
    
    function actOnFilePost(callback) {
        var diff = jsdiff.diffTrimmedLines(persistedData, kindleData);
        var callbacks = 2;

        actOnDiff(diff, function(){
            if(--callbacks == 0)  onFinish(callback);
        });
        utils.writeFile(CLIPPINGS_FILE, kindleData, function(error)
        {
            if(error) writePersistedError = true;
            else if(--callbacks == 0)  onFinish(callback);
        });
    }

    function onFinish(callback) {
        callback();
    }
}

function actOnDiff(diff, callback) {
    var highlights = [];
    var writeJSONError = false;
    if(diff.length > 0)
        console.log("New diff detected")
    
    diff.forEach(function(part){
        if (part.added) {
            highlights = part.value.split("==========").reduce(function(result_s, obj){
                components = obj.split('\n').reduce(function(result, elem){
                    if (elem.trim())
                        result.push(elem.trim());
                    return result;
                }, []);
                if (components.length > 0){
                    highlight = {
                        bookName: components[0],
                        highlightMeta: components[1],
                        highlightText: components[2]
                    }
                    result_s.push(highlight);
                }
                return result_s;
            }, []);
        }
    });
    processHighlights(highlights, callback)
}

function processHighlights(highlights, callback) {
    // Retrieve earlier diffs if not yet synced
    console.log("Processing highlights")
    var processedHighlights = {}
    utils.readFile(LAST_DIFF, function(error, data)
    {
        if (!error) processHighlights = JSON.parse(data);
        highlights.forEach(function(highlight){
            if(!highlight.highlightText) {
                highlight.highlightText = ""
            }
            console.log(highlight)
            if (highlight.bookName in processedHighlights){
                processedHighlights[highlight.bookName] = 
                processedHighlights[highlight.bookName].concat(highlight.highlightText, '\n', '\n')
            }
            else {
                processedHighlights[highlight.bookName] = highlight.highlightText.concat('\n', '\n')
            }
        });
        var highlightsJSON = JSON.stringify({
            highlights: processedHighlights
        });
        utils.writeFile(LAST_DIFF, highlightsJSON, function(error)
        {
            if(error) writeJSONError = true;
            else{
                console.log("Diff persisted in file")
                callback();
            }
        });
    }); 
}

function getMyClippingsPath(drive) {
    if (drive.description.toLowerCase().includes("kindle")) {
        for (i in drive.mountpoints) {
            if (drive.mountpoints[i].label.toLowerCase().includes("kindle")) {
                return path.join(drive.mountpoints[i].path, 'documents', 'My Clippings.txt');
            }
        }
    }
}

function isKindleDevice(information)
{
    var product = information.Product.toLowerCase();
    return product.includes("kindle");
}

function getDeviceInformation(device, callback)
{
    var deviceDescriptor = device.deviceDescriptor;
    var productStringIndex = deviceDescriptor.iProduct;
    var manufacturerStringIndex = deviceDescriptor.iManufacturer;
    var serialNumberIndex = deviceDescriptor.iSerialNumber;

    var callbacks = 3;
    var resultError = false;
    var productString = null;
    var manufacturerString = null;
    var serialNumberString = null;

    device.open();
    device.getStringDescriptor(productStringIndex, function callback(error, data)
    {
        if (error)resultError = true;
        else productString = data;

        if (--callbacks == 0)onFinish();
    });

    device.getStringDescriptor(manufacturerStringIndex, function callback(error, data)
    {
        if (error)resultError = true;
        else manufacturerString = data;

        if (--callbacks == 0)onFinish();
    });

    device.getStringDescriptor(serialNumberIndex, function callback(error, data)
    {
        if (error)resultError = true;
        else serialNumberString = data;

        if (--callbacks == 0)onFinish();
    });

    function onFinish()
    {
        device.close();

        var result = null;
        if (!resultError)
        {
            result = {
                idVendor: deviceDescriptor.idVendor,
                idProduct: deviceDescriptor.idProduct,
                Product: productString,
                Manufacturer: manufacturerString,
                Serial: serialNumberString
            };
        }

        callback(resultError, result);
    }
}

module.exports = { operate }