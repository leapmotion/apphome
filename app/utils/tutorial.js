var i18n = require('./i18n.js');

function makeGuides() {
    guiders.createGuider({
        buttons: [{name: String(i18n.translate('Take a Quick Tour')), classString: 'primary', onclick: guiders.next}],
        classString: 'primary',
        description: String(i18n.translate('Airspace Home is the place to launch all of your Leap-powered apps.')),
        id: 'g_start',
        next: 'g_apps',
        title: String(i18n.translate('Welcome to Airspace Home!')),
        xButton: true,
    }).show();

    guiders.createGuider({
        buttons: [{name: String(i18n.translate('Next')), classString: 'next'}],
        description: String(i18n.translate("We thought you would like to dive right in, so we handpicked some free apps for you.")),
        id: 'g_apps',
        next: 'g_orientation',
        title: String(i18n.translate('Experience the Controller')),
        attachTo: '#froggle',
        position: 3,
        highlight: '#froggle'
    });

    guiders.createGuider({
        buttons: [{name: String(i18n.translate('Back')), classString: 'back'}, {name: String(i18n.translate('Next')), classString: 'next'}],
        description: String(i18n.translate("Want to learn more about the Leap device's capabilities?  Go through a quick orientation to learn first hand.")),
        id: 'g_orientation',
        next: 'g_store',
        title: String(i18n.translate('Understand the Device')),
        attachTo: '#orientation',
        position: 6,
        highlight: '#orientation'
    });

    guiders.createGuider({
        buttons: [{name: String(i18n.translate('Back')), classString: 'back'}, {name: String(i18n.translate('Done')), classString: 'primary', onclick: guiders.hideAll}],
        description: String(i18n.translate("Airspace Store is the place for you to discover and download new apps.")),
        id: 'g_store',
        title: String(i18n.translate('Discover New Apps!')),
        attachTo: '#airspace-store',
        position: 3,
        highlight: '#airspace-store'
    });
}


module.exports.makeGuides = makeGuides;
