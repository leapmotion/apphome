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

  AppListingEndpoint: 'https://warehouse.leapmotion.com/api/apps/myapps',
  AppDetailsEndpoint: 'https://warehouse.leapmotion.com/api/apps/:id/homebase/:platform',

  AuthWithAccessTokenUrl: 'https://central.leapmotion.com/',

  PubnubSubscribeKey: 'sub-c-65b7dd2c-c255-11e2-883f-02ee2ddab7fe',

  NonStoreAppManifestUrl: 'https://lm-assets.s3.amazonaws.com/airspace-desktop/non-store-app-manifest-v2.json',

  DeviceDataEndpoint: 'https://central.leapmotion.com/users/device',

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
    slidePeekDistance: 0,
    nextSlideHeight: 624,
    nextSlideOffset: 16,
    minSlidePadding: 200,
    emptyMessageHeight: 32
  },

  ServerConnectRetryMs: 30 * 1000, // 30 seconds
  FsScanIntervalMs: 60, //* 60 * 1000, // 1 hour
  AuthLoadTimeoutMs: 30 * 1000, // 30 seconds

  DbKeys: {
    AlreadyDidFirstRun: 'AlreadyDidFirstRun',
    OauthRefreshToken: 'OauthRefreshToken',
    InstalledApps: 'InstalledApps',
    UninstalledApps: 'UninstalledApps',
    HasEmbeddedLeapDevice: 'HasEmbeddedLeapDevice',
    PrebundlingComplete: 'PrebundlingComplete',
    OriginalPrebundlingManifest: 'OriginalPrebundlingManifest',
    DbVersion: 'DatabaseSchemaVersion',
    CrashCount: 'crashCount',
    ActiveTempFilesKey: 'active_temp_files',
    TempFilesNeedingDeletionKey: 'temp_files_needing_deletion',
    MixpanelDistinctId: 'MixpanelDistinctId'
  },

  PlatformDirs: {
    win32: process.env.LOCALAPPDATA || process.env.APPDATA || '',
    darwin: process.env.HOME + '/Library/Application Support',
    linux: process.env.HOME + '/.config'
  },

  PlatformLeapDataDirs: {
    win32:  process.env.APPDATA + '\\Leap Motion',
    darwin: process.env.HOME + '/Library/Application Support/Leap Motion',
    linux:  process.env.HOME + '/.config/Leap Motion'
  },

  PlatformTempDirs: {
    win32:  process.env.TEMP + '\\LM_Airspace',
    darwin: '/tmp/LM_Airspace',
    linux:  '/tmp/LM_Airspace'
  },

  PlatformProgramDataDirs: {
    win32:  [ process.env.PROGRAMDATA, 'Leap Motion' ]
  },

  UserHomeDirs: {
    'win32': process.env.USERPROFILE,
    'darwin': process.env.HOME,
    'linux': process.env.HOME
  },

  FrozenAppPaths: [
    '\\Program Files (x86)\\Leap Motion Apps\\PreBundle.LeapMotion',
    './PreBundle.LeapMotion'
  ],

  GettingStartedUrl: 'https://www.leapmotion.com/getting-started',

  ModulePaths: {
//    LeapJs: '../../utils/leap.js',
    Pubnub: 'pubnub'
  }

};

module.exports = config;
