const KasaLightstrip = require("./KasaLightstrip");
const KasaLightEffect = require("./KasaLightEffect");

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
                    for (let effect in lightstrip.effects) {
                        if(effect == "CustomEffects") {
                            for (let customEffect of lightstrip.effects[effect]) {

                                const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip + customEffect.name);
                                let accessory = this.accessories.find(accessory => accessory.UUID === uuid)

                                if(!accessory) new KasaLightEffect(this.log, lightstrip, customEffect.json, this.api, this.debug, uuid, undefined, customEffect.name);
                                else new KasaLightEffect(this.log, lightstrip, customEffect.json, this.api, this.debug, undefined, accessory, customEffect.name);
                            }
                        } else {
                            let value = lightstrip.effects[effect];
                        
                            const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip + effect);
                            let accessory = this.accessories.find(accessory => accessory.UUID === uuid)

                            //don't add effect if it's not enabled, and also remove any existing accessories
                            if (value !== true) {
                                if (accessory) this.removeAccessory(accessory);
                                return;
                            }

                            if(!accessory) new KasaLightEffect(this.log, lightstrip, effect, this.api, this.debug, uuid);
                            else new KasaLightEffect(this.log, lightstrip, effect, this.api, this.debug, undefined, accessory);
                        }
                    }
                }
            }
        });
    }

    configureAccessory(accessory) {
        this.accessories.push(accessory);
        this.log.info(`Restored ${accessory.displayName} [${accessory.UUID}]`);
    }

    removeAccessory(accessory) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.info(`Removed ${accessory.displayName} [${accessory.UUID}]`);
    }
}

module.exports = KasaLightstripPlatform;