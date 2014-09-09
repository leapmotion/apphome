fs = require("fs")
os = require("os")
path = require("path")
execFile = require('child_process').execFile

api = require("./api.js")
authorizationUtil = require("./authorization-util.js")
config = require("../../config/config.js")
db = require("./db.js")
i18n = require("./i18n.js")
ga = require("./ga.js")
qs = require("querystring")
oauth = require("./oauth.js")
popup = require("../views/popups/popup.js")
tutorial = require("./tutorial.js")
MainPage = require("../views/main-page/main-page.js")

LabModalView = require('../views/lab-modal/lab-modal.js')

appWindowBindings = ->
  uiGlobals.on uiGlobals.Event.SignIn, ->
    rebuildMenuBar true
    $('#loading-icon').css('visibility', 'hidden')

  uiGlobals.on uiGlobals.Event.Connecting, ->
    rebuildMenuBar false
    $('#loading-icon').css('visibility', 'visible')

  # This code redirects links in app description/changelog
  # markdown to open in the default browser, instead of
  # trying to open in node-webkit.
  $("body").on "click", "a", (evt) ->
    evt.preventDefault()
    href = $(this).attr("href")
    nwGui.Shell.openExternal href  if href

  nwGui.Window.get().on "close", ->
    @hide()
    @close true
    process.exit()

  process.on "exit", ga.trackClose

maximizeWindow = ->
  win = nwGui.Window.get()
  win.maximize()
  win.show()
  win.focus()

paintMainPage = ->
  if uiGlobals.mainPageView
    console.info "Redrawing main app"
    uiGlobals.mainPageView.$el.remove()
  uiGlobals.mainPageView = new MainPage()
  $("body").append uiGlobals.mainPageView.$el

buildFileMenu = ->
  fileMenu = new nwGui.Menu()
  fileMenu.append new nwGui.MenuItem(
    label: i18n.translate("Controller Settings")
    click: ->
      execFile(config.PlatformControlPanelPaths[os.platform()], ['--showsettings'])
  )
  fileMenu.append new nwGui.MenuItem(
    label: i18n.translate("Exit")
    click: ->
      nwGui.Window.get().emit "close"
  )
  new nwGui.MenuItem(
    label: i18n.translate("File")
    submenu: fileMenu
  )

buildAccountMenu = (enableLogOut, disableSetInstallDir) ->
  accountMenu = new nwGui.Menu()
  if uiGlobals.is_ghost
    accountMenu.append new nwGui.MenuItem(
      label: i18n.translate("Sign Up")
      click: ->
        oauth.getAccessToken (err, accessToken) ->
          unless err
            urlToLaunch = config.oauth.sign_up_url + '?' + qs.stringify(
              access_token: accessToken
              _r: config.AirspaceURL + '?sign_up=true'
            )
            nwGui.Shell.openExternal urlToLaunch
      enabled: !!enableLogOut
    )
  else
    accountMenu.append new nwGui.MenuItem(
      label: i18n.translate("Sign Out %1$s").fetch((if enableLogOut then (uiGlobals.display_name) else ""))
      click: authorizationUtil.logOutUser
      enabled: !!enableLogOut
    )
  accountMenu.append new nwGui.MenuItem(
    label: i18n.translate("Set Install Directory...")
    click: ->
      $("input#installLocation").trigger "click"

    enabled: not disableSetInstallDir
  )

  if _.keys(uiGlobals.labOptions).length
    accountMenu.append new nwGui.MenuItem
      label: i18n.translate 'Labs'
      click: ->
        (new LabModalView()).show()

  new nwGui.MenuItem(
    label: i18n.translate("Account")
    submenu: accountMenu
  )

buildHelpMenu = (enableLogOut) ->
  helpMenu = new nwGui.Menu()
  helpMenu.append new nwGui.MenuItem(
    label: i18n.translate("Getting Started...")
    click: ->
      nwGui.Shell.openExternal config.GettingStartedUrl
  )
  helpMenu.append new nwGui.MenuItem(
    label: i18n.translate("Launch Tutorial...")
    click: ->
      tutorial.start()
    enabled: !!enableLogOut # Only launch tutorial once apps have rendered
  )
  helpMenu.append new nwGui.MenuItem(
    label: i18n.translate("Community Forums...")
    click: ->
      nwGui.Shell.openExternal config.CommunityForumsUrl
  )
  helpMenu.append new nwGui.MenuItem(
    label: i18n.translate("Get Support...")
    click: ->
      nwGui.Shell.openExternal config.GetSupportUrl
  )

  if os.platform() is "win32"
    helpMenu.append new nwGui.MenuItem(
      label: i18n.translate("About Leap Motion App Home")
      click: ->
        popup.open "about"
    )
  else
    helpMenu.append new nwGui.MenuItem(
      label: i18n.translate("Controller Settings")
      click: ->
        nwGui.Shell.openItem config.PlatformControlPanelPaths[os.platform()]
    )

  new nwGui.MenuItem(
    label: i18n.translate("Help")
    submenu: helpMenu
  )

rebuildMenuBar = (enableLogOut, disableSetInstallDir) ->
  mainMenu = new nwGui.Menu(type: "menubar")

  if os.platform() is "win32"
    mainMenu.append buildFileMenu()

  mainMenu.append buildAccountMenu(enableLogOut, disableSetInstallDir)

  # Build from source because node webkit's implementation of the file picker
  # doesn't actually accept changes to the nwworkingdir attribute
  createFileInput = (defaultDir) ->
    $("input#installLocation").remove()
    $fileInput = $("<input>").attr(
      id: "installLocation"
      type: "file"
      nwdirectory: true
      nwworkingdir: defaultDir
      style: "display:none;"
    )
    $fileInput.appendTo "body"

  unless disableSetInstallDir
    nwworkingdir = db.fetchObj(config.DbKeys.AppInstallDir) or path.join.apply(null, config.PlatformAppDirs[os.platform()])
    console.log "Current install directory: " + nwworkingdir
    createFileInput nwworkingdir

  $("input#installLocation").change ->
    newAppDir = $(this).val()

    unless newAppDir
      console.log "Reported a blank new install location.  Not moving anything."
      return

    installLocationInput = $("input#installLocation")
    installLocationInput.remove()

    rebuildMenuBar enableLogOut, true

    console.log "Changing app install location to " + newAppDir
    db.saveObj config.DbKeys.AppInstallDir, newAppDir

    uiGlobals.myApps.move newAppDir, ->
      console.log "~~~~~~~~~~~~~ MOVE COMPLETE ~~~~~~~~~~~~~~"
      rebuildMenuBar enableLogOut, false

  helpMenuItem = buildHelpMenu(enableLogOut)

  # Need to do this first on windows for it to show up.  Not entirely sure why.
  if os.platform() is 'win32'
    mainMenu.append helpMenuItem

  # This command populates Edit and Window into the menubar.
  nwGui.Window.get().menu = mainMenu

  # Need to do this after on mac, so 'Help' shows up after 'Window'
  if os.platform() is 'darwin'
    mainMenu.append helpMenuItem

appWindowBindings()


module.exports.maximizeWindow = maximizeWindow
module.exports.rebuildMenuBar = rebuildMenuBar
module.exports.paintMainPage = paintMainPage
