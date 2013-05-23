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
    this._savedIframeUrl = 'about:blank';

    this._boundIframeCenteringFn = this._centerIframe.bind(this);
    $(window).resize(this._boundIframeCenteringFn);
  },

  authorize: function(cb) {
    connection.check(function(err, isConnected) {
      if (err) {
        return cb(err);
      } else if (!isConnected) {
        return cb(new Error('Not connected to the internet.'));
      }

      this.$el.appendTo('body');
      this.$iframe.attr('src', oauth.getAuthorizationUrl());
      this._startPollingForIframeUrlChanges();

      var loadTimeoutId = setTimeout(function() {
        cb(new Error('Connection to login server timed out.'));
      }.bind(this), LoadTimeoutMs);

      this.$iframe.on('urlChanged', function(elem, url) {
        clearTimeout(loadTimeoutId);
        try {
          this._performActionBasedOnUrl(url, cb);
        } catch (err2) {
          cb(err2);
        }
      }.bind(this));
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
    $(iframeWindow).load(function() {
      var $rememberMe = $('input#user_remember_me', iframeWindow.document).attr('checked', true);
      $rememberMe.parent().hide();
    });

    this.$iframe.removeClass('background');
    this._centerIframe();
  },

  _allowOauthAuthorization: function() {
    this.$iframe.addClass('background');
    var iframeWindow = this.$iframe.prop('contentWindow');
    $(iframeWindow).load(function() {
      $('form.approve', iframeWindow.document).submit();
    });
  },

  _finishAuthorization: function(code, cb) {
    oauth.authorizeWithCode(code, function(err) {
      if (err) {
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

  _centerIframe: function() {
    if (!this.$iframe.hasClass('hidden')) {
      this.$iframe.css({
        left: ($(window).width() - this.$iframe.width()) / 2,
        top: ($(window).height() - this.$iframe.height()) / 2
      });
    }
  },

  remove: function() {
    this._stopPollingForIframeUrlChanges();
    $(window).unbind('resize', this._boundIframeCenteringFn);
    this.$el.remove();
  }

});
