function parseVersionString(versionString) {
  return (versionString || '').split('.').slice(0, 3).map(function(versionPart) {
    return Number(versionPart) || 0
  });
}

function meetsMinimumVersion(versionToCheck, minVersion) {
  if (typeof versionToCheck === 'string') {
    versionToCheck = parseVersionString(versionToCheck);
  }
  if (typeof minVersion === 'string') {
    minVersion = parseVersionString(minVersion);
  }

  for (var i = 0, len = versionToCheck.length; i < len; i++) {
    if (versionToCheck[i] > minVersion[i]) {
      return true;
    } else if (versionToCheck[i] < minVersion[i]) {
      return false;
    }
  }

  return true;
}

module.exports.meetsMinimumVersion = meetsMinimumVersion;
