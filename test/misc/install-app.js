#!/usr/bin/env node
require('../unit/env.js');
var assert = require('assert');
var connect = require('connect');
var fs = require('fs');
var http = require('http');
var path = require('path');
var os = require('os');
var StoreLeapApp = require('../../app/models/store-leap-app.js');

var serverConfig = connect().use(connect.static(path.join(__dirname, '..', 'unit', 'models', 'sample-apps')));
http.createServer(serverConfig).listen(9876);

if (os.platform() === 'win32') {
  var app = new StoreLeapApp({
    name: 'DigitDuel',
    version: '1.0.0'
  });
  var appUrl = 'http://localhost:9876/no-drm/Digit%20Duel.zip';
} else if (os.platform() === 'darwin') {
  var app = new StoreLeapApp({
    name: 'Boom Ball',
    version: '1.0.0'
  });
  var appUrl = 'http://localhost:9876/no-drm/Boom%20Ball.dmg';
}

app.install({ appUrl: appUrl }, function(err) {
  console.log(err ? err : 'INSTALLED');
  console.log(fs.readdirSync(app._appDir()));
  console.log(app._userDataDir());
  console.log(fs.readdirSync(app._userDataDir()));
  app.launch().on('exit', function() {
    app.uninstall(true, function(err) {
      console.log(err ? err : 'UNINSTALLED');
      assert.ok(!fs.existsSync(app._appDir()));
      assert.ok(!fs.existsSync(app._userDataDir()));
      process.exit();
    });
  });
});
