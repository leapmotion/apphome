config = require("../../config/config.js")
domain = require("domain")
events = require("events")
pubnubInit = window.PUBNUB and window.PUBNUB.init


pubnubSubscriptions = {}
pubnub = undefined
pubnubDomain = domain.create()

pubnubDomain.on "error", (err) ->
  console.warn "PubNub error: " + (err.stack or err)
  unsubscribeAll true

pubnubDomain.run ->
  if pubnubInit
    pubnub = pubnubInit(
      subscribe_key: config.PubnubSubscribeKey
      ssl: true
      jsonp: true # force http transport to work better with http proxies
    )
  else
    # stub for tests
    pubnub =
      subscribe: ->

      unsubscribe: ->

unsubscribeAll = (resubscribe) ->
  subscribedChannels = Object.keys(pubnubSubscriptions)
  subscribedChannels.forEach (channel) ->
    console.log "Unsubscribing from PubNub channel: " + channel
    pubnubDomain.run ->
      pubnub.unsubscribe channel: channel

  if resubscribe
    savedSubscriptions = pubnubSubscriptions
    pubnubSubscriptions = {}
    subscribedChannels.forEach (channel) ->
      subscribe channel, savedSubscriptions[channel]
  else
    pubnubSubscriptions = {}

subscribe = (channel, callback) ->
  unless pubnubSubscriptions[channel] # only allow one subscription per channel
    pubnubSubscriptions[channel] = callback
    pubnubDomain.run ->
      pubnub.subscribe
        channel: channel
        callback: (data) ->
          try
            callback data
          catch err
            console.warn "Failed to handle PubNub message on channel \"" + channel + "\": " + data
    return true
  else
    console.warn "Ignoring duplicate subscription on channel \"" + channel + "\"."
    return false

history = (count, channel, callback) ->
  unless pubnubSubscriptions[channel] # only allow one subscription per channel
    pubnubSubscriptions[channel] = callback
    pubnubDomain.run ->
      pubnub.history
        count: count
        channel: channel
        callback: (data) ->
          try
            callback data
          catch err
            console.warn "Failed to handle PubNub message on channel \"" + channel + "\": " + data


    return true
  else
    console.warn "Ignoring duplicate subscription on channel \"" + channel + "\"."
    return false



module.exports.domain = pubnubDomain
module.exports.subscribe = subscribe
module.exports.history = history
module.exports.unsubscribeAll = unsubscribeAll
