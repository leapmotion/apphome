makeEnumFromArray = (array, namespace) ->
  enumerable = {}
  array.forEach (arrayEntry) ->
    throw new Error("Can't handle non-string, non-number array entry: " + arrayEntry)  if typeof arrayEntry isnt "string" and typeof arrayEntry isnt "number"
    enumerable[arrayEntry] = (if namespace then namespace + "_" else "") + arrayEntry

  enumerable

makeEnum = (arrayOrMapOfArrays, namespace) ->
  enumerable = {}
  namespace = namespace or ""

  if Array.isArray arrayOrMapOfArrays
    enumerable = makeEnumFromArray(arrayOrMapOfArrays, namespace)
  else if typeof arrayOrMapOfArrays is "object"
    Object.keys(arrayOrMapOfArrays).forEach (key) ->
      value = arrayOrMapOfArrays[key]
      enumerable[key] = makeEnum(value, (if namespace then namespace + "_" else "") + key)
  else
    throw new Error("Can't handle non-array, non-object value: " + value)

  enumerable

module.exports.make = makeEnum
