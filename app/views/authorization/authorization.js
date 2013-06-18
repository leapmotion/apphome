var Spinner = require('spin');
var urlParse = require('url').parse;

var config = require('../../../config/config.js');
var connection = require('../../utils/connection.js');
var db = require('../../utils/db.js');
var oauth = require('../../utils/oauth.js');
var mixpanel = require('../../utils/mixpanel.js');

var BaseView = require('../base-view.js');

module.exports = BaseView.extend({

  viewDir: __dirname,

  className: 'authorization',

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml());
    this.$iframe = this.$('iframe.oauth');
    this.$noInternet = this.$('.no-internet');
    this.$waiting = this.$('.waiting');
    new Spinner({ color: '#8c8c8c', width: 3, left: 160 }).spin(this.$waiting.find('.spinner-holder')[0]);
    this._boundCenteringFn = this._center.bind(this);
    $(window).resize(this._boundCenteringFn);
  },

  authorize: function(cb) {
    this.$el.appendTo('body');
    this._center();
    this.$el.toggleClass('first-run', this._isFirstRun());

    connection.check(function(isConnected) {
      if (isConnected) {
        this.$iframe.attr('src', oauth.getAuthorizationUrl());

        this._startLoadTimeout(cb);

        this.$iframe.load(function() {
          try {
            var iframeWindow = this.$iframe.prop('contentWindow');

            if (/^http/i.test(iframeWindow.location.href)) {
              $(iframeWindow).unload(function() {
                this.$iframe.css('visibility', 'hidden');
                this._startLoadTimeout(cb);
              }.bind(this));
              this._center();
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
    }.bind(this));
  },

  logOut: function(cb) {
    this.$el.appendTo('body');
    this._center();
    oauth.logOut();
    this._showLoggingOutMessage();
    connection.check(function(isConnected) {
      if (isConnected) {
        var $logoutFrame = $('<iframe src="' + oauth.logOutUrl() + '"/>').hide();
        $logoutFrame.load(function() {
          $logoutFrame.remove();
          cb(null);
        })
        $logoutFrame.appendTo('body');
      }
    }.bind(this));
  },

  _isFirstRun: function() {
    return !db.getItem(config.DbKeys.AlreadyDidFirstRun);
  },

  _waitForInternetConnection: function(cb) {
    connection.check(function(isConnected) {
      if (isConnected) {
        this._showConnectingMessage();
        this.authorize(cb);
      } else {
        this._center();
        this._showNoInternetMessage();
        setTimeout(this._waitForInternetConnection.bind(this), 250);
      }
    }.bind(this));
  },

  _performActionBasedOnUrl: function(url, cb) {
    var urlParts = urlParse(url, true);
    if (/^\/users/.test(urlParts.pathname)) {
      this._waitForUserToSignIn();
    } else if (/^\/oauth\/authorize/.test(urlParts.pathname)) {
      this._allowOauthAuthorization();
    } else if (urlParts.query && urlParts.query.code) {
      this._finishAuthorization(urlParts.query.code, cb);
    } else {
      cb(new Error('Unknown URL: ' + url));
    }
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

    if (this._isFirstRun() && !this._hasRedirectedToSignUp && signUpUrl && isShowingSignInForm) {
      iframeWindow.location = signUpUrl;
      this._hasRedirectedToSignUp = true;
    } else {
      var $rememberMe = $('input#user_remember_me', iframeWindow.document).attr('checked', true);
      $rememberMe.parent().hide();
      $('input[type=text]:first', iframeWindow.document).focus();
      $('form', iframeWindow.document).submit(this._showLoggingInMessage.bind(this));
      this._showLoginForm();
      this._center();
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
      cb(err || null);
    }.bind(this));
  },

  _showLoginForm: function() {
    this.$noInternet.addClass('background');
    this.$waiting.addClass('background');
    this.$iframe.removeClass('background');
  },

  _showConnectingMessage: function() {
    this.$noInternet.addClass('background');
    this.$iframe.addClass('background');
    this.$waiting.removeClass('background').removeClass('after').addClass('before');
  },

  _showLoggingInMessage: function() {
    this.$noInternet.addClass('background');
    this.$iframe.addClass('background');
    this.$waiting.removeClass('background').removeClass('before').addClass('after');
  },

  _showNoInternetMessage: function() {
    this.$iframe.addClass('background');
    this.$waiting.addClass('background');
    this.$noInternet.removeClass('background');
  },

  _showLoggingOutMessage: function() {
    this.$waiting.removeClass('background').removeClass('before').addClass('logout');
  },

  _center: function() {
    var iframeWindow = this.$iframe.prop('contentWindow');
    this.$iframe.css('visibility', 'hidden');
    this.$iframe.height(0);
    this.$iframe.height($(iframeWindow.document).height());

    this._centerElement(this.$iframe);
    this._centerElement(this.$noInternet);
    this._centerElement(this.$waiting);
    this._centerElement(this.$('.first-run-background'));

    this.$iframe.css('visibility', 'visible');
  },

  _centerElement: function($element) {
    $element.css({
      left: ($(window).width() - $element.outerWidth()) / 2,
      top:  ($(window).height() - $element.outerHeight()) / 2
    });
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
    $(window).unbind('resize', this._boundIframeCenteringFn);
    this.$el.remove();
    this._clearLoadTimeout();
  }

});
