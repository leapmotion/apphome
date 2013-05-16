var LocalLeapApp = require('./local-leap-app.js');
var StoreLeapApp = require('./store-leap-app.js');
var BuiltinTileApp = require('./builtin-tile-app.js');

module.exports = window.Backbone.Collection.extend({

  model: function(attrs, options) {
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
