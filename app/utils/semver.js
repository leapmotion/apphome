// Generated by CoffeeScript 1.7.1
(function() {
  var NumVersionParts, areEqual, isFirstGreaterThanSecond, isFirstLessThanSecond, parseVersionString;

  NumVersionParts = 4;

  parseVersionString = function(versionString) {
    var part, versionParts, _i, _len, _ref, _results;
    if (Array.isArray(versionString)) {
      return versionString;
    } else {
      _ref = String(versionString).split(".").slice(0, NumVersionParts);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        part = _ref[_i];
        _results.push(versionParts = parseInt(part, 10) || 0);
      }
      return _results;
    }
  };

  isFirstGreaterThanSecond = function(firstVersion, secondVersion) {
    var i, _i;
    firstVersion = parseVersionString(firstVersion);
    secondVersion = parseVersionString(secondVersion);
    for (i = _i = 0; 0 <= NumVersionParts ? _i < NumVersionParts : _i > NumVersionParts; i = 0 <= NumVersionParts ? ++_i : --_i) {
      if (firstVersion[i] == null) {
        firstVersion[i] = 0;
      }
      if (secondVersion[i] == null) {
        secondVersion[i] = 0;
      }
      if (firstVersion[i] > secondVersion[i]) {
        return true;
      } else if (firstVersion[i] < secondVersion[i]) {
        return false;
      }
    }
    return false;
  };

  areEqual = function(firstVersion, secondVersion) {
    var i, _i;
    firstVersion = parseVersionString(firstVersion);
    secondVersion = parseVersionString(secondVersion);
    for (i = _i = 0; 0 <= NumVersionParts ? _i < NumVersionParts : _i > NumVersionParts; i = 0 <= NumVersionParts ? ++_i : --_i) {
      if (firstVersion[i] !== secondVersion[i]) {
        return false;
      }
    }
    return true;
  };

  isFirstLessThanSecond = function(firstVersion, secondVersion) {
    return !isFirstGreaterThanSecond(firstVersion, secondVersion) && !areEqual(firstVersion, secondVersion);
  };

  module.exports.isFirstGreaterThanSecond = isFirstGreaterThanSecond;

  module.exports.areEqual = areEqual;

  module.exports.isFirstLessThanSecond = isFirstGreaterThanSecond;

}).call(this);
