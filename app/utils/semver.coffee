NumVersionParts = 4

parseVersionString = (versionString) ->
  if Array.isArray(versionString)
    versionString
  else
    versionParts = String(versionString).split(".").slice(0, NumVersionParts)
    i = 0

    while i < NumVersionParts
      versionParts[i] = parseInt(versionParts[i], 10) or 0
      i++
    versionParts

isFirstGreaterThanSecond = (firstVersion, secondVersion) ->
  firstVersion = parseVersionString(firstVersion)
  secondVersion = parseVersionString(secondVersion)
  i = 0

  while i < NumVersionParts
    if firstVersion[i] > secondVersion[i]
      return true
    else return false  if firstVersion[i] < secondVersion[i]
    i++

  # equal, so return false
  false

areEqual = (firstVersion, secondVersion) ->
  firstVersion = parseVersionString(firstVersion)
  secondVersion = parseVersionString(secondVersion)
  i = 0

  while i < NumVersionParts
    return false  if firstVersion[i] isnt secondVersion[i]
    i++
  true

isFirstLessThanSecond = (firstVersion, secondVersion) ->
  not isFirstGreaterThanSecond(firstVersion, secondVersion) and not areEqual(firstVersion, secondVersion)

module.exports.isFirstGreaterThanSecond = isFirstGreaterThanSecond
module.exports.areEqual = areEqual
module.exports.isFirstLessThanSecond = isFirstGreaterThanSecond
