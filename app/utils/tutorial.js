var i18n = require('./i18n.js');

function makeGuides() {
    guiders.createGuider({
        buttons: [{name: 'Take a Quick Tour', classString: 'primary', onclick: guiders.next}],
        description: 'Airspace Home is the place to launch all of your Leap-powered apps.',
        id: 'g_start',
        next: 'g_apps',
        title: 'Welcome to Airspace Home!',
        xButton: true,
    }).show();

    guiders.createGuider({
        buttons: [{name: 'Next', classString: 'next'}],
        description: "We thought you would like to dive right in, so we handpicked some free apps for you.",
        id: 'g_apps',
        next: 'g_orientation',
        title: 'Experience the Controller',
        attachTo: '#boom-ball',
        position: 3,
        highlight: '#boom-ball'
    });

    guiders.createGuider({
        buttons: [{name: 'Back', classString: 'back'}, {name: 'Next', classString: 'next'}],
        description: "Want to learn more about the Leap device's capabilities?  Go through a quick orientation to learn first hand.",
        id: 'g_orientation',
        next: 'g_store',
        title: 'Understand the Device',
        attachTo: '#orientation',
        position: 6,
        highlight: '#orientation'
    });

    guiders.createGuider({
        buttons: [{name: 'Back', classString: 'back'}, {name: 'Done', classString: 'primary', onclick: guiders.hideAll}],
        description: "Airspace Store is the place for you to discover and download new apps.",
        id: 'g_store',
        title: 'Discover New Apps!',
        attachTo: '#airspace-store',
        position: 3,
        highlight: '#airspace-store'
    });
}


module.exports.makeGuides = makeGuides;
