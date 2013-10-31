var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');
var path = require('path');

var config = require('../../../../config/config.js');
var db = require('../../../utils/db.js');
var embeddedLeap = require('../../../utils/embedded-leap.js');
var i18n = require('../../../utils/i18n.js');
var mixpanel = require('../../../utils/mixpanel.js');
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

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml({
      subheader_label:     i18n.translate('Welcome to a whole new world'),
      signup_label:        i18n.translate('Sign up to continue'),
      signin_label:        i18n.translate('Sign in to an existing account')
    }));

    this.$el.toggleClass('embedded', uiGlobals.isEmbedded);
    $('body').append(this.$el);

    this._setupBindings();

    var authorizationView = new AuthorizationView({
      selector: '#auth',
    });

    authorizationView.authorize(function(err) {
      if (err) {
        console.warn('Error logging in: ' + err.stack || err);
      } else {
        this.$el.remove();
        this.options.onLoggedIn();
      }
    }.bind(this));
  },

  _setupBindings: function() {
    this.$('#signup').click(function() {
      this._showAuth(true);
    }.bind(this));

    this.$('#signin').click(function() {
      this._showAuth(false);
      this.$('#auth iframe.oauth').hide()[0].contentWindow.location.href = "https://central.leapmotion.com/users/sign_in";
    }.bind(this));
  },

  _showAuth: function(newUser) {
    this.$('#intro').hide();
    this.$('#auth').show();
    this.$el.css({
      'margin-top': -340,
    });
  },

});
