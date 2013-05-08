require('../env.js');
var FsScanner = require('../../app/utils/fs-scanner.js');

var start = new Date();

(new FsScanner()).scan(function(err, apps) {
  var elapsed = new Date() - start;
  console.log('Found ' + apps.length + ' apps in ' + (elapsed / 1000) + ' seconds.');
});
