var config = require('../../../config/config.js');
var db = require('../../utils/db.js');
var os = require('os');
var i18n = require('../../utils/i18n.js');
var path = require('path');

var installManager = require('../../utils/install-manager.js');
var LeapApp = require('../../models/leap-app.js');

var BaseView = require('../base-view.js');
var Carousel = require('../carousel/carousel.js');
var TrashModalView = require('../trash-modal/trash-modal.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'main-page',

  initialize: function() {
    window.ondragover = function(evt) { evt.preventDefault(); return false; }; // ignore dragged in files
    window.ondrop = function(evt) { evt.preventDefault(); return false; };
    window.onresize = function(evt) {
      if (window.screenX < 0) {
        window.moveTo(0, window.screenY);
      }

      if (window.screenY < 0) {
        window.moveTo(window.screenX, 0);
      }
    };

    var nwworkingdir = db.fetchObj(config.DbKeys.AppInstallDir) || path.join.apply(null, config.PlatformAppDirs[os.platform()]);

    console.log('Current install directory: ' + nwworkingdir);

    this.injectCss();
    this.$el.append(this.templateHtml({
      trash_label: i18n.translate('Trash'),
      download_label: i18n.translate('Download All'),
      update_label: i18n.translate('Update All'),
      cancel_label: i18n.translate('Cancel All'),
      nwworkingdir: nwworkingdir
    }));
    this._initCarousel();
    this._initDownloadControls();
    this._initTrash();
    this._initSearchField();
    this._setupResizeBehavior();
    $(window).resize();
    this.animateIn();
  },

  _initCarousel: function() {
    this.myAppsCarousel = new Carousel({
      collection: uiGlobals.myApps,
      position: 1
    });

    this.$('#my-apps').append(this.myAppsCarousel.$el);
  },

  _initDownloadControls: function() {
    this.$('#update-all').click(function(evt) {
      uiGlobals.myApps.forEach(function(app) {
        if (app.isUpdatable()) {
          installManager.enqueue(app);
        }
      });

      $(this).hide();
    });

    this.$('#download-all').click(function(evt) {
      uiGlobals.myApps.forEach(function(app) {
        if (app.get('state') === LeapApp.States.NotYetInstalled) {
          installManager.enqueue(app);
        }
      });

      $(this).hide();
    });

    this.$('#cancel-all').click(function(evt) {
      installManager.cancelAll();
      $(this).hide();
    });

    this.$('#update-all').hide();
    this.$('#download-all').hide();
    this.$('#cancel-all').hide();

    setTimeout(function() {
        // True makes it fade in
        installManager.showAppropriateDownloadControl(true);
    }, 1500);
  },

  _initTrash: function() {
    var $trashCan = this.$('#trash');
    $trashCan.on('dragover', function(evt) {
      evt.preventDefault();
    }.bind(this));

    $trashCan.on('drop', function(evt) {
      var leapApp;

      evt.stopPropagation();

      this.$('#trash').removeClass('highlight');

      try {
        var transferredJson = JSON.parse(evt.originalEvent.dataTransfer.getData('application/json'));
        leapApp = uiGlobals.myApps.get(transferredJson.appId || transferredJson.id);
      } catch (err) {
        console.error('received invalid json: ' + (err.stack || err));
      }

      if (leapApp) {
        leapApp.uninstall();
      }
    }.bind(this));

    $trashCan.on('click', function() {
      if (!$trashCan.hasClass('empty')) {
        var trashModal = new TrashModalView({
          onClose: this._updateTrashState.bind(this)
        });
        trashModal.show();
      }
    }.bind(this));

    uiGlobals.myApps.on('install', this._updateTrashState.bind(this));
    uiGlobals.uninstalledApps.on('install', this._updateTrashState.bind(this));
    uiGlobals.myApps.on('uninstall', this._updateTrashState.bind(this));
    uiGlobals.uninstalledApps.on('uninstall', this._updateTrashState.bind(this));

    uiGlobals.myApps.on('dragstart', function() {
      this.$('#trash').addClass('highlight');
    }.bind(this));

    uiGlobals.myApps.on('dragend', function() {
      this.$('#trash').removeClass('highlight');
    }.bind(this));

    this._updateTrashState();
  },

  _updateTrashState: function() {
    this.$('#trash').toggleClass('empty', uiGlobals.uninstalledApps.length === 0);

    if (uiGlobals.uninstalledApps.length > 0) {
      this.$('#trash').removeClass('empty');

      this.$('#trash .trashed-apps').show();
      this.$('#trash .trashed-apps .number').text(uiGlobals.uninstalledApps.length);
    } else {
      this.$('#trash .trashed-apps').hide();
    }
  },

  _initSearchField: function() {
    var $body = $('body');

    function clearSearch() {
      uiGlobals.trigger('search', '');
      $('#search-form').removeClass('active');
      $('#search').val('');
      $('#search').blur();
    }

    // Search filtering is initialized inside the carousel
    $body.keypress(function(evt) {
      if (!this.myAppsCarousel.isAnimating()) {
        $('#search-form').addClass('active');
        $('#search').focus();
      }
    }.bind(this));

    // Body click sets blur on search
    // Need to route through tile in some cases
    // and blur event fires before click :-(
    $body.keyup((function(evt) {
      if (evt.which === 27) {
        clearSearch();
      } else if (evt.which === 13) {
        var visibleApps = this.myAppsCarousel.visibleApps();
        if (visibleApps.length === 1) {
          visibleApps[0].launch();
          clearSearch();
        }
      }
    }).bind(this));

    $body.on('keydown', '#search', function(evt) {
      if (this.myAppsCarousel.isAnimating()) {
        evt.preventDefault();
      }
    }.bind(this));

    $body.on('keyup', '#search', (function(evt) {
      uiGlobals.trigger('search', $('#search').val());
    }).bind(this));

    $body.click(function(evt) {
      var $target = $(evt.target);
      var $search = $('#search');

      if (!$target.is('.main-page') && !$target.is('.icon-search')) {
        return;
      }

      if (($search.val() !== '') || ($search.parent().is('.active'))) {
        clearSearch();
      } else if ($target.is('.icon-search')) {
        $('#search-form').addClass('active');
        $search.focus();
      }
    });
  },

  _setupResizeBehavior: function() {
    var $win = $(window);
    $win.resize(function() {
      var widthRatio = ($win.width() - config.Layout.minSlidePadding) / config.Layout.slideWidth;
      var heightRatio = ($win.height() - config.Layout.minSlidePadding) / config.Layout.slideHeight;
      uiGlobals.scaling = Math.min(1.2, widthRatio, heightRatio);
      this.myAppsCarousel.rescale();
    }.bind(this));
  },

  animateIn: function(){
    this.$('#header').delay(800).switchClass('initial', 'loaded', 250, 'easeInOutQuad');

    // hide().show() is fixing a ui bug where the top border would display across 2 pixels because of bad animation
    this.$('.footer.initial').delay(800).switchClass('initial', 'loaded', 250, 'easeInOutQuad').hide().show();
  }

});
