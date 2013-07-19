var events = require('events');
var util = require('util');

function DownloadProgressStream() {
  this.bytesSoFar = 0;
}

util.inherits(DownloadProgressStream, events.EventEmitter);

DownloadProgressStream.prototype.listenTo = function(res) {
  this._res = res;
  this.totalBytes = Number(res.headers['content-length']) || 0;

  this._res.on('data', function(chunk) {
    this.bytesSoFar += chunk.length;
    this.emit('progress', this.bytesSoFar / this.totalBytes);
  }.bind(this));

  this._res.on('end', function() {
    this.emit('end');
  }.bind(this));
};

DownloadProgressStream.prototype.cancel = function() {
  if (this._res) {
    this._res.emit('cancel');
    this._res = null;
    return true;
  } else {
    return false;
  }
};

DownloadProgressStream.prototype.isFullyDownloaded = function() {
  return (this.bytesSoFar === this.totalBytes);
};

module.exports = DownloadProgressStream;
