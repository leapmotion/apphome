var Spinner = require('spin');

var config = require('../../../config/config.js');

var BaseView = require('../base-view.js');
var DownloadModalView = require('../download-modal/download-modal.js');

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

    if (leapApp.isUpgrade()) {
      this.$el.addClass('upgrade');
    }

    this.listenTo(leapApp, 'change:state', function() {
      this.$el.removeClass(this._stateToClass(leapApp.previous('state')));
      this.$el.addClass(this._stateToClass(leapApp.get('state')));
      this._setupDragging();
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
      if (leapApp.isInstallable()) {
        var downloadModal = new DownloadModalView({
          leapApp: leapApp,
          onConfirm: function() {
            downloadModal.remove();
            leapApp.install();
          }
        });
        downloadModal.show();
      } else if (leapApp.isRunnable()) {
        this.$el.addClass('launching');
        leapApp.launch();
        setTimeout(function() {
          this.$el.removeClass('launching');
        }.bind(this), 2000);
      }
    }.bind(this));

    this.$el.attr('tile_id', leapApp.id);

    new Spinner({ color: '#fff', radius: 4, length: 4, width: 2, left: -32, top: 4 }).spin(this.$('.message')[0]);

    this._setupDragging();
  },

  _setupDragging: function() {
    var leapApp = this.options.leapApp;
    if (leapApp.isUninstallable()) {
      this.$el.on('dragstart', function(evt) {
        var dataTransfer = evt.originalEvent.dataTransfer;
        dataTransfer.setDragImage($('<img width="96" height="96" src="' + leapApp.get('iconPath') + '"/>')[0], 96, 96);
        dataTransfer.setData('application/json', JSON.stringify(leapApp.toJSON()));
      }.bind(this));
    } else {
      this.$el.removeAttr('draggable');
      this.$el.css('-webkit-user-drag', 'none');
    }
  },

  _stateToClass: function(state) {
    return _.last((state || '').split('_')).toLowerCase();
  }

});
