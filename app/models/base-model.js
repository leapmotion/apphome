module.exports = window.Backbone.Model.extend({

  sync: function() {
    throw new Error('sync call slipped through');
  }
});
