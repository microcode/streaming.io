const { Registry } = require('./base');
const debug = require('debug')('streaming.io:registry:local');

class LocalRegistry extends Registry {
    async create(options) {
        return super.create(options);
    }

    async trigger(url) {
        await this.__invalidate(url);
        return super.trigger(url);
    }
}

exports.LocalRegistry = LocalRegistry;