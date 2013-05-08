var enumerable = require('./utils/enumerable.js');

var uiGlobals = _.extend({}, window.Backbone.Events);

uiGlobals.Event = enumerable.make([
  'SplashWelcomeClosed'
], 'UiGlobalEvent');

module.exports = uiGlobals;
