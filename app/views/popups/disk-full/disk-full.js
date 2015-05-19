var i18n = require('../../../utils/i18n.js');

var BaseView = require('../../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  options: {
    title: i18n.translate('Leap Motion App Home') + ': ' + i18n.translate('Disk full.'),
    width: 400,
    height: 300,
    'always-on-top': true,
    show: false,
    requiredSpace: i18n.translate('File') + ':',
    close: i18n.translate('Close')
  },

  initialize: function(options) {
    _.extend(this.options, options);
    var diskFullPopup = this;
    this.injectCss();
    this.$el.append(this.templateHtml(options));
    this.options.nwWindow.show();
    this.$el.find('#close-popup-button').click(function() {
        diskFullPopup.options.nwWindow.close();
    });
  }

});
