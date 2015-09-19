process.stdin.resume();
process.stdin.setEncoding('utf8');

var util     = require('util'),
    chokidar = require('chokidar'),
    _        = require('lodash'),
    colors   = require('colors'),
    fse      = require('fs-extra'),
    revision = require('./revision');

var files = [],
    watchDirectory = revision.watchDir,
    destinationDirectory = revision.destinationDir;

// One-liner for current directory, ignores .dotfiles
var watcher = chokidar.watch(watchDirectory, {ignored: /[\/\\]\./})

watcher.on('ready', function(){
  watcher.on('change', function(path, event) {
    stageFile(path);
  })
  watcher.on('add', function(path, event) {
    stageFile(path);  
  })
  watcher.on('remove', function(path, event) {
    removeFile(path); 
  });
})

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

process.stdin.on('data', function (text) {
  console.log('Your message:', text);
  if (isValid(text)) {
    createVersion(text);
  }
  if (text === 'quit\n') {
    done();
  }
});

function done() {
  console.log('We are done here. Go outside.');
  process.exit();
}

commitPrompt = function(newFiles) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  if (newFiles === files) {
    console.log('Staged Files',files);
  }
  process.stdout.write('<Increment>'.red + ' <Commit Message>'.green);
}

isValid = function() {
  return true;
}

var fileRegEx = new RegExp('('+watchDirectory+')(.*)');

createVersion = function(text) {

  _.each(files, function(file){
    var match = file.match(fileRegEx);
    var fileName = match[2];
    var message = text.replace(/\n/,'');

    fse.mkdir(destinationDirectory + fileName, function(err){
      if(err){
        console.log(err)
      }
    });
    
    fse.copy(file, destinationDirectory+fileName+'/' + message, function(err){
      if(err){
        console.log(err)
      }
    });
  })
  files = [];
}