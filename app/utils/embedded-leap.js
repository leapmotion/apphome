// Generated by CoffeeScript 1.7.1
(function() {
  var config, db, defer, exec, fs, getEmbeddedDevice, os, path, promise,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  exec = require("child_process").exec;

  os = require("os");

  fs = require("fs");

  path = require("path");

  db = require("./db.js");

  config = require("../../config/config.js");

  defer = $.Deferred();

  promise = void 0;

  getEmbeddedDevice = function() {
    var device, embeddedDevice, existingValue, id, _ref, _ref1, _ref2;
    if (_ref = uiGlobals.embeddedDevice, __indexOf.call(config.EmbeddedLeapTypes, _ref) >= 0) {
      return uiGlobals.embeddedDevice;
    }
    existingValue = db.fetchObj(config.DbKeys.EmbeddedLeapDevice);
    if (existingValue != null) {
      return existingValue;
    }
    embeddedDevice = void 0;
    _ref1 = leapController.devices;
    for (id in _ref1) {
      device = _ref1[id];
      if (_ref2 = device.type, __indexOf.call(config.EmbeddedLeapTypes, _ref2) >= 0) {
        embeddedDevice = device.type;
      }
    }
    db.saveObj(config.DbKeys.EmbeddedLeapDevice, embeddedDevice);
    return embeddedDevice;
  };

  module.exports.getEmbeddedDevice = getEmbeddedDevice;

}).call(this);
