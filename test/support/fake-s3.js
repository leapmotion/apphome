var express = require('express');

var app = express();

var fakeNonStoreAppManifest = {
  "web": [
    {
      "name": "Airspace Store",
      "tileUrl": "https://lm-assets.s3.amazonaws.com/airspace-desktop/store-tile.png?v=2",
      "iconUrl": "https://lm-assets.s3.amazonaws.com/airspace-desktop/store-icon.png?v=2",
      "urlToLaunch": "https://airspace.leapmotion.com/",
      "passAccessToken": true,
      "deletable": false,
      "eventToTrack": "AirspaceStoreTileClick"
    },
    {
      "name": "Feedback",
      "tileUrl": "https://lm-assets.s3.amazonaws.com/airspace-desktop/community-tile.png?v=2",
      "iconUrl": "https://lm-assets.s3.amazonaws.com/airspace-desktop/community-icon.png?v=2",
      "urlToLaunch": "http://central.leapmotion.com/uservoice",
      "passAccessToken": true,
      "deletable": false,
      "eventToTrack": "CommunityTileClick"
    }
  ],

  "windows": [
    {
      "name": "Google Earth",
      "minVersion": "7.1",
      "relativeExePath": "client\\googleearth.exe"
    }
  ],

  "osx": [
    {
      "name": "Google Earth",
      "minVersion": "7.1"
    }
  ]
};

app.get('/non-store-app-manifest.json', function(req, res) {
  res.json(200, fakeNonStoreAppManifest);
});

module.exports = app;
