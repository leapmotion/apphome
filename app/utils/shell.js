var os = require('os');

function escapeBash(string) {
  return "'" + String(string).replace(/'/g, "'\"'\"'") + "'";
}

function escapeWindows(string) {
  // based on http://www.robvanderwoude.com/escapechars.php
  return '"' + String(string).replace(/([\^<>\|])/g, '^$1').replace(/\%/g, '%%') + '"';
}

module.exports.escape = (os.platform() === 'win32' ? escapeWindows : escapeBash);
