var config = require('../../../config/config.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    var leapApp = args.leapApp;
    var templateData = _.extend({
      iconPath: config.Defaults.IconPath,
      tilePath: config.Defaults.TilePath
    }, leapApp.toJSON());
    this.setElement($(this.templateHtml(templateData)));
    this.$el.addClass(this._stateToClass(leapApp.get('state')));

    this.listenTo(leapApp, 'change:state', function() {
      this.$el.removeClass(this._stateToClass(leapApp.previous('state')));
      this.$el.addClass(this._stateToClass(leapApp.get('state')));
    }, this);

    this.listenTo(leapApp, 'change:tilePath', function() {
      this.$('.tile-bg').attr('src', leapApp.get('tilePath'));
    }, this);

    this.listenTo(leapApp, 'change:iconPath', function() {
      this.$('.icon').attr('src', leapApp.get('iconPath'));
    }, this);

    this.listenTo(leapApp, 'progress', function(progress) {
      this.$('.progress .bar').css('width', Math.round(progress * 100) + '%');
    }, this);

    this.$el.click(function() {
      if (this.$el.hasClass('uninstalled')) {
      } else if (this.$el.hasClass('ready')) {
        this.$el.addClass('launching');
        leapApp.launch();
        setTimeout(function() {
          this.$el.removeClass('launching');
        }.bind(this), 2000);
      }
    }.bind(this));

    if (leapApp.isBuiltinTile() || leapApp.isUpgrade() || leapApp.isUninstalled()) {
      this.$el.removeAttr('draggable');
      this.$el.css('-webkit-user-drag', 'none');
    } else {
      this.$el.on('dragstart', function(evt) {
        var dataTransfer = evt.originalEvent.dataTransfer;
        dataTransfer.setDragImage(this.$el[0], 300, 156);
        dataTransfer.setData('application/json', JSON.stringify(leapApp.toJSON()));
      }.bind(this));
    }

    this.$el.attr('tile_id', leapApp.id);
  },

  _stateToClass: function(state) {
    return _.last((state || '').split('_')).toLowerCase();
  }

});
