require('../env.js');
var assert = require('assert');

var modelValidation = require('../../../app/utils/model-validation-mixin.js');
var BaseModel = require('../../../app/models/base-model.js');

describe('model validation mixin', function() {
  it('should validate valid model properties', function(done) {
    var TestModel = BaseModel.extend(modelValidation({}, {
      id: 'int',
      name: 'string',
      url: 'file url|path'
    }));

    var test = new TestModel({
      id: 1,
      name: 'foo',
      url: 'http://www.google.com/logo.png'
    });

    assert.ok(test.isValid(), 'Test object 1 is valid');

    var test2 = new TestModel({
      id: 1,
      name: 'foo',
      url: __filename
    });

    assert.ok(test2.isValid(), 'Test object 2 is valid');
    done();
  });

  it('should not validate missing properties', function(done) {
    var TestModel = BaseModel.extend(modelValidation({}, {
      id: 'int',
      name: 'string',
      url: 'file url|path'
    }));

    var test = new TestModel({
      name: 'foo',
      url: 'http://www.google.com/logo.png'
    });

    assert.ok(!test.isValid(), 'Test object 1 is not valid');
    done();
  });

  it('should not validate invalid properties', function(done) {
    var TestModel = BaseModel.extend(modelValidation({}, {
      id: 'int',
      name: 'string',
      url: 'file url|path'
    }));

    var test1 = new TestModel({
      id: 'foo',
      name: 'foo',
      url: 'http://www.google.com/logo.png'
    });

    assert.ok(!test1.isValid(), 'Test object 1 is not valid int');

    var test2 = new TestModel({
      id: 1,
      name: {},
      url: 'http://www.google.com/logo.png'
    });

    assert.ok(!test2.isValid(), 'Test object 2 is not valid string');

    var test3 = new TestModel({
      id: 1,
      name: 'foo',
      url: 'http://www.google.com'
    });

    assert.ok(!test3.isValid(), 'Test object 3 is not valid file url');

    var test4 = new TestModel({
      id: 1,
      name: 'foo',
      url: __filename + 'foo'
    });

    assert.ok(!test4.isValid(), 'Test object 4 is valid');
    done();
  });
});
