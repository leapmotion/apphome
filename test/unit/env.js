// This file creates the minimum requirements for
// tests that depend on Backbone but that don't
// require a DOM

var window = global.window = {};

function blankFn() {
}

window.localStorage = {
  setItem: blankFn,
  getItem: blankFn,
  removeItem: blankFn,
  clear: blankFn,
  key: blankFn,
  length: blankFn
}

window.document = global.document = {
  createElement: function() {
    return {
      style: {}
    };
  },
  getElementsByTagName: function() {
    return [
      {
        appendChild: blankFn
      }
    ]
  }
};

window._ = global._ = require('underscore');
window.Backbone = require('backbone');
global.assert = require('assert');
global.uiGlobals = require('../../app/ui-globals.js');
