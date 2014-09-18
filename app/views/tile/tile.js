var os = require('os');
var Spinner = require('spin');

var config = require('../../../config/config.js');
var i18n = require('../../utils/i18n.js');
var installManager = require('../../utils/install-manager.js');

var BaseView = require('../base-view.js');
var DownloadModalView = require('../download-modal/download-modal.js');

var Tile = BaseView.extend({

  viewDir: __dirname,

  initializeTile: function() {
    this.injectCss();

    this.iconPath = this.model.get('iconPath') ? this._makeFileUrl(this.model.get('iconPath'), true) : '';
    this.tilePath = this._makeFileUrl(
      (this.model.get('tilePath') || config.DefaultTilePath)
      , true
    );

    this.listenTo(this.model, 'change:iconPath', function() {
      this.$('.icon').attr('src', this._makeFileUrl(this.model.get('iconPath'), true));
      this._showOrHideIcon();
    });

    this.listenTo(this.model, 'change:tilePath', function() {
      var tilePath = this.model.get('tilePath');
      if (tilePath) {
        this.$('.tile-bg').attr('src', this._makeFileUrl(tilePath, true));
      } else {
        this.$('.tile-bg').attr('src', this._makeFileUrl(config.DefaultTilePath));
      }
      this._showOrHideIcon();
    });

    this.listenTo(this.model, 'change:isV2', function() {
      var isV2 = this.model.get('isV2');
      if (isV2) {
        this.$('.ribbon-container').css('visibility', 'visible')
      } else {
        this.$('.ribbon-container').css('visibility', 'hidden')
      }

      // http://stackoverflow.com/questions/7005411/sorting-a-backbone-collection-after-initialization
      // playground and app store (apparently) have no collection
      if (this.model.collection){
        this.model.collection.sort();
      }

    });

    this.listenTo(this.model, 'change:description', function() {
      var description = this.model.getShortDescription();
      this.$('.description').text(description);
    });

    this.listenTo(this.model, 'change:tagline', function() {
      var description = this.model.getShortDescription();
      this.$('.description').text(description);
    });

    this.listenTo(this.model, 'change:name', function() {
      this.$('.name').text(this.model.get('name'));
    });

    this.$el.attr('tile_id', this.model.id);
  },

  initialize: function(options) {
    this.initializeTile();

    this.setElement(this.templateHtml({
      app:                  _.extend(this.model.toJSON(), {iconPath: this.iconPath, tilePath: this.tilePath}),
      store_app:            this.model.isStoreApp(),
      app_slug:             this.model.get('slug'),
      short_description:    this.model.getShortDescription(),
      is_v2:                this.model.get('isV2'),
      waiting_label:        i18n.translate('Waiting...'),
      connecting_label:     i18n.translate('Connecting...'),
      downloading_label:    i18n.translate('Downloading...'),
      installing_label:     i18n.translate('Installing...'),
      moving_label:         i18n.translate('Moving...'),
      opening_label:        i18n.translate('Opening...'),
      launching_label:      i18n.translate('Launching...'),
      clickToInstall_label: i18n.translate('Click to Install')
    }));

    this.$el.addClass(this._stateToClass(this.model.get('state')));

    if (this.model.isUpdatable()) {
      this.$el.addClass('update');
    }

    this._showOrHideIcon();

    this.listenTo(this.model, 'change:state', function() {
      this.$el.removeClass(this._stateToClass(this.model.previous('state')));
      this.$el.addClass(this._stateToClass(this.model.get('state')));
      this.$el.toggleClass('update', this.model.isUpdatable());
      this._setupDragging();
    }, this);

    this.listenTo(this.model, 'change:availableUpdate', function() {
      this.$el.toggleClass('update', this.model.isUpdatable());
    });

    this.listenTo(this.model, 'progress', function(progress) {
      this.$('.progress .bar').css('width', Math.min(Math.round(progress * 100), 100) + '%');
    }, this);

    this.$el.click(function(evt) {
      if (this.model.isInstallable()) {
        this._promptForInstall();
      } else if (this.model.isUpdatable()) {
        this._promptForUpdate();
      } else if (this.model.isRunnable()) {
        this._launchApp();
      }

      evt.stopPropagation();

      // this hides the focus and launcher warning, maybe?
      setTimeout(function() {
        $('body').click();
      }, 3000);

    }.bind(this));

    this.$('.cancel').click(function(evt) {
      this.model.trigger('cancel-download');
      this.$('.progress .bar').css('width', 0);
      evt.stopPropagation();
    }.bind(this));

    this.$el.attr('tile_id', this.model.id);

    nwGui.Window.get().on('focus', function() {
      this._markLaunchComplete();
    }.bind(this));

    this._setupDragging();
  },

  _makeFileUrl: function(filePath, forceRefresh) {
    return 'file://' + filePath + (forceRefresh ? '#' + (new Date()).getTime() : '');
  },

  _setupDragging: function() {
    if (this.model.isUninstallable()) {
      this.$el.attr('draggable', 'true');
      this.$el.css('-webkit-user-drag', 'element');
      this.$el.on('dragend', function() {
        this.model.trigger('dragend');
      }.bind(this));
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
        dataTransfer.setData('application/json', JSON.stringify(this.model.toJSON()));
        this.model.trigger('dragstart');
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
    if (this.model.isStoreApp()) {
      var downloadModal = new DownloadModalView({
        leapApp: this.model,
        onConfirm: function() {
          downloadModal.remove();
          installManager.enqueue(this.model, this._setupDragging.bind(this));
        }.bind(this)
      });
      downloadModal.show();
    } else {
      this.model.install(this._setupDragging.bind(this));
    }
  },

  _promptForUpdate: function() {
    var downloadModal = new DownloadModalView({
      leapApp: this.model,
      onConfirm: function() {
        downloadModal.remove();
        installManager.enqueue(this.model, null);
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
    this.model.launch();
    setTimeout(this._markLaunchComplete.bind(this), 12000);
  },

  _markLaunchComplete: function() {
    this.$el.removeClass('launching');
    this._currentlyLaunching = false;
  },

  _showOrHideIcon: function() {
    if (this.model.showIcon()) {
      this.$('.icon').show();
    } else {
      this.$('.icon').hide();
    }
  }

});

module.exports = Tile;
