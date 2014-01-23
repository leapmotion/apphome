var startup = require('../../app/startup.js');
var db = require('../../app/utils/db.js');

module.exports.run = function() {
  window.localStorage.clear();
};

window.__runApp = startup.run;
