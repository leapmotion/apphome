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
      tilePath: config.DefaultTilePath
    }, leapApp.toJSON());
    this.setElement($(this.templateHtml(templateData)));
    this.$el.addClass(this._stateToClass(leapApp.get('state')));

    if (leapApp.isUpgrade()) {
      this.$el.addClass('upgrade');
    }

    this._showOrHideIcon();

    this.listenTo(leapApp, 'change:state', function() {
      this.$el.removeClass(this._stateToClass(leapApp.previous('state')));
      this.$el.addClass(this._stateToClass(leapApp.get('state')));
      this._setupDragging();
    }, this);

    this.listenTo(leapApp, 'change:tilePath', function() {
      var tilePath = leapApp.get('tilePath');
      if (tilePath) {
        this.$('.tile-bg').attr('src', tilePath);
      } else {
        this.$('.tile-bg').attr('src', config.DefaultTilePath);
      }
      this._showOrHideIcon();
    }, this);

    this.listenTo(leapApp, 'change:iconPath', function() {
      this.$('.icon').attr('src', leapApp.get('iconPath'));
      this._showOrHideIcon();
    }, this);

    this.listenTo(leapApp, 'progress', function(progress) {
      this.$('.progress .bar').css('width', Math.round(progress * 100) + '%');
    }, this);

    this.$el.click(function() {
      if (leapApp.isInstallable()) {
        this._promptForInstall();
      } else if (leapApp.isRunnable()) {
        this._launchApp();
      }
    }.bind(this));

    this.$el.attr('tile_id', leapApp.id);

    new Spinner({ color: '#fff', radius: 4, length: 4, width: 2, left: -32, top: 4 }).spin(this.$('.message')[0]);

    nwGui.Window.get().on('focus', function() {
      this._markLaunchComplete();
    }.bind(this));

    this._setupDragging();
  },

  _setupDragging: function() {
    var leapApp = this.options.leapApp;
    if (leapApp.isUninstallable()) {
      this.$el.attr('draggable', 'true');
      this.$el.css('-webkit-user-drag', 'element');
      this.$el.on('dragend', function() {
        leapApp.trigger('dragend');
      });
      this.$el.on('dragstart', function(evt) {
        evt.originalEvent.dataTransfer.setData('application/json', JSON.stringify(leapApp.toJSON()));
        leapApp.trigger('dragstart');
      });
    } else {
      this.$el.removeAttr('draggable');
      this.$el.css('-webkit-user-drag', 'none');
      this.$el.unbind('dragstart');
    }
  },

  _stateToClass: function(state) {
    return _.last((state || '').split('_')).toLowerCase();
  },

  _promptForInstall: function() {
    if (this._currentlyInstalling) {
      return;
    }

    var onConfirm;
    var downloadModal;
    var leapApp = this.options.leapApp;
    this._currentlyInstalling = true;

    if (leapApp.isStoreApp()) {
      var shouldInstall;
      var polledServer;
      function maybeInstallApp() {
        if (polledServer && shouldInstall) {
          leapApp.install(function() {
            this._setupDragging();
            this._currentlyInstalling = false;
          }.bind(this));
        }
      }
      api.connectToStoreServer(true, function() {
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
      onConfirm: onConfirm.bind(this),
      onCancel: function() {
        this._currentlyInstalling = false;
      }.bind(this)
    });
    downloadModal.show();
  },

  _launchApp: function() {
    if (this._currentlyLaunching) {
      return;
    }

    this._currentlyLaunching = true;
    this.$el.addClass('launching');
    this.options.leapApp.launch();
    setTimeout(this._markLaunchComplete.bind(this), 2000);
  },

  _markLaunchComplete: function() {
    this.$el.removeClass('launching');
    this._currentlyLaunching = false;
  },

  _showOrHideIcon: function() {
    if (this.options.leapApp.showIcon()) {
      this.$('.icon').show();
    } else {
      this.$('.icon').hide();
    }
  }

});
