# Dev Notes

## Toolbar

Access the devtools window by clicking on the gear icon in the toolbar.

## Clearing persisted data
In console:

    window.localStorage.clear();


## Fake LeapApps

You can create some fake apps by pasting something like this into the console:


    var leapAppFactory = require('./test/support/leap-app-factory.js');
    var leapApps = global.uiGlobals.myApps;
    for (var i = 0; i < 4; i++) {
      leapApps.add(leapAppFactory.storeAppData());
    }
    leapApps.first().save();

