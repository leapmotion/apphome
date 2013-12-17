// Generated by CoffeeScript 1.6.3
(function() {
  var DownloadProgressStream, events, util;

  events = require("events");

  util = require("util");

  DownloadProgressStream = function() {};

  util.inherits(DownloadProgressStream, events.EventEmitter);

  DownloadProgressStream.prototype.cancel = function() {
    if (this._canceller) {
      this._canceller();
      this._canceller = null;
      return true;
    } else {
      return false;
    }
  };

  DownloadProgressStream.prototype.setCanceller = function(canceller) {
    return this._canceller = canceller;
  };

  module.exports = DownloadProgressStream;

}).call(this);

/*
//@ sourceMappingURL=download-progress-stream.map
*/
