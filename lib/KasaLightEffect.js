let exec = require('child_process').exec;

const PLUGIN_NAME = 'homebridge-kasa-lightstrip';
const PLATFORM_NAME = 'HomebridgeKasaLightstrip';
const LIGHT_EFFECT_SERVICE = "smartlife.iot.lighting_effect"
const SET_LIGHT_EFFECT_METHOD = "set_lighting_effect"
const LIGHTING_EFFECTS = require('./light-effects/_All_Effects');

class KasaLightEffect {
    constructor(log, config, effect, api, debug, uuid, device, customName) {
        if(!config) return;

        this.log = log;
        this.config = config;
        this.effect = effect;
        this.api = api;
        this.debug = debug;
        this.uuid = uuid;
        this.device = device;

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.Categories = this.api.hap.Categories;

        if(customName != undefined) {
            this.effectJSON = this.effect;
            this.effect = customName;
        } else this.effectJSON = LIGHTING_EFFECTS[this.effect];

        this.effectJSON = String(this.effectJSON).replace(/ /g, "");  //ensure removal of all spaces

        this.name = this.config.name + " Effect: " + this.effect;
        this.ip = this.config.ip;

        //Create Accessory if we didn't find a matching device by uuid
        if ( this.device == undefined ) {
            this.device = new this.api.platformAccessory(this.name, this.uuid);
            this.device.category = this.Categories.SWITCH;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.device]);
        }
        this.deviceService = this.device.getService(this.Service.Switch) || this.device.addService(this.Service.Switch);

        this.log.info(`${this.name} - Initialized`);
        this.debugLog("uuid: [" + this.device.UUID + "]");
        this.debugLog("json payload: [" + this.effectJSON + "]");

        this.updateAllCharacteristic();
    }

    updateAllCharacteristic() {

        //On = boolean
        this.deviceService.getCharacteristic(this.Characteristic.On)
            .onSet(async (state) => {
                this.debugLog(`SetEffect: 'kasa --host ${this.ip} --lightstrip raw-command ${LIGHT_EFFECT_SERVICE} ${SET_LIGHT_EFFECT_METHOD} "${this.effectJSON}"'`);
                exec(`kasa --host ${this.ip} --lightstrip raw-command ${LIGHT_EFFECT_SERVICE} ${SET_LIGHT_EFFECT_METHOD} "${this.effectJSON}"`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(`${this.name} - Error enabling effect ${this.effect}`);
                        this.debugLog(`SetEffect - Error - ${this.name}: ${stderr.trim()}`);
                    }
                });
                setTimeout(() => {
                    this.deviceService.updateCharacteristic(this.Characteristic.On, false);
                    this.debugLog("SetEffect: turning off stateless switch");
                }, 1500);  //1.5 seconds
            }).onGet(async () => {
                const state = false;
                return state;
            });
    }

    debugLog(text) {
        if(this.debug) this.log.info(`\x1b[2m${this.name} - ${text}\x1b[0m`);
    }
}

module.exports = KasaLightEffect;