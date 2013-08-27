// This looks so wrong but it feels soooo right! Seriously, this allows us to override required includes, e.g. leap.js
require = require('../../utils/wraprequire.js')(module);
var config = require('../../../config/config.js');
var leap = require('../../utils/leap.js'); // require(config.ModulePaths.LeapJs);

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'leap-not-connected',

  initialize: function() {
    this.injectCss();
    this.$el.toggleClass('embedded', !!this.options.isEmbedded);
    this.$el.append($(this.templateHtml()));
  },

  encourageConnectingLeap: function(cb) {
    if (!leap.isConnected()) {
      this.$el.appendTo('body');
      var checkInterval = setInterval(function() {
        if (leap.isConnected()) {
          clearInterval(checkInterval);
          cb && cb(null);
        }
      });
      this.$('.skip-button').click(function() {
        clearInterval(checkInterval);
        cb && cb(null);
      }).text(uiGlobals.i18n.translate('Continue with mouse only').fetch());
    } else {
      cb && cb(null);
    }
  }

});
