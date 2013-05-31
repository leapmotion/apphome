var Spinner = require('spin');

var api = require('../../utils/api.js');
var config = require('../../../config/config.js');

var BaseView = require('../base-view.js');
var DownloadModalView = require('../download-modal/download-modal.js');

module.exports = BaseView.extend({
  viewDir: __dirname,

  initialize: function(args) {
    this.injectCss();
    var leapApp = args.leapApp;
    var templateData = _.extend({
      iconPath: '',
      tilePath: config.Defaults.TilePath
    }, leapApp.toJSON());
    this.setElement($(this.templateHtml(templateData)));
    this.$el.addClass(this._stateToClass(leapApp.get('state')));

    if (leapApp.isUpgrade()) {
      this.$el.addClass('upgrade');
    }

    if (!leapApp.get('iconPath')) {
      this.$('.icon').hide();
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
      var newIconPath = leapApp.get('tilePath');
      if (newIconPath) {
        this.$('.icon').attr('src', newIconPath).show();
      } else {
        this.$('.icon').hide();
      }
    }, this);

    this.listenTo(leapApp, 'progress', function(progress) {
      this.$('.progress .bar').css('width', Math.round(progress * 100) + '%');
    }, this);

    this.$el.click(function(evt) {
      if (leapApp.isInstallable()) {
        var onConfirm;
        var downloadModal;

        if (leapApp.isStoreApp()) {
          var shouldInstall;
          var polledServer;
          function maybeInstallApp() {
            if (polledServer && shouldInstall) {
              leapApp.install(function() {
                this._setupDragging();
              }.bind(this));
            }
          }
          api.connectToStoreServer(function() {
            polledServer = true;
            maybeInstallApp.call(this);
          }.bind(this));

          onConfirm = function() {
            downloadModal.remove();
            shouldInstall = true;
            maybeInstallApp.call(this);
          };
        } else {
          onConfirm = function() {
            downloadModal.remove();
            leapApp.install();
          };
        }
        downloadModal = new DownloadModalView({
          leapApp: leapApp,
          onConfirm: onConfirm.bind(this)
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
        var canvas = document.createElement('canvas');
        canvas.setAttribute('width', 96);
        canvas.setAttribute('height', 96);
        canvas.getContext('2d').drawImage(this.$('.icon')[0], 0, 0, 96, 96);
        var dragImage = document.createElement('img');
        dragImage.setAttribute('src', canvas.toDataURL());
        dataTransfer.setDragImage(dragImage, 96, 96);
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
