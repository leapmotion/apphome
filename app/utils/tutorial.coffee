fs = require 'fs'
os = require 'os'

oauth = require './oauth.js'
qs = require 'querystring'
i18n = require './i18n.js'
config = require '../../config/config.js'
ga = require('./ga.js');

guidesMade = false

makeGuides = ->
  guiders.createGuider
    buttons: [
      name: String i18n.translate 'Launch Playground'
      classString: 'orientation fa fa-rocket'
      onclick: ->
        do _launchOrientation
        setTimeout ->
          do guiders.next
        , 1000
    ,
      name: String i18n.translate 'Next'
      classString: 'next'
      onclick: guiders.next
    ]
    title: String i18n.translate "Tip 1: Leap Motion Basics"
    description: String i18n.translate "Learn the basics of how to use the Leap Motion Controller by going through Playground."
    id: 'g_orientation'
    next: 'g_apps'
    heading: String i18n.translate 'Welcome to Leap Motion App Home'
    attachTo: '#playground'
    position: 6
    onClose: onClose
    onShow: ->
      uiGlobals.trigger 'goto', 0, true

  guiders.createGuider
    buttons: [
      name: 'Launch OS control'
      classString: 'orientation fa fa-rocket guiders_app_button'
      onclick: ->
        $(config.OsControlApps).eq(0).click()
    ,
      name: String i18n.translate 'Back'
      classString: 'back'
      onclick: guiders.prev
    ,
      name: String i18n.translate 'Next'
      classString: 'next'
      onclick: guiders.next
    ]
    title: String i18n.translate "Tip 2: Starter Apps"
    description: String i18n.translate "We thought you’d like to dive right in, so we handpicked some free apps for you."
    appDescription: ' '
    id: 'g_apps'
    next: 'g_store'
    attachTo: config.OsControlApps
    attachToAlternative: '.tile.store:first'
    position: 6
    onClose: onClose
    onShow: (guider) ->
      appName = $(config.OsControlApps).find('.name:first').html()
      $(guider.elem).find('.guiders_app_description').html(String i18n.translate("Try the %1$s app first and control your music, scrolling, and desktop windows in a brand new way!").fetch(appName))
      $(guider.elem).find('.guiders_app_button').html(String i18n.translate('Launch %1$s').fetch(appName))
      uiGlobals.trigger 'goto', $('.slides-holder .slide').index($(config.OsControlApps).closest('.slide').eq(0)), true

  guiders.createGuider
    buttons: [
      name: String i18n.translate 'Back'
      classString: 'back'
      onclick: guiders.prev
    ,
      name: String i18n.translate 'Launch App Store'
      classString: 'primary'
      onclick: ->
        oauth.getAccessToken (err, accessToken) ->
          unless err
            nwGui.Shell.openExternal(config.AuthWithAccessTokenUrl + '?' + qs.stringify({ access_token: accessToken, _r: config.AirspaceURL }))
        do guiders.hideAll
    ]
    title: String i18n.translate "Tip 3: Ready for More?"
    description: String i18n.translate "Visit the App Store to discover and download 200+ games, educational tools, and music apps, and more."
    id: 'g_store'
    title: String i18n.translate 'Discover new apps'
    attachTo: '#leap-motion-app-store'
    position: 3
    onClose: onClose
    onShow: ->
      uiGlobals.trigger 'goto', 0, true
    onHide: ->
      ga.trackEvent 'tutorial/oobe/finished'
      uiGlobals.inTutorial = false

  # Change the bubble position after browser gets resized
  _resizing = undefined
  $(window).resize ->
    clearTimeout(_resizing)  if _resizing?

    _resizing = setTimeout ->
      _resizing = undefined
      if guiders?
        do guiders.reposition
    , 20

  guidesMade = true

onClose = ->
  ga.trackEvent 'tutorial/oobe/closed'
  uiGlobals.inTutorial = false

_launchOrientation =  ->
  orientationPath = config.PlatformOrientationPaths[os.platform()]
  if orientationPath and fs.existsSync orientationPath
    nwGui.Shell.openItem orientationPath
    ga.trackEvent 'tutorial/oobe/started_orientation'

start = ->
  unless guidesMade
    do makeGuides

  unless uiGlobals.inTutorial
    uiGlobals.inTutorial = true
    guiders.show 'g_orientation'


module.exports.start = start
