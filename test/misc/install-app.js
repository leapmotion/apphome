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
  app.install({ appUrl: 'http://localhost:9876/no-drm/Digit%20Duel.zip' }, function(err) {
    console.log(err ? err : 'INSTALLED');
    console.log(fs.readdirSync(path.join(process.env.APPDATA, 'AirspaceApps', app.get('name'))));
    console.log(fs.readdirSync(path.join(process.env.LOCALAPPDATA, 'AirspaceApps', app.get('name'))));
    app.launch().on('exit', function() {
      app.uninstall(true, function(err) {
        console.log(err ? err : 'UNINSTALLED');
        assert.ok(!fs.existsSync(path.join(process.env.APPDATA, 'AirspaceApps', app.get('name'))));
        assert.ok(!fs.existsSync(path.join(process.env.LOCALAPPDATA, 'AirspaceApps', app.get('name'))));
        process.exit();
      });
    });
  });
}
