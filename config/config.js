var path = require('path');

var enumerable = require('../app/utils/enumerable.js');

var AppsDir = 'AirspaceApps';
var AppsUserDataDir = 'AirspaceApps';
var CENTRAL   = process.env.CENTRAL_URL   || 'https://central.leapmotion.com/';
var WAREHOUSE = process.env.WAREHOUSE_URL || 'https://warehouse.leapmotion.com/';
var AIRSPACE =  process.env.AIRSPACE_URL  || 'https://airspace.leapmotion.com/';

var config = {

  OsControlApps: '#touchless-windows,#bettertouchtool,#shortcuts',

  oauth: {
    endpoint: CENTRAL + 'oauth/',
    client_id: '73fde9aa45ef818ecb137aeacd886253',
    client_key: '8daf22818f30f4a9f86201d1b276b39c',
    redirect_uri: CENTRAL,
    log_out_url: CENTRAL + 'users/sign_out',
    log_in_url: CENTRAL + 'users/sign_in',
    sign_up_url: CENTRAL + 'users/sign_up',
    auth_token_expiration_time: 14 * 60000 // make sure this matches the central oauth config, currently 15 minutes - 14 to be safe
  },
  ghost_signup: CENTRAL + 'users/sign_in_as_ghost',

  AppListingEndpoint: WAREHOUSE + 'api/apps/myapps',
  AppJsonEndpoint: WAREHOUSE + 'api/apps/myapps/:id',

  AuthWithAccessTokenUrl: CENTRAL,

  AirspaceURL: AIRSPACE,

  // todo - test production by default.
  PubnubSubscribeKey: process.env.LEAPHOME_ENV == 'production' ?
                                'sub-c-65b7dd2c-c255-11e2-883f-02ee2ddab7fe' : // airspace T4 https://admin.pubnub.com/#/user/222170/app/219026
                                'sub-c-8603c6d4-c1b7-11e2-883f-02ee2ddab7fe', // My First PubNub App (1) - shared w/ dev and staging.

  NonStoreAppManifestUrl: WAREHOUSE + 'api/app_home_manifests/v4.json',

  DeviceDataEndpoint: CENTRAL + 'users/device',

  AppVersionDataEndpoint: WAREHOUSE + 'api/v1/app_installations',

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
    emptyMessageHeight: 112
  },

  ServerConnectRetryMs: 30 * 1000, // 30 seconds
  S3ConnectRetryMs: 10 * 1000, // 10 seconds
  FsScanIntervalMs: 5 * 1000, // 3 seconds
  AuthLoadTimeoutMs: 10 * 1000, // 30 seconds

  DownloadChunkSize: 1024 * 1024 * 5, // 5 MB

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
    DismissedNotifications: 'DismissedNotifications',
    LabOptionStates: 'LabOptionStates',
    PreviousLabOptionStates: 'PreviousLabOptionStates',
    SeenTutorialV2: 'SeenTutorialV2'
  },

  LabOptions: {
    'recent-launch-sort': 'Sort purchased apps by most-recently-launched first.'//,
//    'enable-leap-controls': 'Use your Leap Motion Controller to swipe between pages.'
    // Put experimental features here
  },

  NodePlatformToServerPlatform: {
    darwin: "osx",
    win32: "windows",
  },

  ServerPlatformToNodePlatform: {
    osx: "darwin",
    windows: "win32"
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

  PlatformOrientationPaths: {
    win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\Orientation\\Orientation.exe',
    darwin: '/Applications/Leap Motion Orientation.app'
  },

  PlatformControlPanelPaths: {
    win32: (process.env["PROGRAMFILES(X86)"] || process.env.PROGRAMFILES) + "\\Leap Motion\\Core Services\\LeapControlPanel.exe",
    darwin: '/Applications/Leap Motion.app'
  },

  CrashReportingDirs: {
    win32:  'C:\\Users\\All Users\\Leap Motion',
    darwin: process.env.HOME + '/Library/Application Support/Leap Motion',
    linux:  process.env.HOME + '/.Leap Motion'
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
    win32:  'C:\\Libraries-x86_vc141',
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
    'laptop',
    'keyboard',
  ],

  GettingStartedUrl: 'https://www.leapmotion.com/getting-started',
  GetSupportUrl: 'https://support.leapmotion.com/',
  CommunityForumsUrl: 'https://community.leapmotion.com',

  ModulePaths: {
//    LeapJs: '../../utils/leap.js',
    Pubnub: 'pubnub'
  }

};

module.exports = config;
