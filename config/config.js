var path = require('path');

var enumerable = require('../app/utils/enumerable.js');

var config = {

  oauth: {
    endpoint: 'https://central.leapmotion.com/oauth/',
    client_id: '73fde9aa45ef818ecb137aeacd886253',
    client_key: '8daf22818f30f4a9f86201d1b276b39c',
    redirect_uri: 'https://central.leapmotion.com/',
    log_out_url: 'https://central.leapmotion.com/users/sign_out',
    auth_token_expiration_time: 14 * 60000 // make sure this matches the central oauth config, currently 15 minutes - 14 to be safe
  },

  MixpanelToken: '77d363605f0470115eb82352f14b2981',

  AppListingEndpoint: 'https://warehouse.leapmotion.com/api/apps/myapps',

  PubnubSubscribeKey: 'sub-c-65b7dd2c-c255-11e2-883f-02ee2ddab7fe',

  NonStoreAppManifestUrl: 'https://lm-assets.s3.amazonaws.com/airspace-desktop/non-store-app-manifest-v2.json',

  DeviceDataEndpoint: 'https://central.leapmotion.com/users/device',

  SentryDSN: 'https://03b4e3bdfc974421860ef1a2747540b6:97e879a1dd80479f86c9780a415b0f80@app.getsentry.com/9610',

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
  },

  FrozenAppPaths: [
    '\\Program Files (x86)\\Leap Motion Apps\\PreBundle.LeapMotion',
    './PreBundle.LeapMotion'
  ]

};

if (process.env.LEAPHOME_ENV === 'test') {
  config.oauth.endpoint = 'http://localhost:9876/oauth/';
  config.oauth.log_out_url = 'http://localhost:9876/users/sign_out';
  config.AppListingEndpoint = 'http://localhost:9877/api/apps/myapps';
  config.NonStoreAppManifestUrl = 'http://localhost:9878/non-store-app-manifest.json';
}

module.exports = config;
