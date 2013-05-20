var LocalLeapApp = require('./local-leap-app.js');
var StoreLeapApp = require('./store-leap-app.js');
var BuiltinTileApp = require('./builtin-tile-app.js');

module.exports = window.Backbone.Collection.extend({

  model: function(attrs, options) {
    console.info('Building leapApp model from attribs ' + JSON.stringify(attrs));
    if (attrs.isBuiltin) {
      return new BuiltinTileApp(attrs, options);
    } else if (attrs.appId) {
      return new StoreLeapApp(attrs, options);
    } else if (attrs.name) {
      return new LocalLeapApp(attrs, options);
    } else {
      console.error('unknown app type: ' + JSON.stringify(attrs));
      return new BuiltinTileApp({
        id: uiGlobals.Builtin.ErrorTile
      });
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
