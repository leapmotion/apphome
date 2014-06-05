// Generated by CoffeeScript 1.6.3
(function() {
  var config, fs, ga, guidesMade, i18n, makeGuides, onClose, os, start, _launchOrientation;

  fs = require('fs');

  os = require('os');

  i18n = require('./i18n.js');

  config = require('../../config/config.js');

  ga = require('./ga.js');

  guidesMade = false;

  makeGuides = function() {
    var _resizing;
    guiders.createGuider({
      buttons: [
        {
          name: String(i18n.translate('Take a quick tour')),
          classString: 'primary',
          onclick: guiders.next
        }
      ],
      classString: 'primary',
      description: String(i18n.translate('Launch all of your Leap Motion-powered apps and access the store to discover new ones.')),
      id: 'g_start',
      next: 'g_orientation',
      title: String(i18n.translate('Welcome to Airspace Home!')),
      xButton: true,
      onClose: onClose
    });
    guiders.createGuider({
      buttons: [
        {
          name: String(i18n.translate('Launch Orientation')),
          classString: 'next',
          onclick: function() {
            var tilesReady;
            _launchOrientation();
            return tilesReady = setInterval(function() {
              if ($('.tile.store').length) {
                clearInterval(tilesReady);
                return guiders.next();
              }
            }, 50);
          }
        }
      ],
      description: String(i18n.translate("Reach out and experience what your device can do with the Orientation app.")),
      id: 'g_orientation',
      next: 'g_apps',
      title: String(i18n.translate('Learn About the Controller')),
      attachTo: '#orientation',
      position: 6,
      highlight: '#orientation',
      onClose: onClose
    });
    guiders.createGuider({
      buttons: [
        {
          name: String(i18n.translate('Back')),
          classString: 'back',
          onclick: guiders.prev
        }, {
          name: String(i18n.translate('Next')),
          classString: 'next',
          onclick: guiders.next
        }
      ],
      description: String(i18n.translate("We've set you up with some great apps for free to get you started. It's time to play, create, and explore.")),
      id: 'g_apps',
      next: 'g_store',
      title: String(i18n.translate('Try your new apps')),
      attachTo: '.tile.store',
      position: 6,
      highlight: '.tile.store',
      onClose: onClose
    });
    guiders.createGuider({
      buttons: [
        {
          name: String(i18n.translate('Back')),
          classString: 'back',
          onclick: guiders.prev
        }, {
          name: String(i18n.translate('Done')),
          classString: 'primary',
          onclick: guiders.hideAll
        }
      ],
      description: String(i18n.translate("Airspace Store is the place for you to browse and download the latest games, creative tools, and more.")),
      id: 'g_store',
      title: String(i18n.translate('Discover new apps')),
      attachTo: '#airspace-store',
      position: 3,
      highlight: '#airspace-store',
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
      return guiders.show('g_start');
    }
  };

  module.exports.start = start;

}).call(this);

/*
//@ sourceMappingURL=tutorial.map
*/
