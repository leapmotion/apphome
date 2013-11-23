var fs = require('fs');
var os = require('os');

var i18n = require('./i18n.js');
var config = require('../../config/config.js');
var mixpanel = require('./mixpanel.js');

var guidesMade = false;

function makeGuides() {
  if (uiGlobals.inTutorial) {
    return;
  } else {
    uiGlobals.inTutorial = true;
  }

  guiders.createGuider({
    buttons: [{name: String(i18n.translate('Take a quick tour')), classString: 'primary', onclick: guiders.next}],
    classString: 'primary',
    description: String(i18n.translate('Launch all of your Leap Motion-powered apps and access the store to discover new ones.')),
    id: 'g_start',
    next: 'g_orientation',
    title: String(i18n.translate('Welcome to Airspace Home!')),
    xButton: true,
    onClose: onClose
  });

  guiders.createGuider({
    buttons: [{name: String(i18n.translate('Launch Orientation')), classString: 'next', onclick: function() { _launchOrientation();
      var tilesReady = setInterval(function() {
        if ($('.tile.store').length) {
          clearInterval(tilesReady);
          guiders.next();
        }
      }, 50);
    }}],
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
    buttons: [{name: String(i18n.translate('Back')), classString: 'back', onclick: guiders.prev}, {name: String(i18n.translate('Next')), classString: 'next', onclick: guiders.next}],
    description: String(i18n.translate("We've set you up with some great apps for free to get you started. It's time to play, create, and explore.")),
    id: 'g_apps',
    next: 'g_store',
    title: String(i18n.translate('Try your new apps')),
    attachTo: '.tile.store', // picks the first one
    position: 6,
    highlight: '.tile.store',
    onClose: onClose
  });

  guiders.createGuider({
    buttons: [{name: String(i18n.translate('Back')), classString: 'back', onclick: guiders.prev}, {name: String(i18n.translate('Done')), classString: 'primary', onclick: guiders.hideAll}],
    description: String(i18n.translate("Airspace Store is the place for you to browse and download the latest games, creative tools, and more.")),
    id: 'g_store',
    title: String(i18n.translate('Discover new apps')),
    attachTo: '#airspace-store',
    position: 3,
    highlight: '#airspace-store',
    onClose: onClose,
    onHide: function() {
      mixpanel.trackEvent('Tutorial Finished', null, 'OOBE');
      uiGlobals.inTutorial = false;
    }
  });

  guidesMade = true;
}

function onClose() {
  mixpanel.trackEvent('Tutorial Closed', null, 'OOBE');
  uiGlobals.inTutorial = false;
}

var _launchOrientation =  function() {
  var orientationPath = config.PlatformOrientationPaths[os.platform()];
  if (orientationPath && fs.existsSync(orientationPath)) {
    nwGui.Shell.openItem(orientationPath);
    mixpanel.trackEvent('Started Orientation', null, 'OOBE');
  }
};

var start = function() {
  if (!guidesMade) {
    makeGuides();
  }

  guiders.show('g_start');
};


module.exports.start = start;
