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

                //loop through each lightstrp in array
                for (let lightstrip of this.config.accessories) {

                    //Lightbulbs
                    const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip );
                    let accessory = this.accessories.find(accessory => accessory.UUID === uuid)

                    if(!accessory) new KasaLightstrip(this.log, lightstrip, this.api, this.debug, uuid);         //doesn't already exist
                    else new KasaLightstrip(this.log, lightstrip, this.api, this.debug, undefined, accessory);   //re-initialize

                    //Lighting Effect Switches / "buttons"
                    for (let effect in lightstrip.effects) {

                        //Custom Effects
                        if(effect == "CustomEffects") {
                            //loop through each custom effect in array
                            for (let customEffect of lightstrip.effects[effect]) {

                                const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip + customEffect.name);
                                let accessory = this.accessories.find(accessory => accessory.UUID === uuid)

                                if(!accessory) new KasaLightEffect(this.log, lightstrip, customEffect.json, this.api, this.debug, uuid, undefined, customEffect.name);   //doesn't already exist
                                else new KasaLightEffect(this.log, lightstrip, customEffect.json, this.api, this.debug, undefined, accessory, customEffect.name);        //re-initialize
                            }
                            
                        //Pre-defined Kasa Effects
                        } else {
                        
                            const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip + effect);
                            let accessory = this.accessories.find(accessory => accessory.UUID === uuid)

                            if (lightstrip.effects[effect] !== true) {
                                if (accessory) this.removeAccessory(accessory);  //remove any existing, disabled effects
                                return;  //don't add effect if it's not enabled
                            }

                            if(!accessory) new KasaLightEffect(this.log, lightstrip, effect, this.api, this.debug, uuid);         //doesn't already exist
                            else new KasaLightEffect(this.log, lightstrip, effect, this.api, this.debug, undefined, accessory);   //re-initialize
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