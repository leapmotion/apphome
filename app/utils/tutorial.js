var fs = require('fs');
var os = require('os');

var i18n = require('./i18n.js');
var config = require('../../config/config.js');
var mixpanel = require('./mixpanel.js');

function makeGuides() {
  guiders.createGuider({
    buttons: [{name: String(i18n.translate('Take a Quick Tour')), classString: 'primary', onclick: guiders.next}],
    classString: 'primary',
    description: String(i18n.translate('Airspace Home is the place to launch all of your Leap-powered apps.')),
    id: 'g_start',
    next: 'g_orientation',
    title: String(i18n.translate('Welcome to Airspace Home!')),
    xButton: true,
  }).show();

  guiders.createGuider({
    buttons: [{name: String(i18n.translate('Launch Orientation')), classString: 'next', onclick: function() { _launchOrientation(); setTimeout(guiders.next, 500); }}],
    description: String(i18n.translate("Check out Orientation to learn what the controller can do.")),
    id: 'g_orientation',
    next: 'g_apps',
    title: String(i18n.translate('Learn About the Controller')),
    attachTo: '#orientation',
    position: 6,
    highlight: '#orientation'
  });

  guiders.createGuider({
    buttons: [{name: String(i18n.translate('Back')), classString: 'back'}, {name: String(i18n.translate('Next')), classString: 'next'}],
    description: String(i18n.translate("Every tile is a unique Leap-enabled experience just one click away.")),
    id: 'g_apps',
    next: 'g_store',
    title: String(i18n.translate('Try out your new apps')),
    attachTo: '.tile.store', // picks the first one
    position: 6,
    highlight: '.tile.store'
  });

  guiders.createGuider({
    buttons: [{name: String(i18n.translate('Back')), classString: 'back'}, {name: String(i18n.translate('Done')), classString: 'primary', onclick: guiders.hideAll}],
    description: String(i18n.translate("Airspace Store is the place for you to discover and download new apps.")),
    id: 'g_store',
    title: String(i18n.translate('Discover new apps')),
    attachTo: '#airspace-store',
    position: 3,
    highlight: '#airspace-store'
  });
}

var _launchOrientation =  function() {
  var orientationPath = config.PlatformOrientationPaths[os.platform()];
  if (orientationPath && fs.existsSync(orientationPath)) {
    nwGui.Shell.openItem(orientationPath);
    mixpanel.trackEvent('Started Orientation', null, 'OOBE');
  }
};


module.exports.makeGuides = makeGuides;
