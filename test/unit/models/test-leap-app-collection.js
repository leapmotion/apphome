require('../env.js');
var LeapAppCollection = require('../../../app/models/leap-app-collection.js');

var collection;

describe('pagination', function() {

  before(function() {
    collection = new LeapAppCollection();
    for (var i = 0; i < 10; i++) {
      collection.add({
        id: 'builtin_fake_' + i,
        myNdx: i,
        is_builtin: true
      })
    }
  });

  describe('getPageModels', function() {
    it('should return the correct models for first page', function() {
      var models = collection.getPageModels(0, 3);
      assert.equal(models.length, 3, 'correct number of models');
      assert.equal(models[0].get('myNdx'), 0, 'correct first model');
      assert.equal(models[2].get('myNdx'), 2, 'correct last model on page');
    });

    it('should return the correct models for later pages', function() {
      var models = collection.getPageModels(2, 3);
      assert.equal(models.length, 3, 'correct number of models');
      assert.equal(models[0].get('myNdx'), 6, 'correct first model');
      assert.equal(models[2].get('myNdx'), 8, 'correct last model on page');
    });

    it('should permit unfilled pages', function() {
      var models = collection.getPageModels(0, 100);
      assert.equal(models.length, 10, 'correct number of models');
    });

    it('should return empty array for invalid pages', function() {
      models = collection.getPageModels(-1, 3);
      assert.equal(models.length, 0, 'negative page has zero models');

      var models = collection.getPageModels(200, 3);
      assert.equal(models.length, 0, 'far future page has zero models');
    });
  });

  describe('pageCount', function() {

    it('should return correct page count', function() {
      assert.equal(collection.pageCount(2), 5, 'small page');
      assert.equal(collection.pageCount(3), 4, 'medium page');
      assert.equal(collection.pageCount(50), 1, 'large page');
    });

    it('should return zero for invalid inputs', function() {
      assert.equal(collection.pageCount(0), 0, 'no divide by zero');
      assert.equal(collection.pageCount('hi'), 0, 'non number');
    });

  });


  describe('whichPage', function() {

    it('should return correct page for a given model', function() {
      assert.equal(collection.whichPage(collection.at(0), 3), 0, 'first');
      assert.equal(collection.whichPage(collection.at(2), 3), 0, 'third');
      assert.equal(collection.whichPage(collection.at(3), 3), 1, 'fourth');
      assert.equal(collection.whichPage(collection.at(5), 3), 1, 'sixth');
      assert.equal(collection.whichPage(collection.last(), 3), 3, 'last');
    });

    it('should return correct page when passed an index number', function() {
      assert.equal(collection.whichPage(4, 3), 1, 'by index');
      assert.equal(collection.whichPage(-5, 3), 0, 'should not be lower than 0');
      assert.equal(collection.whichPage(600, 3), 3, 'should not be higher than last page');
    });
  });

});
