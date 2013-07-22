var async = require('async');
var os = require('os');

var popupWindow = require('../../utils/popup-window.js');
var embeddedLeap = require('../../utils/embedded-leap.js');
var db = require('../../utils/db.js');
var mixpanel = require('../../utils/mixpanel.js');
var config = require('../../../config/config.js');

var StaticHtml = '/static/popups/first-run.html';

var PlatformOrientationPaths = {
  win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\Orientation\\Orientation.exe',
  darwin: '/Applications/Leap Motion Orientation.app'
};

var firstRunSplash;
var isEmbeddedLeap;

var FirstRunSequence = {
  embeddedLeapCheck: function(cb) {
    embeddedLeap.embeddedLeapPromise().done(function(isEmbedded) {
      isEmbeddedLeap = isEmbedded;
      cb && cb(null);
    });
  },

  showFirstRunSplash: function(cb) {
    firstRunSplash = popupWindow.open(StaticHtml, {
      width: 1080,
      height: 638,
      frame: false,
      resizable: false,
      show: false,
      'always-on-top': false
    });
    WelcomeSplash.setupBindings(cb);
  },

  launchOrientation: function(cb) {
    var orientationPath = PlatformOrientationPaths[os.platform()];
    if (orientationPath) {
      var $s = $('body', firstRunSplash.window.document);
      $s.css('cursor', 'wait');
      mixpanel.trackEvent('Started Orientation', null, 'OOBE');
      setTimeout(function() {
        $s.css('cursor', 'default');
        var $graphic = $s.hasClass('embedded') ? $s.find('#embedded-graphics') : $s.find('#peripheral-graphics');
        $graphic.effect("blind");
        var $continueButton = $('#continue', firstRunSplash.window.document);
        $continueButton.removeClass('disabled');
        $continueButton.text('Launch Airspace');
        $('h1', firstRunSplash.window.document).text('Airspace, the Leap Motion app store');
        $('h2', firstRunSplash.window.document).text('Discover, download and launch your Leap Motion apps from Airspace - the first-ever place for first-ever apps.');

        $continueButton.click(function() {
          firstRunSplash.close();
          firstRunSplash = null;
          mixpanel.trackEvent('Completed Orientation', null, 'OOBE');
          mixpanel.trackEvent('Airspace Auto-Launched', null, 'OOBE');
          cb && cb(null);
        }.bind(this));
      }.bind(this), 5000);
      nwGui.Shell.openItem(orientationPath);
    } else {
      cb && cb(null);
    }
  }
};



var WelcomeSplash = {
  setupBindings: function(cb) {
    firstRunSplash.on('loaded', function() {
      var splashWindow = firstRunSplash.window;
      var $s = $('body', splashWindow.document);
      $s.css('cursor', 'default');

      var $continueButton = $s.find('#continue');
      if (isEmbeddedLeap) { // EULA required only on hardware embedded with leap. (user didn't run installer so we need to handle the license agreement.)
        $s.addClass('embedded');
        $continueButton.addClass('disabled'); // todo: when fs determines user already agreed to eula, hide eula and do not disable the button
      }

      var $checkbox = $s.find('.eula .checkbox');
      $checkbox.change(function(evt) {
        $continueButton.toggleClass('disabled', !$checkbox.is(':checked'));
      });

      $continueButton.click(function() {
        if ($continueButton.hasClass('disabled')) {
          $s.find('.eula').effect('highlight', '', 1000);
          return;
        }
        $continueButton.addClass('disabled');
        db.setItem(config.DbKeys.AlreadyDidFirstRun, true);
        $s.find('.eula').css('visibility', 'hidden');
        mixpanel.trackEvent('Finished First Run Panel', null, 'OOBE');
        $continueButton.unbind('click');
        cb && cb(null);
      });

      $s.find('.eula-popup').click(function() {
        var eulaWindow = popupWindow.open('/static/popups/license-en.html', {
          title: 'Leap Motion End User Software License Agreement',
          width: 640,
          height: 480,
          frame: true,
          resizable: true,
          show: true,
          x: 50,
          y: 50,
          allowMultiple: false
        });
      });

      $s.find('.close-app').click(function() {
        window.close();
      });

      splashWindow.setTimeout(function() {
        firstRunSplash.show();
        mixpanel.trackEvent('Displayed First Run Panel', null, 'OOBE');
      }, 0);

    });
  }
};

function showFirstRunSequence(cb) {
  async.series([
    // this._checkEulaState.bind(this), to be restored after pongo/media launch, for next embedded system (to avoid eula if user already signed it)
    FirstRunSequence.embeddedLeapCheck,
    FirstRunSequence.showFirstRunSplash,
    FirstRunSequence.launchOrientation
  ], function(err) {
    if (err) {
      console.error('Welcome failed: ' + (err.stack || err));
      if (!isEmbeddedLeap || !db.getItem(config.DbKeys.AlreadyDidFirstRun)) {
        err = null; // must ensure eula agreement, otherwise tolerate failed welcome message
      }
    }
    cb && cb(err);
  });

}

module.exports.showFirstRunSequence = showFirstRunSequence;
