var os = require('os');
var Spinner = require('spin');

var config = require('../../../config/config.js');
var installManager = require('../../utils/install-manager.js');

var BaseView = require('../base-view.js');
var DownloadModalView = require('../download-modal/download-modal.js');

var Tile = BaseView.extend({

  viewDir: __dirname,

  initializeTile: function(app) {
    this.injectCss();

    var templateData = app.toJSON();
    templateData.iconPath = (templateData.iconPath ? this._makeFileUrl(templateData.iconPath) : '');
    templateData.tilePath = this._makeFileUrl(templateData.tilePath || config.DefaultTilePath);
    this.setElement($(this.templateHtml(templateData)));

    this.listenTo(app, 'change:iconPath', function() {
      this.$('.icon').attr('src', this._makeFileUrl(app.get('iconPath'), true));
      this._showOrHideIcon();
    }, this);

    this.listenTo(app, 'change:tilePath', function() {
      var tilePath = app.get('tilePath');
      if (tilePath) {
        this.$('.tile-bg').attr('src', this._makeFileUrl(app.get('tilePath'), true));
      } else {
        this.$('.tile-bg').attr('src', this._makeFileUrl(config.DefaultTilePath));
      }
      this._showOrHideIcon();
    }, this);

    this.listenTo(app, 'change:name', function() {
      this.$('.name').text(app.get('name'));
    }, this);

    this.$el.attr('tile_id', app.id);
  },

  initialize: function(args) {
    var leapApp = args.leapApp;

    this.initializeTile(leapApp);

    this.$el.addClass(this._stateToClass(leapApp.get('state')));

    if (leapApp.isUpgradable()) {
      this.$el.addClass('upgrade');
    }

    this._showOrHideIcon();

    this.listenTo(leapApp, 'change:state', function() {
      this.$el.removeClass(this._stateToClass(leapApp.previous('state')));
      this.$el.addClass(this._stateToClass(leapApp.get('state')));
      this._setupDragging();
    }, this);

    this.listenTo(leapApp, 'change:availableUpgrade', function() {
      this.$el.toggleClass('upgrade', leapApp.isUpgradable());
    });

    this.listenTo(leapApp, 'progress', function(progress) {
      this.$('.progress .bar').css('width', Math.min(Math.round(progress * 100), 100) + '%');
    }, this);

    this.$el.click(function() {
      if (leapApp.isInstallable()) {
        this._promptForInstall();
      } else if (leapApp.isUpgradable()) {
        this._promptForUpgrade();
      } else if (leapApp.isRunnable()) {
        this._launchApp();
      }
    }.bind(this));

    this.$('.cancel').click(function(evt) {
      leapApp.trigger('cancel-download');
      this.$('.progress .bar').css('width', 0);
      evt.stopPropagation();
    }.bind(this));

    this.$el.attr('tile_id', leapApp.id);

    new Spinner({ color: '#fff', radius: 4, length: 4, width: 2, left: -32, top: 4 }).spin(this.$('.message')[0]);

    nwGui.Window.get().on('focus', function() {
      this._markLaunchComplete();
    }.bind(this));

    this._setupDragging();
  },

  _makeFileUrl: function(filePath, forceRefresh) {
    return 'file://' + filePath + (forceRefresh ? '#' + (new Date()).getTime() : '');
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
        var dataTransfer = evt.originalEvent.dataTransfer;
        if (os.platform() !== 'win32') {
          var canvas = document.createElement('canvas');
          canvas.setAttribute('width', 96);
          canvas.setAttribute('height', 96);
          canvas.getContext('2d').drawImage(this.$('.icon')[0], 0, 0, 96, 96);
          var dragImage = document.createElement('img');
          dragImage.setAttribute('src', canvas.toDataURL());
          dataTransfer.setDragImage(dragImage, 96, 96);
        }
        dataTransfer.setData('application/json', JSON.stringify(leapApp.toJSON()));
        leapApp.trigger('dragstart');
      }.bind(this));
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
    var leapApp = this.options.leapApp;

    if (leapApp.isStoreApp()) {
      var downloadModal = new DownloadModalView({
        leapApp: leapApp,
        onConfirm: function() {
          downloadModal.remove();
          installManager.enqueue(leapApp, this._setupDragging.bind(this), true);
        }.bind(this)
      });
      downloadModal.show();
    } else {
      leapApp.install(this._setupDragging.bind(this));
    }
  },

  _promptForUpgrade: function() {
    var leapApp = this.options.leapApp;

    var downloadModal = new DownloadModalView({
      leapApp: leapApp,
      onConfirm: function() {
        this.$el.removeClass('upgrade');
        downloadModal.remove();
        installManager.enqueue(leapApp, null, true);
      }.bind(this),
      onLaunch: function() {
        downloadModal.remove();
        this._launchApp();
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
    setTimeout(this._markLaunchComplete.bind(this), 12000);
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

module.exports = Tile;
