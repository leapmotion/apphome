var config = require('../../../config/config.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    var leapApp = args.leapApp;
    var modal = args.trash_modal;

    var templateData = leapApp.toJSON();
    templateData.iconPath = (templateData.iconPath ? this._makeFileUrl(templateData.iconPath) : '');
    templateData.tilePath = this._makeFileUrl(templateData.tilePath || config.DefaultTilePath);
    this.setElement($(this.templateHtml(templateData)));

    this._showOrHideIcon();

    this.listenTo(leapApp, 'change:tilePath', function() {
      var tilePath = leapApp.get('tilePath');
      if (tilePath) {
        this.$('.tile-bg').attr('src', this._makeFileUrl(leapApp.get('tilePath'), true));
      } else {
        this.$('.tile-bg').attr('src', this._makeFileUrl(config.DefaultTilePath));
      }
      this._showOrHideIcon();
    }, this);

    this.listenTo(leapApp, 'change:iconPath', function() {
      this.$('.icon').attr('src', this._makeFileUrl(leapApp.get('iconPath'), true));
      this._showOrHideIcon();
    }, this);

    this.listenTo(leapApp, 'change:name', function() {
      this.$('.name').text(leapApp.get('name'));
    }, this);

    this.$el.click(this.options.onReinstall);

    this.$el.attr('tile_id', leapApp.id);

  },

  _makeFileUrl: function(filePath, forceRefresh) {
    return 'file://' + filePath + (forceRefresh ? '#' + (new Date()).getTime() : '');
  },

  _showOrHideIcon: function() {
    if (this.options.leapApp.showIcon()) {
      this.$('.icon').show();
    } else {
      this.$('.icon').hide();
    }
  }

});
