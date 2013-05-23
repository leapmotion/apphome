var path = require('path');

var enumerable = require('../app/utils/enumerable.js');

function staticImage(subdir, name) {
  return path.join(__dirname, '..', 'static', 'images', subdir, name);
}

var config = {

  oauth: {
    endpoint: 'http://leapweb-stage7.herokuapp.com/oauth/',
    client_id: '73fde9aa45ef818ecb137aeacd886253',
    client_key: '8daf22818f30f4a9f86201d1b276b39c',
    redirect_uri: 'http://leapweb-stage7.herokuapp.com/'
  },

  AppSubdir: {
    AppIcons: 'app_icons',
    AppTiles: 'app_tiles'
  },

  BuiltinTiles: [
    {
      name: 'Visit App Store',
      tilePath:  staticImage('tiles', 'store-tile.png'),
      iconPath:  staticImage('icons', 'store-icon.png'),
      launchCallback: function() {
        nwGui.Shell.openExternal('https://www.leapmotion.com/apps');
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
    minSlidePadding: 200
  }

};

module.exports = config;
