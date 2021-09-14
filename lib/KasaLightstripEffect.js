let exec = require('child_process').exec;

const PLUGIN_NAME = 'homebridge-kasa-lightstrip';
const PLATFORM_NAME = 'HomebridgeKasaLightstrip';
const LIGHT_EFFECT_SERVICE = "smartlife.iot.lighting_effect"
const SET_LIGHT_EFFECT_METHOD = "set_lighting_effect"

class KasaLightstripEffect {
    constructor(log, config, effect, api, debug, uuid, device) {
        if(!config) return;

        this.log = log;
        this.config = config;
        this.api = api;
        this.device = device;

        this.name = this.config.name
        this.ip = this.config.ip;
        this.effect = effect;
        this.debug = debug;

        //Create Accessory if we've generated a new uuid;
        if ( uuid != undefined ) {
            this.device = new this.api.platformAccessory(this.name, uuid);
            this.device.category = this.api.hap.Categories.SWITCH;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.device]);
        }
        this.deviceService = this.device.getService(this.api.hap.Service.Switch) || this.device.addService(this.api.Service.Switch);

        this.log.info(`${this.name} [Switch: ${this.effect}] - Initialized`);
        this.debugLog(`${this.name} [Switch: ${this.effect}] uuid: [${this.device.UUID}]`);

        this.updateAllCharacteristic()
    }

    updateAllCharacteristic() {

        //On = boolean
        this.deviceService.getCharacteristic(this.api.hap.Characteristic.On)
        .onSet(async (state) => {
            this.debugLog(`SetEffect: 'kasa --host ${this.ip} --lightstrip raw-command ${LIGHT_EFFECT_SERVICE} ${SET_LIGHT_EFFECT_METHOD} ${effectJSON}'`);
            exec(`kasa --host ${this.ip} --lightstrip raw-command ${LIGHT_EFFECT_SERVICE} ${SET_LIGHT_EFFECT_METHOD} ${effectJSON}`, (err, stdout, stderr) => {
                if(err) {
                    this.log.info(`${this.name} - Error enabling effect ${this.effect}`);
                    this.debugLog(`SetEffect - Error - ${this.name} [Switch: ${this.effect}]: ${stderr.trim()}`);
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