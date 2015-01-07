var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');

var config = require('../../../../config/config.js');
var db = require('../../../utils/db.js');
var embeddedLeap = require('../../../utils/embedded-leap.js');
var eula = require('../../../utils/eula.js');
var i18n = require('../../../utils/i18n.js');
var ga = require('../../../utils/ga.js');
var oauth = require('../../../utils/oauth.js');
var popup = require('../popup.js');
var shell = require('../../../utils/shell.js');

var AuthorizationView = require('../../authorization/authorization.js');
var BaseView = require('../../base-view.js');

var PlatformOrientationPaths = {
  win32: (process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES) + '\\Leap Motion\\Core Services\\Orientation\\Orientation.exe',
  darwin: '/Applications/Leap Motion Orientation.app'
};

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'first-run-view',

  options: config.Layout,

  initialize: function(options) {
    _.extend(this.options, options);

    this.injectCss();
    this.$el.append(this.templateHtml({
      subheader_label:     i18n.translate('Welcome to a whole new world'),
      signup_label:        i18n.translate('Sign up to continue'),
      signin_label:        i18n.translate('Sign in to an existing account')
    }));

    $('body').append(this.$el);

    this.authorizationView = new AuthorizationView();

    if (uiGlobals.embeddedDevice && os.platform() === 'win32') {

      this.$el.find('#actions').addClass('disabled');

      eula.hasBeenAgreedTo().then(function(exists) {
        if (!exists) {

          this.$activateImage = this.$el.find('img.' + uiGlobals.embeddedDevice);
          this.$activateImage.show();
          this._center();

          eula.waitForLicense().then(function() {
            this._setupGhostSession();

            this.$activateImage.hide();
            this.$el.find('#actions').removeClass('disabled');
            this._center();
          }.bind(this));
        } else {
          this._setupGhostSession();
        }
      }.bind(this));
    } else {
      this._setupGhostSession();
    }
  },

  _center: function() {
    this.$el.css('margin-top', -1*this.$el.height()/2);
  },

  _setupGhostSession: function() {
    this._showAuth(true);
  },

  _showAuth: function(newUser, count) {
    if (count && count > 4) return;
    this.$el.remove();

    var _this = this;
    this.authorizationView.authorize(function(err) {
      if (err) {
        console.warn('Error logging in: ' + err.stack || err);
        this._showAuth(newUser, (count || 0) + 1);
      } else {
        _this.options.onLoggedIn();
      }
    }.bind(this), newUser);
  },

});
