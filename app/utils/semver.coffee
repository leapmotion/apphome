NumVersionParts = 4

parseVersionString = (versionString) ->
  if Array.isArray(versionString)
    versionString
  else
    versionParts = parseInt(part, 10) or 0 for part in String(versionString).split(".").slice(0, NumVersionParts)

isFirstGreaterThanSecond = (firstVersion, secondVersion) ->
  firstVersion = parseVersionString(firstVersion)
  secondVersion = parseVersionString(secondVersion)

  for i in [0...NumVersionParts]
    firstVersion[i] ?= 0
    secondVersion[i] ?= 0
    if firstVersion[i] > secondVersion[i]
      return true
    else if firstVersion[i] < secondVersion[i]
      return false
  return false # they are equal

areEqual = (firstVersion, secondVersion) ->
  firstVersion = parseVersionString(firstVersion)
  secondVersion = parseVersionString(secondVersion)

  for i in [0...NumVersionParts]
    return false  if firstVersion[i] isnt secondVersion[i]
  true

isFirstLessThanSecond = (firstVersion, secondVersion) ->
  not isFirstGreaterThanSecond(firstVersion, secondVersion) and not areEqual(firstVersion, secondVersion)

module.exports.isFirstGreaterThanSecond = isFirstGreaterThanSecond
module.exports.areEqual = areEqual
module.exports.isFirstLessThanSecond = isFirstGreaterThanSecond
