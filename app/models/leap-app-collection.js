var async = require('async');
var os = require("os");

var LeapApp = require('./leap-app.js');
var LocalLeapApp = require('./local-leap-app.js');
var StoreLeapApp = require('./store-leap-app.js');
var WebLinkApp = require('./web-link-app.js');

var installManager = require('../utils/install-manager.js');

module.exports = window.Backbone.Collection.extend({

  initialize: function() {
    this.on('add', function(app) {
      if (app.get('state') === LeapApp.States.NotYetInstalled && !app.get('noAutoInstall')) {
        app.set('noAutoInstall', true);

        if (app.isStoreApp()) {
          installManager.enqueue(app);
        } else if (app.isLocalApp()) {
          app.install();
        }
      }
    });
  },

  model: function(appJson, options) {
    //console.info('Building leapApp model from attribs ' + JSON.stringify(appJson));
    var app;

    if (appJson.urlToLaunch) {
      app = new WebLinkApp(appJson, options);
    } else if (appJson.appId) {
      app = new StoreLeapApp(appJson, options);
    } else if (appJson.name) {
      app = new LocalLeapApp(appJson, options);
    }

    app.on('invalid', function(model, error) {
      console.warn('Invalid appJson', JSON.stringify(appJson, null, 2), error);
    });

    if (app) {
      console.log('Created', app.className, app.get('id') + ':', app.get('name'));
      return app;
    } else {
      console.error('unknown app type: ' + JSON.stringify(appJson, null, 2));
      return {'validationError': 'unknown app type: ' + JSON.stringify(appJson, null, 2)};
    }
  },

  comparator: function(leapApp) {
    return leapApp.sortScore();
  },

  move: function(newAppDirectory, done) {
    var appMoveQueue = async.queue(function(app, cb) {
      app.move(newAppDirectory, cb);
    }, 5);

    appMoveQueue.drain = function() {
      console.log('All apps moved to ' + newAppDirectory + ' successfully.');
      done();
    };

    this.filter(function(app) {
      return app.isStoreApp() && app.get('state') === LeapApp.States.Ready;
    }).forEach(function(app) {
      appMoveQueue.push(app);
    });
  },

  save: function() {
    if (this.length) {
      this.at(0).save();
    }
  }
});
