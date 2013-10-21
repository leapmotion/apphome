var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');

var config = require('../../../../config/config.js');
var db = require('../../../utils/db.js');
var embeddedLeap = require('../../../utils/embedded-leap.js');
var eula = require('../../../utils/eula.js');
var i18n = require('../../../utils/i18n.js');
var mixpanel = require('../../../utils/mixpanel.js');
var popup = require('../popup.js');
var shell = require('../../../utils/shell.js');

var BaseView = require('../../base-view.js');

var PlatformOrientationPaths = {
  win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\Orientation\\Orientation.exe',
  darwin: '/Applications/Leap Motion Orientation.app'
};

module.exports = BaseView.extend({

  viewDir: __dirname,

  options: {
    title: i18n.translate('Welcome'),
    width: 1080,
    height: 638,
    frame: false,
    show: false
  },

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml({
      headerStage1_label:    i18n.translate('Welcome to a whole new world'),
      subheaderStage1_label: i18n.translate('Below are a few tips to get you started'),
      headerStage2_label:    i18n.translate('Airspace, the Leap Motion app store'),
      subheaderStage2_label: i18n.translate('Discover, download, and launch your Leap Motion apps from Airspace - the first-ever place for first-ever apps.'),
      continue_label:        i18n.translate('Continue'),
      launchAirspace_label:  i18n.translate('Launch Airspace')
    }));
    this.$el.addClass('stage1');

    embeddedLeap.embeddedLeapPromise().done(function(isEmbedded) {
      this.$el.toggleClass('embedded', isEmbedded);
      this.$('#continue').toggleClass('disabled', isEmbedded);
      this._setupBindings(isEmbedded);
      this.options.nwWindow.show();
    }.bind(this));
  },

  _setupBindings: function(isEmbedded) {
    var didLaunchOrientation;
    var $continue = this.$('#continue');

    this.$('.close-app').click(function() {
      nwGui.App.quit();
    });

    if (isEmbedded) {
      $continue.addClass('disabled');
      this.$el.find('img.graphic.second').hide();
      eula.waitForLicense((function() {
        this.$('img.graphic.first').hide();
        this.$('img.graphic.second').show();
        $continue.removeClass('disabled');
      }).bind(this));
    }

    $continue.click(function() {
      if ($continue.hasClass('disabled')) {
        return;
      }
      $continue.unbind('click');
      $continue.addClass('disabled');
      didLaunchOrientation = this._launchOrientation();
      setTimeout(function() {
        this.$el.removeClass('launching-orientation');
        this.$el.removeClass('stage1');
        this.$el.addClass('stage2');
      }.bind(this), didLaunchOrientation ? 5000 : 0);
    }.bind(this));

    this.$('#launch-airspace').click(function() {
      this._afterOrientationLaunch(didLaunchOrientation);
      this.options.nwWindow.close();
    }.bind(this));
  },

  _launchOrientation: function() {
    var orientationPath = PlatformOrientationPaths[os.platform()];
    if (orientationPath && fs.existsSync(orientationPath)) {
      this.$el.addClass('launching-orientation');
      nwGui.Shell.openItem(orientationPath);
      mixpanel.trackEvent('Started Orientation', null, 'OOBE');
      return true;
    } else {
      return false;
    }
  },

  _afterOrientationLaunch: function(didLaunchOrientation) {
    if (didLaunchOrientation) {
      mixpanel.trackEvent('Completed Orientation', null, 'OOBE');
    }
    mixpanel.trackEvent('Airspace Auto-Launched', null, 'OOBE');
  }

});
