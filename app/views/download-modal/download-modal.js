var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'download-modal',

  initialize: function() {
    var leapApp = this.options.leapApp;

    this.injectCss();
    var appJson = leapApp.toJSON();
    appJson.changelog = leapApp.getMarkdown('changelog');
    this.$el.append($(this.templateHtml({ app: appJson })));

    this.$('img').on('load error', function() {
      if (this.$('.icon').prop('naturalWidth') === 0) {
        leapApp.set('iconPath', '');
        leapApp.downloadIcon(true);
      }
    }.bind(this));

    this.$('.button.cancel').click(function() {
      if (_.isFunction(this.options.onCancel)) {
        this.options.onCancel();
      }
      this.remove();
    }.bind(this));
    this.$('.button.confirm').hide().click(this.options.onConfirm);
    if (leapApp.isUpgrade()) {
      this.$('.button.confirm.upgrade').show();
    } else {
      this.$('.button.confirm.install').show();
    }

    this.listenTo(leapApp, 'change:iconPath', function() {
      this.$('.icon').attr('src', leapApp.get('iconPath'));
    }.bind(this));

    // prevent swiping while modal is open
    this.$el.bind('mousedown mousemove', function(evt) {
      evt.stopPropagation();
    });
  },

  show: function() {
    this.$el.appendTo('body');
  },

  remove: function() {
    this.$el.remove();
  }

});
