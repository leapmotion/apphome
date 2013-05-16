var BaseView = require('../../base-view.js');
var VisitStore = require('../builtins/visit-store/visit-store.js');
var StoreApp = require('../store-app/store-app.js');
var LocalApp = require('../local-app/local-app.js');


var TileHolder = BaseView.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    this.setElement($(this.templateHtml()));
    var tileModel = args.tileModel || args.leapApp;
    this.$el.attr('tile_id', tileModel.id);
    this.tileId = tileModel.id;

    var contentView = factory(tileModel, args);
    this.$('.tile-content').append(contentView.$el);
  }
});


function factory(leapApp, opts) {
  opts = _.extend(opts || {}, { leapApp: leapApp });
  var view;
  if (leapApp.isStoreApp()) {
    view = new StoreApp(opts);
  } else if (leapApp.isLocalApp()) {
    view = new LocalApp(opts);
  } else if (leapApp.isBuiltinTile()) {
    if (leapApp.id === uiGlobals.Builtin.VisitStore) {
      view = new VisitStore(opts);
    } else {
      throw new Error('unknown builtin: ' + leapApp.id);
    }
  } else {
    throw new Error('unknown app type');
  }
  return view;
}

module.exports = TileHolder;
//module.exports.factory = factory;
