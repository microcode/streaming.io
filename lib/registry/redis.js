"use strict";

var redis = require('redis'),
    local = require('./local'),
    _ = require('underscore'),
    debug = require('debug')("streaming.io:registry"),
    async = require('async');

var Registry = function () {
};

Registry.prototype.create = function (options, callback) {
    options = options || {};

    debug("creating redis registry");

    this.prefix = options.config.registry.redis.prefix;

    async.series([
        function (callback) {
            debug("setting up local registry");
            local.create(options, callback);
        }.bind(this),
        function (callback) {
            debug("resolving redis service");
            options.resolve("redis", options.config.registry.redis.host, function (err, service) {
                if (err) {
                    callback(err);
                    return;
                }

                var subscriptionClient = this.subscriptionClient = redis.createClient(service.port, service.host);
                var commandClient = this.commandClient = redis.createClient(service.port, service.host);

                subscriptionClient.on('subscribe', function (channel, count) {
                    debug("subscribed to '%s' (%d subscribers)", channel, count);
                });

                subscriptionClient.on('unsubscribe', function (channel, count) {
                    debug("unsubscribed from '%s'", channel);
                });

                subscriptionClient.on('message', _.bind(this.onMessage, this));

                subscriptionClient.on('ready', function () {
                    debug("redis - subscription connection ready");
                    subscriptionClient.subscribe(this.prefix + 'triggers');
                }.bind(this));

                commandClient.on('ready', function () {
                    debug("redis - command connection ready");
                });

                subscriptionClient.on('error', function (error) {
                    debug("error in subscription connection:", error);
                });

                commandClient.on('error', function (error) {
                    debug("error in command connection", error);
                });

                callback(null);
            }.bind(this));
        }.bind(this)
    ], callback);
};

Registry.prototype.addSocket = function () {
    local.addSocket.apply(local, arguments);
};

Registry.prototype.removeSocket = function () {
    local.removeSocket.apply(local, arguments);
};

Registry.prototype.addSubscription = function () {
    local.addSubscription.apply(local, arguments);
};

Registry.prototype.removeSubscription = function () {
    local.removeSubscription.apply(local, arguments);
};

Registry.prototype.trigger = function (url) {
    if (!this.commandClient) {
        return;
    }

    this.commandClient.publish(this.prefix + 'triggers', url);
};

Registry.prototype.onMessage = function (channel, message) {
    local.trigger(message);
};

module.exports = new Registry();
