const KasaLightstrip = require("./KasaLightstrip");
const KasaLightstripEffect = require("./KasaLightstripEffect");

const PLUGIN_NAME = 'homebridge-kasa-lightstrip';
const PLATFORM_NAME = 'HomebridgeKasaLightstrip';

class KasaLightstripPlatform {
    constructor(log, config, api) {
        if (!config || !Array.isArray(config.accessories)) return;

        this.accessories = [];

        this.log = log;
        this.config = config;
        this.api = api;
        this.debug = this.config.debug || false;

        this.api.on('didFinishLaunching', () => {
            if(this.config.accessories && Array.isArray(this.config.accessories)) {
                for (let lightstrip of this.config.accessories) {

                    //Lightbulbs
                    const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip );
                    let accessory = this.accessories.find(accessory => accessory.UUID === uuid)
                    if(!accessory) new KasaLightstrip(this.log, lightstrip, this.api, this.debug, uuid);
                    else new KasaLightstrip(this.log, lightstrip, this.api, this.debug, undefined, accessory);

                    //Lighting Effect Switches
                    for (let effect of lightstrip.effects) {
                        const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip + lightstrip.effects.effect);
                        let accessory = this.accessories.find(accessory => accessory.UUID === uuid)
                        if(!accessory) new KasaLightstripEffect(this.log, lightstrip, this.api, this.debug, uuid);
                        else new KasaLightstripEffect(this.log, lightstrip, this.api, this.debug, undefined, accessory);
                    }
                }
            }
        });
    }

    configureAccessory(accessory) {
        this.accessories.push(accessory);
        this.log.info(`Restored ${accessory.displayName} [${accessory.UUID}]`);
    }
}

module.exports = KasaLightstripPlatform;