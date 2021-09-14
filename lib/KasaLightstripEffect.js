let exec = require('child_process').exec;

const PLUGIN_NAME = 'homebridge-kasa-lightstrip';
const PLATFORM_NAME = 'HomebridgeKasaLightstrip';
const LIGHT_EFFECT_SERVICE = "smartlife.iot.lighting_effect"
const SET_LIGHT_EFFECT_METHOD = "set_lighting_effect"
const LIGHTING_EFFECTS = require('./light-effects/_All_Effects');

class KasaLightstripEffect {
    constructor(log, config, effect, api, debug, uuid, device, customName) {
        if(!config) return;

        this.log = log;
        this.config = config;
        this.effect = effect;
        this.api = api;
        this.debug = debug;
        this.device = device;

        if(customName != undefined) {
            this.effectJSON = this.effect;
            this.effect = customName;
        } else this.effectJSON = LIGHTING_EFFECTS[this.effect];

        this.name = this.config.name + " Effect: " + this.effect;
        this.ip = this.config.ip;

        //Create Accessory if we've generated a new uuid;
        if ( uuid != undefined ) {
            this.device = new this.api.platformAccessory(this.name, uuid);
            this.device.category = this.api.hap.Categories.SWITCH;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.device]);
        }
        this.deviceService = this.device.getService(this.api.hap.Service.Switch) || this.device.addService(this.api.hap.Service.Switch);

        this.log.info(`${this.name} - Initialized`);
        this.debugLog("uuid: [" + this.device.UUID + "]");
        this.debugLog("json payload: [" + this.effectJSON + "]");

        this.updateAllCharacteristic()
    }

    updateAllCharacteristic() {

        //On = boolean
        this.deviceService.getCharacteristic(this.api.hap.Characteristic.On)
        .onSet(async (state) => {
            this.debugLog(`SetEffect: 'kasa --host ${this.ip} --lightstrip raw-command ${LIGHT_EFFECT_SERVICE} ${SET_LIGHT_EFFECT_METHOD} "${this.effectJSON}"'`);
            exec(`kasa --host ${this.ip} --lightstrip raw-command ${LIGHT_EFFECT_SERVICE} ${SET_LIGHT_EFFECT_METHOD} "${this.effectJSON}"`, (err, stdout, stderr) => {
                if(err) {
                    this.log.info(`${this.name} - Error enabling effect ${this.effect}`);
                    this.debugLog(`SetEffect - Error - ${this.name}: ${stderr.trim()}`);
                }
            });
        }).onGet(async () => {
            return false;
        });
    }

    debugLog(text) {
        if(this.debug) this.log.info(`\x1b[2m${this.name} - ${text}\x1b[0m`);
    }
}

module.exports = KasaLightstripEffect;