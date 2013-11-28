var path = require('path');

var enumerable = require('../app/utils/enumerable.js');

var AppsDir = 'AirspaceApps';
var AppsUserDataDir = 'AirspaceApps';

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

  AppVersionDataEndpoint: 'https://warehouse.leapmotion.com/api/v1/app_installations',

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
    slideHeight: 624,
    slidePeekDistance: -50,
    nextSlideHeight: 624,
    nextSlideOffset: 16,
    minSlidePadding: 200,
    emptyMessageHeight: 32
  },

  ServerConnectRetryMs: 30 * 1000, // 30 seconds
  S3ConnectRetryMs: 10 * 1000, // 10 seconds
  FsScanIntervalMs: 5 * 1000, // 3 seconds
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
    MixpanelDistinctId: 'MixpanelDistinctId',
    AppInstallDir: 'AppInstallDir',
    EmbeddedLeapDevice: 'EmbeddedLeapDevice',
    ViewedNotifications: 'ViewedNotifications',
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

  PlatformOrientationPaths: {
    win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\Orientation\\Orientation.exe',
    darwin: '/Applications/Leap Motion Orientation.app'
  },

  CrashReportingDirs: {
    win32:  'C:\\Users\\All Users\\Leap Motion',
    darwin: process.env.HOME + '/Library/Application Support/Leap Motion',
    linux:  process.env.HOME + '/.config/Leap Motion'
  },

  UserHomeDirs: {
    win32: process.env.USERPROFILE,
    darwin: process.env.HOME,
    linux: process.env.HOME
  },

  PlatformAppDirs: {
    win32:  [ process.env.LOCALAPPDATA || process.env.USERPROFILE, AppsDir ],
    darwin: [ process.env.HOME, 'Applications', AppsDir ],
    linux:  [ process.env.HOME, AppsDir ]
  },

  PlatformUserDataDirs: {
    win32:  [ process.env.APPDATA, AppsUserDataDir ],
    darwin: [ process.env.HOME, 'Library', 'Application Support', AppsUserDataDir ],
    linux:  [ process.env.HOME, '.config', AppsUserDataDir ]
  },

  PlatformLibrariesDir: {
    win32:  'C:\\Libraries-x86',
    darwin: '/opt/local/Libraries',
    linux:  '/opt/local/Libraries',
  },

  PlatformSuffixes: {
    win32:  'win-ia32/nw.exe',
    darwin: 'osx-ia32/node-webkit.app/Contents/MacOS/node-webkit',
    linux:  'linux-ia32/nw'
  },

  FrozenAppPaths: [
    '\\Program Files (x86)\\Leap Motion Apps\\PreBundle.LeapMotion',
    './PreBundle.LeapMotion'
  ],

  EmbeddedLeapTypes: [
    'pongo',
    'hops'
  ],

  GettingStartedUrl: 'https://www.leapmotion.com/getting-started',
  GetSupportUrl: 'https://airspace.leapmotion.com/apps/support',
  CommunityForumsUrl: 'https://community.leapmotion.com',

  ModulePaths: {
//    LeapJs: '../../utils/leap.js',
    Pubnub: 'pubnub'
  }

};

module.exports = config;
