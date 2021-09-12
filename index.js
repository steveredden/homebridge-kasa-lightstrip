let exec = require('child_process').exec;
let Service, Characteristic, Homebridge, Accessory;

const PLUGIN_NAME = 'homebridge-kasa-lightstrip';
const PLATFORM_NAME = 'HomebridgeKasaLightstrip';

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Homebridge = homebridge;
    Accessory = homebridge.platformAccessory;
    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, KasaLightstripPluginPlatform, true);
};

class KasaLightstripPluginPlatform {
    constructor(log, config, api) {
        if (!config) return;

        this.log = log;
        this.api = api;
        this.config = config;
        this.debug = this.config.debug || false;

        if(this.api) this.api.on('didFinishLaunching', this.initAccessory.bind(this));
    }

    initAccessory() {
        //read from config.accessories
        if(this.config.accessories && Array.isArray(this.config.accessories)) {
            for (let lightstrip of this.config.accessories) {
                if(lightstrip) new KasaLightstripPlugin(this.log, lightstrip, this.api, this.debug);
            }
        } else if (this.config.accessories) {
            this.log.info('Cannot initialize. Type %s', typeof this.config.accessories);
        }

        if(!this.config.accessories) {
            this.log.info('Please add one or more accessories in your config');
        }
    }
}

class KasaLightstripPlugin {
    constructor(log, config, api, debug) {
        if(!config) return;

        this.log = log;
        this.config = config;
        this.api = api;

        this.lightstripname = this.config.lightstripname || 'Lightstrip'
        this.ip = this.config.ip;
        if(!this.ip) {
            this.log.error(`\n\nMissing IP for lightstrip accessory '${this.lightstripname}'`);
        }
        this.debug = debug;
        
        this.awake = false;
        this.brightness = 100;
        this.checkingOn = false;
        this.checkingBrightness = false;

        //Create Accessory
        const uuid = this.api.hap.uuid.generate('homebridge:kasa-lightstrip' + this.ip + this.lightstripname);
        this.device = new this.api.platformAccessory(this.lightstripname, uuid);
        this.device.category = this.api.hap.Categories.LIGHTBULB;
        this.deviceService = this.device.addService(Service.Lightbulb);
        this.deviceService.setCharacteristic(Characteristic.ConfiguredName, this.name);
        this.handleOn();
        this.handleBrightness();
        this.api.publishExternalAccessories(PLUGIN_NAME, [this.device]);
		this.log.info(this.lightstripname, `- Created`);
    }

    handleOn() {
        this.deviceService.getCharacteristic(Characteristic.On)
            .on('set', (state, callback) => {
                var translatedState = (state == true) ? "on":"off";
                this.debugLog(`Calling: 'kasa --host ${this.ip} --lightstrip ${translatedState}'`);
                exec(`kasa --host ${this.ip} --lightstrip ${translatedState}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.lightstripname, " - Error setting characteristic 'On'");
                        this.debugLog("handleOn - Error - " + stderr.trim());
                    }
                    this.deviceService.updateCharacteristic(Characteristic.On, state);
                })
                callback(null);
            }).on('get', (callback) => {
                this.checkPower(() => {
                    this.deviceService.setCharacteristic(Characteristic.On, this.awake);
                })
                callback(null, this.awake);
            })
    }

    checkPower(callback) {
        if(!this.checkingOn) {
            this.checkingOn = true;
            this.debugLog(`Calling:  kasa --host ${this.ip} --lightstrip`);
            exec(`kasa --host ${this.ip} --lightstrip`, (err, stdout, stderr) => {
                if(err) {
                    this.awake = 0;
                    if(callback) callback('error');
                } else {
                    stdout = stdout.split("\n");
                    this.debugLog(stdout[2].trim());
                    this.awake = stdout[2].includes("Device state: ON");
                    if(callback) callback(this.awake);
                }
                this.checkingOn = false;
            });
        }
    }

    handleBrightness() {
        this.deviceService.getCharacteristic(Characteristic.Brightness)
            .on('set', (state, callback) => {
                this.debugLog(`Calling: 'kasa --host ${this.ip} --lightstrip brightness ${state}'`);
                exec(`kasa --host ${this.ip} --lightstrip brightness ${state}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.lightstripname, " - Error setting characteristic 'Brightness'");
                        this.debugLog("handleBrightness - Error - " + stderr.trim());
                    }
                    this.deviceService.updateCharacteristic(Characteristic.Brightness, state);
                })
                callback(null);
            }).on('get', (callback) => {
                this.checkBrightness(() => {
                    this.deviceService.updateCharacteristic(Characteristic.Brightness, this.brightness);
                })
                callback(null, this.brightness);
            })
    }

    checkBrightness(callback) {
        if(!this.checkingBrightness) {
            this.checkingBrightness = true;
            this.debugLog(`Calling:  kasa --host ${this.ip} --lightstrip brightness`);
            exec(`kasa --host ${this.ip} --lightstrip brightness`, (err, stdout, stderr) => {
                if(err) {
                    this.brightness = undefined;
                    if(callback) callback('error');
                } else {
                    stdout = stdout.split("\n");
                    this.debugLog(stdout[0].trim());
                    this.brightness = stdout[0].split("Brightness: ")[1];
                    if(callback) callback(this.brightness);
                }
                this.checkingBrightness = false;
            });
        }
    }

    debugLog(text) {
        if(this.debug) this.log.info(`\x1b[2m${this.lightstripname} - ${text}\x1b[0m`)
    }
}