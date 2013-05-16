var LocalLeapApp = require('./local-leap-app.js');
var StoreLeapApp = require('./store-leap-app.js');
var BuiltinTileApp = require('./builtin-tile-app.js');

var Collection = window.Backbone.Collection.extend({
  model: function(attrs, options) {
    console.log('tmp -- building model from attribs');
    console.log('tmp -- building model from attribs ' + JSON.stringify(attrs));
    if (attrs.app_id) { // todo: use real attrib
      return new StoreLeapApp(attrs, options);
    } else if (attrs.app_name) { // todo: use real attrib
      return new LocalLeapApp(attrs, options);
    } else if (attrs.is_builtin) {
      return new BuiltinTileApp(attrs, options);
    } else {
      console.error('unknown app type: ' + JSON.stringify(attrs));
      return new BuiltinTileApp({ // todo: error tile

      });
    }
  },

  comparator: function(leapApp) {
    return leapApp.sortScore();
  }


});

module.exports = Collection;

