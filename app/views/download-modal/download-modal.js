var leap = require('../../utils/leap.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'download-modal',

  events: {
    'click .button.cancel': 'remove',
    'click': '_checkOutsideClick'
  },

  initialize: function() {
    var leapApp = this.options.leapApp;
    var appToInstall = leapApp;

    this.injectCss();

    if (leapApp.isUpgradable()) {
      var upgradeApp = leapApp.get('availableUpgrade');
      if (_.isFunction(upgradeApp.toJSON)) {
        appToInstall = upgradeApp;
      }
    }
    var appJson = appToInstall.toJSON();
    appJson.changelog = appToInstall.getMarkdown('changelog');
    appJson.description = appToInstall.getMarkdown('description');
    this.$el.append($(this.templateHtml({ app: appJson })));

    this.$('img').on('load error', function() {
      if (this.$('.icon').prop('naturalWidth') === 0) {
        leapApp.set('iconPath', '');
        leapApp.downloadIcon(true);
      }
    }.bind(this));

    this.$('.button.confirm').hide().click(this.options.onConfirm);
    this.$('.button.launch').hide().click(this.options.onLaunch);
    if (leapApp.isUpgradable()) {
      this.$('.button.launch').show();
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

  _checkOutsideClick: function(evt){
    var $target = $(evt.target);
    if ($target.parent('body').length) {
      this.remove();
    }
  },

  show: function() {
    this.$el.appendTo('body');
  },

  remove: function() {
    if (_.isFunction(this.options.onCancel)) {
      this.options.onCancel();
    }
    this.$el.remove();
  }

});
