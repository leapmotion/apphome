var BaseView = require('../../base-view.js');
var VisitStore = require('../builtins/visit-store/visit-store.js');
var StoreApp = require('../store-app/store-app.js');
var LocalApp = require('../local-app/local-app.js');


var TileHolder = BaseView.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    var tileModel = args.tileModel || args.leapApp;
    var contentView = factory(tileModel, args);
    var templateData = _.extend({
      name: tileModel.get('name') || '',
      background_image_src: tileModel.get('background_image_src') || '',
      icon_image_src: tileModel.get('icon_image_src') || ''
    }, _.isFunction(contentView.templateData) ? contentView.templateData() : tileModel.toJSON());

    this.setElement($(this.templateHtml(templateData)));
    if (_.isFunction(contentView.setTileView)) {
      contentView.setTileView(this);
    }

    this.$('.tile-content').append(contentView.$el);

    this.listenTo(tileModel, 'change:background_image_src', function() {
      this.$('.tile-bg').attr('src', tileModel.get('background_image_src'));
    }, this);

    this.listenTo(tileModel, 'change:icon_image_src', function() {
      this.$('.icon').attr('src', tileModel.get('icon_image_src'));
    }, this);

    this.$el.attr('tile_id', tileModel.id);
    this.tileId = tileModel.id;
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
