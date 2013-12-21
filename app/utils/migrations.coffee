db = require("./db.js")
os = require("os")
path = require("path")
config = require("../../config/config.js")
LeapApp = require("../models/leap-app.js")


###
These are localStorage database migrations.  They're kicked off when the
bootstrapping code detects that the client's localStorage database schema is
out of date.

Each migration only goes from the previous version to the next version, so They
need to be run in order.
###
Migrations = [

  # Move single myApp Collection to myApp and uninstalledApps collections
  v0_to_v1 = ->
    uninstalledAppsJson = []
    myAppsJson = []
    appJsonList = db.fetchObj(config.DbKeys.InstalledApps) or []
    appJsonList.forEach sortApp = (appJson) ->
      if appJson.state is LeapApp.States.Uninstalled
        uninstalledAppsJson.push appJson
      else
        myAppsJson.push appJson

    db.saveObj config.DbKeys.InstalledApps, myAppsJson
    db.saveObj config.DbKeys.UninstalledApps, uninstalledAppsJson

  # Factor out home directory from user apps, so we check home dir on startup
  v1_to_v2 = ->
    myAppsJson = db.fetchObj config.DbKeys.InstalledApps
    uninstalledAppsJson = db.fetchObj config.DbKeys.UninstalledApps

    uninstalledAppsJson.forEach LeapApp.abstractUserHomeDir
    myAppsJson.forEach LeapApp.abstractUserHomeDir

    db.saveObj config.DbKeys.InstalledApps, myAppsJson
    db.saveObj config.DbKeys.UninstalledApps, uninstalledAppsJson

  v2_to_v3 = ->
    myAppsJson = db.fetchObj config.DbKeys.InstalledApps
    uninstalledAppsJson = db.fetchObj config.DbKeys.UninstalledApps

    _.extend(appJson, {cleaned: true}) for appJson in myAppsJson
    _.extend(appJson, {cleaned: true}) for appJson in uninstalledAppsJson

    db.saveObj config.DbKeys.InstalledApps, myAppsJson
    db.saveObj config.DbKeys.UninstalledApps, uninstalledAppsJson
]

# Migrate database to latest version
# Should be idempotent
migrate = ->
  db.saveObj config.DbKeys.DbVersion, 0  unless db.fetchObj(config.DbKeys.DbVersion)
  console.log "Checking if database needs to be migrated"
  currentDbVersion = db.fetchObj(config.DbKeys.DbVersion)
  if currentDbVersion < Migrations.length
    console.log "Migrating database from version " + currentDbVersion + " to version " + Migrations.length

    # Extract only the migrations that apply to the current db version.
    Migrations.slice(currentDbVersion).forEach applyMigration = (migration) ->
      migration()

    db.saveObj config.DbKeys.DbVersion, Migrations.length
  else
    console.log "Database already at version " + currentDbVersion

module.exports.migrate = migrate
