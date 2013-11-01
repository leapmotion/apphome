var async = require('async');

var LeapApp = require('./leap-app.js');
var LocalLeapApp = require('./local-leap-app.js');
var StoreLeapApp = require('./store-leap-app.js');
var WebLinkApp = require('./web-link-app.js');

var installManager = require('../utils/install-manager.js');

module.exports = window.Backbone.Collection.extend({

  initialize: function() {
    this.on('add', function(app) {
      if (app.isStoreApp() &&
          app.get('state') === LeapApp.States.NotYetInstalled &&
          !app.get('noAutoInstall')) {
        app.set('noAutoInstall', true);
        installManager.enqueue(app);
      }
    });
  },

  model: function(attrs, options) {
    console.info('Building leapApp model from attribs ' + JSON.stringify(attrs, null, 2));
    if (attrs.urlToLaunch) {
      return new WebLinkApp(attrs, options);
    } else if (attrs.appId) {
      var app = new StoreLeapApp(attrs, options);
      console.log('Created StoreLeapApp ', app.id, ': ', app.get('name'));
      return app;
    } else if (attrs.name) {
      return new LocalLeapApp(attrs, options);
    } else {
      console.error('unknown app type: ' + JSON.stringify(attrs, null, 2));
    }
  },

  comparator: function(leapApp) {
    return leapApp.sortScore();
  },

  move: function(newAppDirectory) {
    var appMoveQueue = async.queue(function(app, cb) {
      app.move(newAppDirectory, cb);
    }, 5);

    appMoveQueue.drain = function() {
      console.log('All apps moved to ' + newAppDirectory + ' successfully.');
    };

    this.filter(function(app) {
      return app.isStoreApp() && app.get('state') === LeapApp.States.Ready;
    }).forEach(function(app) {
      appMoveQueue.push(app);
    });
  }
});
