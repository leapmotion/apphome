fs = require 'fs'
os = require 'os'

i18n = require './i18n.js'
config = require '../../config/config.js'
ga = require('./ga.js');

guidesMade = false

makeGuides = ->
  guiders.createGuider
    buttons: [
      name: String i18n.translate 'Take a quick tour'
      classString: 'primary'
      onclick: guiders.next
    ]
    classString: 'primary'
    description: String i18n.translate 'Launch all of your Leap Motion-powered apps and access the store to discover new ones.'
    id: 'g_start'
    next: 'g_orientation'
    title: String i18n.translate 'Welcome to Leap Motion App Home!'
    xButton: true
    onClose: onClose

  guiders.createGuider
    buttons: [
      name: String i18n.translate 'Launch Orientation'
      classString: 'next'
      onclick: ->
        do _launchOrientation
        tilesReady = setInterval ->
          if $('.tile.store').length
            clearInterval tilesReady
            do guiders.next
        , 50
    ]
    description: String i18n.translate "Reach out and experience what your device can do with the Orientation app."
    id: 'g_orientation'
    next: 'g_apps'
    title: String i18n.translate 'Learn About the Controller'
    attachTo: '#orientation'
    position: 6
    highlight: '#orientation'
    onClose: onClose

  guiders.createGuider
    buttons: [
      name: String i18n.translate 'Back'
      classString: 'back'
      onclick: guiders.prev
    ,
      name: String i18n.translate 'Next'
      classString: 'next'
      onclick: guiders.next
    ]
    description: String i18n.translate "We've set you up with some great apps for free to get you started. It's time to play, create, and explore."
    id: 'g_apps'
    next: 'g_store'
    title: String i18n.translate 'Try your new apps'
    attachTo: '.tile.store' # picks the first one
    position: 6
    highlight: '.tile.store'
    onClose: onClose

  guiders.createGuider
    buttons: [
      name: String i18n.translate 'Back'
      classString: 'back'
      onclick: guiders.prev
    ,
      name: String i18n.translate 'Done'
      classString: 'primary'
      onclick: guiders.hideAll
    ]
    description: String i18n.translate "Leap Motion App Store is the place for you to browse and download the latest games, creative tools, and more."
    id: 'g_store'
    title: String i18n.translate 'Discover new apps'
    attachTo: '#airspace-store'
    position: 3
    highlight: '#airspace-store'
    onClose: onClose
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
    uiGlobals.trigger 'goto', 0
    guiders.show 'g_start'


module.exports.start = start
