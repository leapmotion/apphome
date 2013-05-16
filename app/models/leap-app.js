var BaseModel = require('./base-model.js');
var db = require('../utils/db.js');

var LeapAppsDbKey = 'leap_apps';
/*
 - id
 - name
 - version
 - keyFile
 */

var BaseLeapAppModel = BaseModel.extend({

  save: function() {
    // note: persisting entire collection for now, each time save is called. Perhaps later we'll save models independently (and maintain a list of each)
    var appsToPersist = uiGlobals.leapApps.filter(function(app) {
      return !app.isBuiltinTile();
    });
    var payload = _(appsToPersist).map(function(app) {
      return app.toJSON(options);
    });
    db.setItem(LeapAppsDbKey, payload);
  },

  sortScore: function() {
    throw new Error('sortScore is an abstract method');
  },

  isLocalApp: function() {
    return false;
  },

  isStoreApp: function() {
    return false;
  },

  isBuiltinTile: function() {
    return false;
  }

});

module.exports = BaseLeapAppModel;

module.exports.hydrateCachedModels = function() {
  var cachedApps = db.getItem(LeapAppsDbKey) || [];
  cachedApps.forEach(function(appData) {
    uiGlobals.leapApps.add(appData);
  });
};
