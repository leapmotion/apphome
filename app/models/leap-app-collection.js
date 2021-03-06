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

    switch (appJson.appType) {
      case LeapApp.Types.WebApp:
        app = new WebLinkApp(appJson, options);
        break;
      case LeapApp.Types.StoreApp:
        app = new StoreLeapApp(appJson, options);
        break;
      case LeapApp.Types.LocalApp:
        app = new LocalLeapApp(appJson, options);
        break;
    }

    if (app) {
      app.on('invalid', function(model, error) {
        console.warn('Invalid appJson', JSON.stringify(appJson, null, 2), error);
      });

      console.log('Created', app.className, app.get('id') + ':', app.get('name'));
      return app;
    } else {
      console.error('unknown app type: ' + JSON.stringify(appJson, null, 2));
      return false;
    }
  },

  comparator: function(leapApp) {
    return leapApp.sortScore();
  },

  move: function(newAppDirectory, done) {
    var appsToMove = this.filter(function(app) {
      return app.isStoreApp() && app.get('state') === LeapApp.States.Ready;
    });

    if (!appsToMove.length) {
      return done();
    }

    var appMoveQueue = async.queue(function(app, cb) {
      app.move(newAppDirectory, cb);
    }, 5);

    appMoveQueue.drain = function() {
      console.log('All apps moved to ' + newAppDirectory + ' successfully.');
      done();
    };

    appsToMove.forEach(function(app) {
      appMoveQueue.push(app);
    });
  },

  save: function() {
    if (this.length) {
      // Saving a model saves the collection right now.
      // So just save the first model in the collection
      // See model.save()
      this.at(0).save();
    }
  }
});
