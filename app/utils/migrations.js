var db = require('./db.js');
var os = require('os');
var path = require('path');

var config = require('../../config/config.js');

var LeapApp = require('../models/leap-app.js');


/**************
These are localStorage database migrations.  They're kicked off when the
bootstrapping code detects that the client's localStorage database schema is
out of date.

Each migration only goes from the previous version to the next version, so They
need to be run in order.
***************/

var Migrations = [
  // Move single myApp Collection to myApp and uninstalledApps collections
  function v0_to_v1() {
    var uninstalledAppsJson = [];
    var myAppsJson = [];

    var appJsonList = db.fetchObj(config.DbKeys.InstalledApps) || [];

    appJsonList.forEach(function sortApp(appJson) {
      if (appJson.state === LeapApp.States.Uninstalled) {
        uninstalledAppsJson.push(appJson);
      } else {
        myAppsJson.push(appJson);
      }
    });

    db.saveObj(config.DbKeys.InstalledApps, myAppsJson);
    db.saveObj(config.DbKeys.UninstalledApps, uninstalledAppsJson);
  },

  // Factor out home directory from user apps, so we check home dir on startup
  function v1_to_v2() {
    var myAppsJson = db.fetchObj(config.DbKeys.InstalledApps);
    var uninstalledAppsJson = db.fetchObj(config.DbKeys.UninstalledApps);

    uninstalledAppsJson.forEach(LeapApp.abstractUserHomeDir);
    myAppsJson.forEach(LeapApp.abstractUserHomeDir);

    db.saveObj(config.DbKeys.InstalledApps, myAppsJson);
    db.saveObj(config.DbKeys.UninstalledApps, uninstalledAppsJson);
  }
];

// Migrate database to latest version
// Should be idempotent
function migrate() {
  if (!db.fetchObj(config.DbKeys.DbVersion)) {
    db.saveObj(config.DbKeys.DbVersion, 0);
  }

  console.log('Checking if database needs to be migrated');

  var currentDbVersion = db.fetchObj(config.DbKeys.DbVersion);

  if (currentDbVersion < Migrations.length) {
    console.log('Migrating database from version ' + currentDbVersion + ' to version ' + Migrations.length);
    // Extract only the migrations that apply to the current db version.
    Migrations.slice(currentDbVersion).forEach(function applyMigration(migration) {
      migration();
    });

    db.saveObj(config.DbKeys.DbVersion, Migrations.length);
  } else {
    console.log('Database already at version ' + currentDbVersion);
  }
}

module.exports.migrate = migrate;
