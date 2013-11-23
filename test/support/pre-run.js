var bootstrapController = require('../../app/bootstrap-controller.js');
var db = require('../../app/utils/db.js');

module.exports.run = function() {
  window.localStorage.clear();
};

window.__runApp = bootstrapController.run;
