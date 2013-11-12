var Spinner = require('spin');
var urlParse = require('url').parse;
var fs = require('fs');

var config = require('../../../config/config.js');
var i18n = require('../../utils/i18n.js');
var mixpanel = require('../../utils/mixpanel.js');
var oauth = require('../../utils/oauth.js');
var popup = require('../popups/popup.js');

var BaseView = require('../base-view.js');

// true when logging out to log in as LEAPHOME_LOGIN_EMAIL...
var didAutoLogout = false;

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'authorization',

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml({
      beforeMessage_label: i18n.translate('Connecting to authentication server...'),
      afterMessage_label:  i18n.translate('Preparing for launch...'),
      logoutMessage_label: i18n.translate('Signing you out...'),
      noInternet_label:    i18n.translate('No Internet connection'),
      instruction_label:   i18n.translate('Please ensure your Internet connection is working properly.'),
      findAndLaunch_label: i18n.translate('Find and launch your Leap Motion apps'),
      syncPurchases_label: i18n.translate('Sync purchases across devices'),
      discoverGames_label: i18n.translate('Discover games, utilities, music, and more in our store!'),
      sameLogin_label:     i18n.translate('Use the same login for purchases, support, and more!')
    }));
    this.$iframe = this.$('iframe.oauth');
    this.$noInternet = this.$('.no-internet');
    this.$waiting = this.$('.waiting');
    new Spinner({ color: '#8c8c8c', width: 3, left: 186 }).spin(this.$waiting.find('.spinner-holder')[0]);
  },

  authorize: function(cb, newUser) {
    this.__newUser = newUser;

    if (process.env.LEAPHOME_LOGIN_EMAIL && didAutoLogout === false) {
      didAutoLogout = true;
      // start logged out
      this.logOut(function() {
        this.authorize(cb);
      }.bind(this));
      return;
    }
    this.$el.appendTo('body');
    this.$el.toggleClass('first-run', uiGlobals.isFirstRun);

    if (window.navigator.onLine) {
      this.$iframe.attr('src', oauth.getAuthorizationUrl());

      this._startLoadTimeout(cb);

      this.$iframe.load(function() {

        try {
          var iframeWindow = this.$iframe.prop('contentWindow');

          if (/^http/i.test(iframeWindow.location.href)) {
            $(iframeWindow).unload(function() {
              this._showConnectingMessage();
              this._startLoadTimeout(cb);
            }.bind(this));

            this._interceptPopupLinks($('body', iframeWindow.document));
            this._clearLoadTimeout();
            this._performActionBasedOnUrl(iframeWindow.location.href, cb);
          } else {
            this._clearLoadTimeout();
            cb(new Error('Could not load auth page.'));
          }
        } catch (err2) {
          console.error('Authorization error: ' + err2.stack);
          cb(err2);
        }
      }.bind(this));
    } else {
      if (!oauth.getRefreshToken()) {
        this._waitForInternetConnection(cb);
      } else {
        cb(null);
      }
    }
  },

  logOut: function(cb) {
    this.$el.appendTo('body');
    this._showLoggingOutMessage();

    oauth.logOut();
    this._showLoggingOutMessage();
    if (window.navigator.onLine) {
      var $logoutFrame = $('<iframe src="' + oauth.logOutUrl() + '"/>').hide();
      $logoutFrame.load(function() {
        $logoutFrame.remove();
        cb(null);
      });
      $logoutFrame.appendTo('body');
    }

    // FIXME: Why does PaulB's code sometimes cause immediate relogin?
    //$.get(oauth.logOutUrl(), {
    //  error: function(xhr, err) {
    //    cb && cb(err);
    //  },
    //  success: function() {
    //    oauth.logOut();
    //    cb && cb(null);
    //  }
    //});
  },

  _styleIframe: function() {
    var $contents = $('iframe.oauth').contents();
    var cssLink = $('<style>').text(fs.readFileSync('static/css/custom-login-styling.css'));
    $contents.find('head').append(cssLink);

    $contents.find('.alert:contains("You need to sign in or sign up before continuing.")').hide();

    $contents.find('.auth-form form .control-group:nth-child(6) h4')
      .text('Birth Date')
      .wrap($('<div>').addClass('clearfix').attr('id', 'birthday-label'))
      .after($('<span>').text(i18n.translate('Why is this required?')));

    $contents.find('.auth-form form div .auth-field, #user_airspace_tos_accepted, #user_born_at_month, #user_born_at_day, #user_born_at_year')
      .attr('required', 'required');

    $contents.find('div.divider').hide();

    $contents.find('.alerts').prependTo($contents.find('.auth-form'));

    $contents.find('.auth-screen .auth-links.back').html('<a href="https://central.leapmotion.com/users/sign_in" class="auth-link"><i class="icon-caret-left"></i> ' + i18n.translate("Sign in") + '</a>');

    $contents.find('.auth-form').css({'position': 'relative'});

    var alertSelectorMap = {
      'error-email': '#user_email',
      'error-password': '#user_password_confirmation',
    };

    $contents.find('.alert').each(function(i, el) {
        _.keys(alertSelectorMap).forEach(function(alertSelector) {
          if ($(this).hasClass(alertSelector)) {
            $(this).addClass('field-alert');
            $(this).addClass('alert-danger');
            var top = $contents.find(alertSelectorMap[alertSelector]).offset().top;
            $(this).css({'top': top});
          }
        }.bind(this));
    });

  },

  _waitForInternetConnection: function(cb) {
    if (window.navigator.onLine) {
      this._showConnectingMessage();
      this.authorize(cb);
    } else {
      this._showNoInternetMessage();
      setTimeout(function() {
        this._waitForInternetConnection(cb);
      }.bind(this), 250);
    }
  },

  _performActionBasedOnUrl: function(url, cb) {
    var urlParts = urlParse(url, true);
    if (/^\/users/.test(urlParts.pathname)) {
      if (process.env.LEAPHOME_LOGIN_EMAIL) {
        this._loginAs({
          email: process.env.LEAPHOME_LOGIN_EMAIL,
          password: process.env.LEAPHOME_LOGIN_PASSWORD
        });
      } else {
        this._waitForUserToSignIn();
      }
    } else if (/^\/oauth\/authorize/.test(urlParts.pathname)) {
      this._allowOauthAuthorization();
    } else if (urlParts.query && urlParts.query.code) {
      this._showLoggingInMessage();
      this._finishAuthorization(urlParts.query.code, cb);
    } else {
      cb(new Error('Unknown URL: ' + url));
    }
  },

  _loginAs: function(userobj) {
    console.log('_loginAs', userobj);
    this._showLoginForm();
    var iframeWindow = this.$iframe.prop('contentWindow');
    $('#user_email', iframeWindow.document).val(userobj.email);
    $('#user_password', iframeWindow.document).val(userobj.password);
    $('form', iframeWindow.document).submit();
    this._showLoggingInMessage();
  },

  _waitForUserToSignIn: function() {
    var iframeWindow = this.$iframe.prop('contentWindow');
    var signUpUrl = $('.auth-link:first', iframeWindow.document).attr('href');
    var isShowingSignInForm = /^\/users\/sign_in/.test(iframeWindow.location.pathname);
    var isShowingSignUpForm = /^\/users\/sign_up/.test(iframeWindow.location.pathname);

    if (isShowingSignUpForm) {
      $('form', iframeWindow.document).submit(mixpanel.trackSignUp);
    } else if (isShowingSignInForm) {
      $('form', iframeWindow.document).submit(mixpanel.trackSignIn);
    }

    if (uiGlobals.isFirstRun && !this._hasRedirectedToSignUp && signUpUrl && isShowingSignInForm && this.__newUser) {
      iframeWindow.location = signUpUrl;
      this._hasRedirectedToSignUp = true;
    } else {
      this._showLoginForm();
      var $rememberMe = $('input#user_remember_me', iframeWindow.document).attr('checked', true);
      $rememberMe.parent().hide();
      $('input[type=text]:first', iframeWindow.document).focus();
      $('form', iframeWindow.document).submit(this._showLoggingInMessage.bind(this));
     }
  },

  _allowOauthAuthorization: function() {
    this._showLoggingInMessage();
    var iframeWindow = this.$iframe.prop('contentWindow');
    var approveOauthInterval = setInterval(function() {
      var $approvalForm = $('form.approve', iframeWindow.document);
      if ($approvalForm.length) {
        $approvalForm.submit();
        clearInterval(approveOauthInterval);
      }
    }.bind(this), 50);
  },

  _finishAuthorization: function(code, cb) {
    oauth.authorizeWithCode(code, function(err) {
      if (err) {
        console.warn(err);
      }
      this.$el.remove();
      cb(err || null);
    }.bind(this));
  },

  _showLoginForm: function() {
    this.$noInternet.hide();
    this.$waiting.removeClass('after before logout').hide();
    this._styleIframe();
    this._resizeIframe();
    this.$iframe.show();
  },

  _showConnectingMessage: function() {
    this.$noInternet.hide();
    this.$iframe.hide();
    if (!this.$waiting.hasClass('after')) {
      this.$waiting.show().removeClass('after logout').addClass('before');
    }
  },

  _showLoggingInMessage: function() {
    this.$noInternet.hide();
    this.$iframe.hide();
    this.$waiting.show().removeClass('before logout').addClass('after');
  },

  _showNoInternetMessage: function() {
    this.$iframe.hide();
    this.$waiting.hide();
    this.$noInternet.show();
  },

  _showLoggingOutMessage: function() {
    this.$iframe.hide();
    this.$noInternet.hide();
    this.$waiting.show().removeClass('before after').addClass('logout');
  },

  _interceptPopupLinks: function($elem) {
    $elem.on('click', 'a[data-airspace-home-popup]', function(evt) {
      evt.preventDefault();
      var href = $(this).attr('href');
      if (href) {
        nwGui.Window.open(href, {
          width: 640,
          height: 480,
          x: 50,
          y: 50,
          toolbar: false,
          icon: 'static/icon/icon.png',
          'new-instance': true,
          nodejs: false
        });
      }
    });
  },

  _resizeIframe: function() {
    var iframeWindow = this.$iframe.prop('contentWindow');
    if (iframeWindow) {
      var declaredWidth = parseInt($('body', iframeWindow.document).attr('airspace-home-width'), 10);
      if (declaredWidth) {
        this.$iframe.width(declaredWidth);
      }
      this.$iframe.height(0);
      this.$iframe.height(Math.min(1.5*$(iframeWindow.document).height(), $(window).height() - 10));
    }
  },

  _clearLoadTimeout: function() {
    if (this._loadTimeoutId) {
      clearTimeout(this._loadTimeoutId);
      this._loadTimeoutId = null;
    }
  },

  _startLoadTimeout: function(cb) {
    this._clearLoadTimeout();
    this._loadTimeoutId = setTimeout(function() {
      cb(new Error('Connection to login server timed out.'));
    }, config.AuthLoadTimeoutMs);
  },

  remove: function() {
    $(window).unbind('resize', this._boundCenteringFn);
    this.$el.remove();
    this._clearLoadTimeout();
  }

});
