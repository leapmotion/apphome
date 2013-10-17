var i18n = require('./i18n.js');

function makeGuides() {
    guiders.createGuider({
        buttons: [{name: 'Take a Quick Tour', onclick: guiders.next}],
        description: 'Airspace Home is the place to launch all of your Leap-powered apps.',
        id: 'start',
        next: 'store',
        title: 'Welcome to Airspace Home!',
        xButton: true,
    }).show();

    guiders.createGuider({
        buttons: [{name: 'Next'}],
        description: "Airspace Store is the place for you to discover and download new apps.",
        id: 'store',
        title: 'Discover New Apps!',
        attachTo: '#airspace-store',
        position: 3,
        highlight: '#airspace-store'
    });
}


module.exports.makeGuides = makeGuides;
