var events = require('events');
var util = require('util');

function DownloadProgressStream() {
}

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
  this._canceller = canceller;
}

module.exports = DownloadProgressStream;
