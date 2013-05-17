# Dev Notes

## Toolbar

Access the devtools window by clicking on the gear icon in the toolbar.

You can temporarily enable the toolbar in package.json, or [TODO: figure out command line switch]


## Clearing persisted data
In console:

    window.localStorage.clear();


## Fake LeapApps

You can create some fake apps by pasting something like this into the console:


    var leapAppFactory = require('./test/support/leap-app-factory.js');
    var leapApps = global.uiGlobals.leapApps;
    for (var i = 0; i < 4; i++) {
      leapApps.add(leapAppFactory.storeAppData());
      leapApps.add(leapAppFactory.localAppData());
    }
    leapApps.first().save();

