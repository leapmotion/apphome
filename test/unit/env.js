// This file creates the minimum requirements for
// tests that depend on Backbone but that don't
// require a DOM

var window = global.window = {};
window._ = global._ = require('underscore');
window.Backbone = require('backbone');
global.assert = require('assert');
