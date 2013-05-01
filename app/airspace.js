var PageContainerView = require('./views/page-container/view.js');
var uiGlobals = require('./ui-globals.js');

$(window.document).ready(function() {
  global.uiGlobals = uiGlobals;
  $('body').append((new PageContainerView()).$el);
});
