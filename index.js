const KasaLightstripPlatform = require('./lib/KasaLightstripPlatform')

module.exports = function (api) {
    api.registerPlatform('HomebridgeKasaLightstrip', KasaLightstripPlatform)
}