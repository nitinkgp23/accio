const fs = require('fs');

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

module.exports = { createFile, readFile, writeFile }