function makeEnumFromArray(array, namespace) {
  var enumerable = {};

  array.forEach(function(arrayEntry) {
    if (typeof arrayEntry !== 'string' && typeof arrayEntry !== 'number') {
      throw new Error("Can't handle non-string, non-number array entry: " + arrayEntry);
    }
    enumerable[arrayEntry] = (namespace ? namespace + '_' : '') + arrayEntry;
  });

  return enumerable;
}

function makeEnum(arrayOrMapOfArrays, namespace) {
  var enumerable = {};
  namespace = namespace || '';

  if (Array.isArray(arrayOrMapOfArrays)) {
    enumerable = makeEnumFromArray(arrayOrMapOfArrays, namespace);
  } else if (typeof arrayOrMapOfArrays === 'object') {
    Object.keys(arrayOrMapOfArrays).forEach(function(key) {
      var value = arrayOrMapOfArrays[key];
      enumerable[key] = makeEnum(value, (namespace ? namespace + '_' : '') + key);
    });
  } else {
    throw new Error("Can't handle non-array, non-object value: " + value);
  }

  return enumerable;
}

module.exports.make = makeEnum;
