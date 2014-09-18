// Generated by CoffeeScript 1.7.1
(function() {
  var config, fs, ga, guidesMade, i18n, makeGuides, oauth, onClose, os, qs, start, _launchOrientation;

  fs = require('fs');

  os = require('os');

  oauth = require('./oauth.js');

  qs = require('querystring');

  i18n = require('./i18n.js');

  config = require('../../config/config.js');

  ga = require('./ga.js');

  guidesMade = false;

  makeGuides = function() {
    var _resizing;
    guiders.createGuider({
      buttons: [
        {
          name: String(i18n.translate('Launch Playground')),
          classString: 'orientation fa fa-rocket',
          onclick: function() {
            _launchOrientation();
            return setTimeout(function() {
              return guiders.next();
            }, 1000);
          }
        }, {
          name: String(i18n.translate('Next')),
          classString: 'next',
          onclick: guiders.next
        }
      ],
      title: String(i18n.translate("Tip 1: Leap Motion Basics")),
      description: String(i18n.translate("Learn the basics of how to use the Leap Motion Controller by going through Playground.")),
      id: 'g_orientation',
      next: 'g_apps',
      heading: String(i18n.translate('Welcome to Leap Motion App Home')),
      attachTo: '#playground',
      position: 6,
      onClose: onClose
    });
    guiders.createGuider({
      buttons: [
        {
          name: String(i18n.translate('Launch Shortcuts')),
          classString: 'orientation fa fa-rocket guiders_app_button',
          onclick: function() {
            $(this).remove();
            return $('#shortcuts').click();
          }
        }, {
          name: String(i18n.translate('Back')),
          classString: 'back',
          onclick: guiders.prev
        }, {
          name: String(i18n.translate('Next')),
          classString: 'next',
          onclick: guiders.next
        }
      ],
      title: String(i18n.translate("Tip 2: Starter Apps")),
      description: String(i18n.translate("We thought you’d like to dive right in, so we handpicked some free apps for you.")),
      appDescription: String(i18n.translate("Try the Shortcuts app first and control your music, scrolling, and desktop windows in a brand new way!")),
      id: 'g_apps',
      next: 'g_store',
      attachTo: '#shortcuts',
      attachToAlternative: '.tile.store:first',
      position: 6,
      onClose: onClose
    });
    guiders.createGuider({
      buttons: [
        {
          name: String(i18n.translate('Back')),
          classString: 'back',
          onclick: guiders.prev
        }, {
          name: String(i18n.translate('Launch App Store')),
          classString: 'primary',
          onclick: function() {
            oauth.getAccessToken(function(err, accessToken) {
              if (!err) {
                return nwGui.Shell.openExternal(config.AuthWithAccessTokenUrl + '?' + qs.stringify({
                  access_token: accessToken,
                  _r: config.AirspaceURL
                }));
              }
            });
            return guiders.hideAll();
          }
        }
      ],
      title: String(i18n.translate("Tip 3: Ready for More?")),
      description: String(i18n.translate("Visit the App Store to discover and download 200+ games, educational tools, and music apps, and more.")),
      id: 'g_store',
      title: String(i18n.translate('Discover new apps')),
      attachTo: '#leap-motion-app-store',
      position: 3,
      onClose: onClose,
      onHide: function() {
        ga.trackEvent('tutorial/oobe/finished');
        return uiGlobals.inTutorial = false;
      }
    });
    _resizing = void 0;
    $(window).resize(function() {
      if (_resizing != null) {
        clearTimeout(_resizing);
      }
      return _resizing = setTimeout(function() {
        _resizing = void 0;
        if (typeof guiders !== "undefined" && guiders !== null) {
          return guiders.reposition();
        }
      }, 20);
    });
    return guidesMade = true;
  };

  onClose = function() {
    ga.trackEvent('tutorial/oobe/closed');
    return uiGlobals.inTutorial = false;
  };

  _launchOrientation = function() {
    var orientationPath;
    orientationPath = config.PlatformOrientationPaths[os.platform()];
    if (orientationPath && fs.existsSync(orientationPath)) {
      nwGui.Shell.openItem(orientationPath);
      return ga.trackEvent('tutorial/oobe/started_orientation');
    }
  };

  start = function() {
    if (!guidesMade) {
      makeGuides();
    }
    if (!uiGlobals.inTutorial) {
      uiGlobals.inTutorial = true;
      uiGlobals.trigger('goto', 0);
      return guiders.show('g_orientation');
    }
  };

  module.exports.start = start;

}).call(this);
