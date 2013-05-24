var path = require('path');

var enumerable = require('../app/utils/enumerable.js');

function staticImage(subdir, name) {
  return path.join(__dirname, '..', 'static', 'images', subdir, name);
}

var config = {

  oauth: {
    endpoint: 'http://stage7.leapmotion.com/oauth/',
    client_id: '73fde9aa45ef818ecb137aeacd886253',
    client_key: '8daf22818f30f4a9f86201d1b276b39c',
    redirect_uri: 'http://leapweb-stage7.herokuapp.com/'
  },

  AppListingEndpoint: 'https://leap:200hands500fingers@warehouse-stage.leapmotion.com/api/apps/myapps?access_token=',

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
        nwGui.Shell.openExternal('https://apps.leapmotion.com/');
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

  ServerPollIntervalMs: 15 * 1000, // 15 seconds
  FsScanIntervalMs: 60 * 60 * 1000 // 1 hour

};

module.exports = config;
