var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'leap-not-connected',

  initialize: function() {
    this.injectCss();
    this.$el.append($(this.templateHtml()));
  },

  encourageConnectingLeap: function(cb) {
    if (!leap.isConnected()) {
      this.$el.appendTo('body');
      var checkInterval = setInterval(function() {
        if (leap.isConnected()) {
          clearInterval(checkInterval);
          cb(null);
        }
      });
      this.$('.skip-button').click(function() {
        clearInterval(checkInterval);
        cb(null);
      });
    } else {
      cb(null);
    }
  }

});