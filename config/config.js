var path = require('path');

var enumerable = require('../app/utils/enumerable.js');

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

  NonStoreAppManifestUrl: 'https://lm-assets.s3.amazonaws.com/airspace-desktop/non-store-app-manifest.json',

  AppSubdir: {
    AppIcons: 'app_icons',
    AppTiles: 'app_tiles'
  },

  LocalAppTilePath: path.resolve(__dirname, '../static/images/tiles/default-tile.png'),
  DefaultTilePath: path.resolve(__dirname, '../static/images/tiles/downloading-tile.png'),

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
  AuthLoadTimeoutMs: 30 * 1000, // 30 seconds

  DbKeys: {
    AlreadyDidFirstRun: 'AlreadyDidFirstRun',
    OauthRefreshToken: 'OauthRefreshToken',
    InstalledApps: 'InstalledApps',
    UninstalledApps: 'UninstalledApps'
  },

  PlatformDirs: {
    win32: process.env.LOCALAPPDATA || process.env.APPDATA || '',
    darwin: process.env.HOME + '/Library/Application Support',
    linux: process.env.HOME + '/.config'
  }

};

module.exports = config;
