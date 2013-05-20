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
      this.$el.addClass('launching');
      leapApp.launch();
      setTimeout(function() {
        this.$el.removeClass('launching');
      }.bind(this), 2000);
    }.bind(this));

    this.$el.attr('tile_id', leapApp.id);
  },

  _stateToClass: function(state) {
    return _.last((state || '').split('_')).toLowerCase();
  }

});
