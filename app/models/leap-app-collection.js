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
    console.info('Building leapApp model from attribs ' + JSON.stringify(attrs));
    if (attrs.urlToLaunch) {
      return new WebLinkApp(attrs, options);
    } else if (attrs.appId) {
      console.log('store leap app');
      var app = new StoreLeapApp(attrs, options);
      console.log('created successfully');
      return app;
    } else if (attrs.name) {
      return new LocalLeapApp(attrs, options);
    } else {
      console.error('unknown app type: ' + JSON.stringify(attrs));
    }
  },

  comparator: function(leapApp) {
    return leapApp.sortScore();
  },

  getPageModels: function(pageNumber, modelsPerPage) {
    try {
      var first = pageNumber * modelsPerPage;
      return this.models.slice(first, first + modelsPerPage);
    } catch (err) {
      console.error('invalid getPageModels params: ' + [ pageNumber, modelsPerPage ]);
      return [];
    }
  },

  pageCount: function(modelsPerPage) {
    if (!modelsPerPage || typeof modelsPerPage !== 'number') {
      return 0;  // or throw an error?
    }
    return modelsPerPage && typeof modelsPerPage === 'number' ?
      Math.ceil(this.length / modelsPerPage) : 0;
  },

  whichPage: function(modelOrNdx, modelsPerPage) {
    if (!modelsPerPage) {
      throw new Error('modelsPerPage required');
    }
    var ndx = typeof modelOrNdx === 'number' ? modelOrNdx : this.indexOf(modelOrNdx);
    ndx = Math.max(Math.min(ndx, this.length - 1), 0);
    return Math.floor(ndx / modelsPerPage);
  }

});
