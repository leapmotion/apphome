var os = require('os');

function escapeBash(string) {
  return "'" + String(string).replace(/'/g, "'\"'\"'") + "'";
}

function escapeWindows(string) {
  return String(string).replace(/([\(\)%!\^"<>&\|])/g, '^$1');
}

module.exports.escape = (os.platform() === 'win32' ? escapeWindows : escapeBash);
