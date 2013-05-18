var enumerable = require('../app/utils/enumerable.js');
var config = {
  VisitStoreUrl: 'https://www.leapmotion.com/apps',

  oauth: {
    endpoint: 'http://leapweb-stage7.herokuapp.com/oauth/',
    client_id: '73fde9aa45ef818ecb137aeacd886253',
    client_key: '8daf22818f30f4a9f86201d1b276b39c',
    redirect_uri: 'http://leapweb-stage7.herokuapp.com/'
  },

  AppSubdir: {
    AppIcons: 'app_icons',
    TileBackgrounds: 'tile_backgrounds'
  }
};

module.exports = config;
