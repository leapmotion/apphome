var NumVersionParts = 4;

function parseVersionString(versionString) {
  if (Array.isArray(versionString)) {
    return versionString;
  } else {
    var versionParts = (versionString || '').split('.').slice(0, NumVersionParts);
    for (var i = 0; i < NumVersionParts; i++) {
      versionParts[i] = Number(versionParts[i]) || 0;
    }
    return versionParts;
  }
}

function isFirstGreaterThanSecond(firstVersion, secondVersion) {
  firstVersion = parseVersionString(firstVersion);
  secondVersion = parseVersionString(secondVersion);

  for (var i = 0; i < NumVersionParts; i++) {
    if (firstVersion[i] > secondVersion[i]) {
      return true;
    } else if (firstVersion[i] < secondVersion[i]) {
      return false;
    }
  }

  // equal, so return false
  return false;
}

function areEqual(firstVersion, secondVersion) {
  firstVersion = parseVersionString(firstVersion);
  secondVersion = parseVersionString(secondVersion);

  for (var i = 0; i < NumVersionParts; i++) {
    if (firstVersion[i] !== secondVersion[i]) {
      return false;
    }
  }
  return true;
}

function isFirstLessThanSecond(firstVersion, secondVersion) {
  return !isFirstGreaterThanSecond(firstVersion, secondVersion) && !areEqual(firstVersion, secondVersion);
}

module.exports.isFirstGreaterThanSecond = isFirstGreaterThanSecond;
module.exports.areEqual = areEqual;
module.exports.isFirstLessThanSecond = isFirstGreaterThanSecond;
