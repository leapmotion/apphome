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
        this._performActionBasedOnUrl(url, cb);
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
    this.$iframe.addClass('needs-interaction');
  },

  _allowOauthAuthorization: function() {
    this.$iframe.removeClass('needs-interaction');
    var iframeWindow = this.$iframe.prop('contentWindow');
    $(iframeWindow).load(function() {
      $('form.approve', iframeWindow.document).submit();
    });
  },

  _finishAuthorization: function(code, cb) {
    this.remove();
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

  remove: function() {
    this._stopPollingForIframeUrlChanges();
  }

});