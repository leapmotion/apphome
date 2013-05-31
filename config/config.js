var path = require('path');

var enumerable = require('../app/utils/enumerable.js');

function staticImage(subdir, name) {
  return path.join(__dirname, '..', 'static', 'images', subdir, name);
}

var config = {

  oauth: {
    endpoint: 'https://central.leapmotion.com/oauth/',
    client_id: '73fde9aa45ef818ecb137aeacd886253',
    client_key: '8daf22818f30f4a9f86201d1b276b39c',
    redirect_uri: 'https://central.leapmotion.com/',
    log_out_url: 'https://central.leapmotion.com/users/sign_out'
  },

  AppListingEndpoint: 'https://warehouse.leapmotion.com/api/apps/myapps',

  PubnubSubscribeKey: 'sub-c-65b7dd2c-c255-11e2-883f-02ee2ddab7fe',

  LocalAppManifestUrl: 'https://gist.github.com/paulbaumgart/881a98757dcde29fde79/raw/85a97868924e29ef6212a9f2abf43707b58a6e9e/gistfile1.json',

  AppSubdir: {
    AppIcons: 'app_icons',
    AppTiles: 'app_tiles'
  },

  BuiltinTiles: [
    {
      name: 'App Store',
      tilePath:  staticImage('tiles', 'store-tile.png'),
      iconPath:  staticImage('icons', 'store-icon.png'),
      launchCallback: function() {
        nwGui.Shell.openExternal('https://airspace.leapmotion.com/');
      }
    },
    {
      name: 'Leap Community',
      tilePath:  staticImage('tiles', 'community-tile.png'),
      iconPath:  staticImage('icons', 'community-icon.png'),
      launchCallback: function() {
        nwGui.Shell.openExternal('https://forums.leapmotion.com/forum.php');
      }
    }
  ],

  Defaults: {
    IconPath: staticImage('icons', 'default-icon.png'),
    TilePath: staticImage('tiles', 'default-tile.png')
  },

  Layout: {
    columnsPerSlide: 4,
    rowsPerSlide: 3,
    slideWidth: 1410,
    slideHeight: 702,
    slidePeekDistance: 50,
    minSlidePadding: 200,
    emptyMessageHeight: 32
  },

  ServerConnectRetryMs: 30 * 1000, // 30 seconds
  FsScanIntervalMs: 60 * 60 * 1000, // 1 hour
  AuthLoadTimeoutMs: 10 * 1000, // 10 seconds

  DbKeys: {
    AlreadyDidFirstRun: 'AlreadyDidFirstRun',
    OauthRefreshToken: 'OauthRefreshToken',
    InstalledApps: 'InstalledApps',
    UninstalledApps: 'UninstalledApps'
  }

};

module.exports = config;
