var Spinner = require('spin');
var urlParse = require('url').parse;

var BaseView = require('../base-view.js');

var connection = require('../../utils/connection.js');
var oauth = require('../../utils/oauth.js');

var LoadTimeoutMs = 20000;

module.exports = BaseView.extend({
  viewDir: __dirname,

  className: 'authorization',

  initialize: function() {
    this.injectCss();
    this.$el.append(this.templateHtml());
    this.$iframe = this.$('iframe.oauth');
    this.$noInternet = this.$('.no-internet');
    this.$waiting = this.$('.waiting');
    new Spinner({ left: 135 }).spin(this.$waiting[0]);

    this._savedIframeUrl = 'about:blank';

    this._boundCenteringFn = this._center.bind(this);
    $(window).resize(this._boundCenteringFn);
  },

  authorize: function(cb) {
    this.$el.appendTo('body');
    this._center();
    this.$el.toggleClass('first-run', this._isFirstRun());

    connection.check(function(err, isConnected) {
      if (isConnected) {
        this.$iframe.attr('src', oauth.getAuthorizationUrl());
        this._startPollingForIframeUrlChanges();

        this._loadTimeoutId = setTimeout(function() {
          console.warn('Connecting auth to server timed out.');
          cb(new Error('Connection to login server timed out.'));
        }.bind(this), LoadTimeoutMs);

        this.$iframe.on('urlChanged', function(elem, url) {
          try {
            this._performActionBasedOnUrl(url, cb);
          } catch (err2) {
            cb(err2);
          }
        }.bind(this));
      } else {
        if (!oauth.getRefreshToken()) {
          this._waitForInternetConnection(cb);
        } else {
          cb(null, null);
        }
      }
    }.bind(this));
  },

  _isFirstRun: function() {
    return !oauth.getRefreshToken();
  },

  _waitForInternetConnection: function(cb) {
    connection.check(function(err, isConnected) {
      if (isConnected) {
        this.$noInternet.addClass('background');
        this.authorize(cb);
      } else {
        this._center();
        this.$noInternet.removeClass('background');
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
    }
  },

  _waitForUserToSignIn: function() {
    var iframeWindow = this.$iframe.prop('contentWindow');
    this.$waiting.addClass('background');
    this.$iframe.removeClass('background');
    clearTimeout(this._loadTimeoutId);
    $(iframeWindow).load(function() {
      if (this._isFirstRun() && !this._hasRedirectedToSignUp && /^\/users\/sign_in/.test(iframeWindow.location.pathname)) {
        this._hasRedirectedToSignUp = true;
        iframeWindow.location = $('.auth-link:first', iframeWindow.document).attr('href');
        this._waitForUserToSignIn();
      } else {
        var $rememberMe = $('input#user_remember_me', iframeWindow.document).attr('checked', true);
        $rememberMe.parent().hide();
        $('input[type=text]:first', iframeWindow.document).focus();
      }
    }.bind(this));

    this._center();
  },

  _allowOauthAuthorization: function() {
    this.$iframe.addClass('background');
    this.$waiting.removeClass('background').removeClass('before').addClass('after');
    var iframeWindow = this.$iframe.prop('contentWindow');
    var approveOauthInterval = setInterval(function() {
      var $approvalForm = $('form.approve', iframeWindow.document);
      if ($approvalForm.length) {
        clearTimeout(this._loadTimeoutId);
        $approvalForm.submit();
        clearInterval(approveOauthInterval);
      }
    }.bind(this), 50);
  },

  _finishAuthorization: function(code, cb) {
    clearTimeout(this._loadTimeoutId);
    oauth.authorizeWithCode(code, function(err) {
      if (err) {
        console.warn(err);
        cb(err);
      } else {
        oauth.getAccessToken(cb);
      }
    }.bind(this));
  },

  _startPollingForIframeUrlChanges: function() {
    if (!this._iframeUrlPollingIntervalId) {
      this._iframeUrlPollingIntervalId = setInterval(function() {
        var iframeWindow = this.$iframe.prop('contentWindow');
        if (!iframeWindow) {
          return;
        }
        var iframeUrl = iframeWindow.location.href;
        if (this._savedIframeUrl !== iframeUrl) {
          this._savedIframeUrl = iframeUrl;
          this.$iframe.trigger('urlChanged', [ iframeUrl ]);
        }
      }.bind(this), 10);
    }
  },

  _stopPollingForIframeUrlChanges: function() {
    clearTimeout(this._iframeUrlPollingIntervalId);
    this._iframeUrlPollingIntervalId = null;
  },

  _center: function() {
    this._centerElement(this.$iframe);
    this._centerElement(this.$noInternet);
    this._centerElement(this.$waiting);
    this._centerElement(this.$('.first-run-background'));
  },

  _centerElement: function($element) {
    $element.css({
      left: ($(window).width() - $element.outerWidth()) / 2,
      top:  ($(window).height() - $element.outerHeight()) / 2
    });
  },

  remove: function() {
    this.$iframe.unbind();
    this._stopPollingForIframeUrlChanges();
    $(window).unbind('resize', this._boundIframeCenteringFn);
    this.$el.remove();
  }

});
