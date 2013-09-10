var Modal = require('../modal/modal.js');

module.exports = Modal.extend({

  viewDir: __dirname,

  className: 'download-modal',

  initialize: function() {

    var leapApp = this.options.leapApp;

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
  }

});
