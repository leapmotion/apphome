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


    var appJson = leapApp.toJSON();
    appJson.changelog = leapApp.getMarkdown('changelog');
    appJson.description = leapApp.getMarkdown('description');

    appJson.version_label = uiGlobals.i18n.translate('Version').fetch();
    appJson.releaseDate_label = uiGlobals.i18n.translate('Release Date').fetch();
    appJson.changelog_label = uiGlobals.i18n.translate("What's New").fetch();
    appJson.description_label = uiGlobals.i18n.translate('Description').fetch();
    appJson.cancel_label = uiGlobals.i18n.translate('Cancel').fetch();
    appJson.install_label = uiGlobals.i18n.translate('Install %1$s').fetch(appJson.name);
    appJson.upgrade_label = uiGlobals.i18n.translate('Update App').fetch();
    appJson.launch_label = uiGlobals.i18n.translate('Launch App').fetch();

    if (leapApp.isUpgradable()) {
      var upgradeApp = leapApp.get('availableUpgrade');
      if (_.isFunction(upgradeApp.toJSON)) {
        _(appJson).extend(upgradeApp.toJSON());
        appJson.changelog = upgradeApp.getMarkdown('changelog');
      }
    }
    this.$el.append($(this.templateHtml({ app: appJson })));

    this.$('img').on('load error', function() {
      if (this.$('.icon').prop('naturalWidth') === 0) {
        leapApp.set('iconPath', '');
        leapApp.downloadIcon();
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
