// Generated by CoffeeScript 1.7.1
(function() {
  var makeEnum, makeEnumFromArray;

  makeEnumFromArray = function(array, namespace) {
    var enumerable;
    enumerable = {};
    array.forEach(function(arrayEntry) {
      if (typeof arrayEntry !== "string" && typeof arrayEntry !== "number") {
        throw new Error("Can't handle non-string, non-number array entry: " + arrayEntry);
      }
      return enumerable[arrayEntry] = (namespace ? namespace + "_" : "") + arrayEntry;
    });
    return enumerable;
  };

  makeEnum = function(arrayOrMapOfArrays, namespace) {
    var enumerable;
    enumerable = {};
    namespace = namespace || "";
    if (Array.isArray(arrayOrMapOfArrays)) {
      enumerable = makeEnumFromArray(arrayOrMapOfArrays, namespace);
    } else if (typeof arrayOrMapOfArrays === "object") {
      Object.keys(arrayOrMapOfArrays).forEach(function(key) {
        var value;
        value = arrayOrMapOfArrays[key];
        return enumerable[key] = makeEnum(value, (namespace ? namespace + "_" : "") + key);
      });
    } else {
      throw new Error("Can't handle non-array, non-object value: " + value);
    }
    return enumerable;
  };

  module.exports.make = makeEnum;

}).call(this);
