var util     = require('util');
var chokidar = require('chokidar');
var _        = require('lodash');
var colors   = require('colors');
var fse      = require('fs-extra');
var revision = require('./revision.json');

// One-liner for current directory, ignores .dotfiles
var destinationDirectory = revision.destinationDir;
var watchDirectory = revision.watchDir;
var watcher = chokidar.watch(watchDirectory, {ignored: /[\/\\]\./});

watcher.on('ready', function(){
  watcher.on('change', function fileChanged(path, event) {
    stageFile(path);
  })
  watcher.on('add', function fileAdded(path, event) {
    stageFile(path);  
  })
  watcher.on('remove', function fileRemoved(path, event) {
    removeFile(path); 
  });
});

var files     = [];

stageFile = function(path) {
  if (!_.includes(files, path)) {
    var newFiles = files;
    newFiles.push(path);
    commitPrompt(newFiles);
  }
}

removeFile = function(path) {
  if (_.includes(files, path)) {
    var newFiles = files;
    newFiles = _.filter(files, function(file){
      return file !== path;
    })
    commitPrompt(newFiles);
  }
}

commitPrompt = function(newFiles) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  if (newFiles === files) {
    console.log('Staged Files',files);
  }
  process.stdout.write('<Increment>'.red + ' <Commit Message>'.green);
}

//Listen to command line prompt for message
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function receiveInput(text) {
  
  if (typeof parseMessage(text) === 'object') {
    var parsedMessage = parseMessage(text);
    createVersion(parsedMessage);
  }
  
  if (text === 'quit\n') {
    done();
  }
});

function done() {
  console.log('We are done here. Go outside.');
  process.exit();
}

parseMessage = function(text) {
  var match = text.match(/^(\+*)?\s?(.*)/);
  //Increment should be a minimum of 1 to ensure we are advancing the version
  var increment = typeof match[1] !== 'undefined'
                ? Math.max(match[1].length, 1)
                : 1;
  return {
    increment: increment,
    message: match[2]
  };
}

var fileRegEx = new RegExp('('+watchDirectory+')(.*)');
var versionArray = [0,0,0];

createVersion = function(parsedObject) {
  var message = parsedObject.message;
  var increment = parsedObject.increment;
  var newVersion = getNewVersionString(increment, versionArray);
  
  _.each(files, function(file){
    var match = file.match(fileRegEx);
    var fileName = match[2];

    fse.mkdir(destinationDirectory + fileName, function(err){
      if(err){
        console.log(err)
      }
    });
    
    fse.copy(file, destinationDirectory+fileName+'/' + newVersion + ' ' + message, function(err){
      if(err){
        console.log(err)
      }
    });
  });

  files = [];
}

versionStringToArray = function(versionString) {
  if (typeof versionString === 'string') {
    var versionArray = versionString.split('.')
    versionArray.map(function(a){
      return parseInt(a, 10);
    });
    return versionArray;
  }
}

versionArrayToString = function(versionArray) {
  return versionArray.join('.');
}

incrementVersionNumber = function(incrementIndex, versionArray) {
  var adjustedIndex = 2 - incrementIndex;
  for (var i = adjustedIndex; i <= 2; i++) {
    if (i === adjustedIndex) {
      versionArray[i] += 1;
    }
    if (i > adjustedIndex) {
      versionArray[i] = 0;
    }
  };
  return versionArray;
}

getNewVersionString = function(increment, versionArray) {
  var versionArray = incrementVersionNumber(increment, versionArray)
  return versionArrayToString(versionArray);
}