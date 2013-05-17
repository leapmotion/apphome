#!/usr/bin/env node
require('../unit/env.js');
var assert = require('assert');
var async = require('async');
var connect = require('connect');
var fs = require('fs');
var http = require('http');
var path = require('path');
var os = require('os');

var StoreLeapApp = require('../../app/models/store-leap-app.js');
var FsScanner = require('../../app/utils/fs-scanner.js');

var allowedApps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'unit', 'utils', 'fs-scanner-data', 'local-apps.json')));

var serverConfig = connect().use(connect.static(path.join(__dirname, '..', 'unit', 'models', 'sample-apps')));
http.createServer(serverConfig).listen(9876);

function testStoreApp(app, appUrl, cb) {
  console.log('testing store app: ' + app.get('name'));
  app.install({ appUrl: appUrl }, function(err) {
    console.log(err ? err : 'INSTALLED');
    assert.ok(!err);
    console.log(app._userDataDir() + ': ' + fs.readdirSync(app._appDir()));
    console.log(app._appDir() + ': ' + fs.readdirSync(app._userDataDir()));
    app.launch().on('exit', function() {
      app.uninstall(true, function(err) {
        console.log(err ? err : 'UNINSTALLED');
        assert.ok(!err);
        assert.ok(!fs.existsSync(app._appDir()));
        assert.ok(!fs.existsSync(app._userDataDir()));
        cb();
      });
    });
  });
}

function testLocalApps(cb) {
  var fsScanner = new FsScanner({ allowedApps: allowedApps[os.platform()] });
  fsScanner.scan(function(err, apps) {
    assert.ok(apps);
    async.eachSeries(apps, function(app, callback) {
      console.log('testing local app: ' + app.get('name'));
      app.install(function(err) {
        console.log(err ? err : 'INSTALLED');
        assert.ok(!err);
        app.launch().on('exit', function() {
          app.uninstall(true, function(err) {
            console.log(err ? err : 'UNINSTALLED');
            assert.ok(!err);
            callback();
          });
        });
      });
    }, cb);
  });
}

if (os.platform() === 'win32') {
  testStoreApp(new StoreLeapApp({
    name: 'DigitDuel',
    version: '1.0.0'
  }), 'http://localhost:9876/no-drm/Digit%20Duel.zip', function() {
    testLocalApps(function() {
      process.exit();
    });
  });
} else if (os.platform() === 'darwin') {
  /*testStoreApp(new StoreLeapApp({
    name: 'Boom Ball',
    version: '1.0.0'
  }), 'http://localhost:9876/no-drm/Boom%20Ball.dmg', function() {*/
    testLocalApps(function() {
      process.exit();
    });
  //});
}

