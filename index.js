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
        
        this.on = false;
        this.brightness = 100;
        this.hue = 0;
        this.saturation = 0;

        this.checkingOn = false;
        this.checkingBrightness = false;
        this.checkingColor = false;

        //Create Accessory
        const uuid = this.api.hap.uuid.generate('homebridge:kasa-lightstrip' + this.ip + this.lightstripname);
        this.device = new this.api.platformAccessory(this.lightstripname, uuid);
        this.device.category = this.api.hap.Categories.LIGHTBULB;
        this.deviceService = this.device.addService(Service.Lightbulb);
        this.deviceService.setCharacteristic(Characteristic.ConfiguredName, this.name);
        this.handleOn();
        this.handleBrightness();
        this.handleHue();
        this.handleSaturation();
        this.api.publishExternalAccessories(PLUGIN_NAME, [this.device]);
		this.log.info(this.lightstripname, `- Created`);
    }

    handleOn() {
        this.deviceService.getCharacteristic(Characteristic.On)
            .on('set', (state, callback) => {
                var translatedState = (state == true) ? "on":"off";
                this.debugLog(`handleOn: 'kasa --host ${this.ip} --lightstrip ${translatedState}'`);
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
                    this.deviceService.setCharacteristic(Characteristic.On, this.on);
                })
                callback(null, this.on);
            })
    }

    checkPower(callback) {
        if(!this.checkingOn) {
            this.checkingOn = true;
            this.debugLog(`checkPower:  kasa --host ${this.ip} --lightstrip`);
            exec(`kasa --host ${this.ip} --lightstrip`, (err, stdout, stderr) => {
                if(err) {
                    this.on = false;
                    if(callback) callback('error');
                } else {
                    stdout = stdout.split("\n");
                    this.debugLog(stdout[2].trim());
                    this.on = stdout[2].includes("Device state: ON");
                    if(callback) callback(this.on);
                }
                this.checkingOn = false;
            });
        }
    }

    handleBrightness() {
        this.deviceService.getCharacteristic(Characteristic.Brightness)
            .on('set', (state, callback) => {
                this.debugLog(`handleBrightness: 'kasa --host ${this.ip} --lightstrip brightness ${state}'`);
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
            this.debugLog(`checkBrightness:  kasa --host ${this.ip} --lightstrip brightness`);
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

    handleHue() {
        this.deviceService.getCharacteristic(Characteristic.Hue)
            .on('set', (state, callback) => {
                this.debugLog(`handleHue: 'kasa --host ${this.ip} --lightstrip hsv ${state} ${this.saturation} ${this.brightness}'`);
                exec(`kasa --host ${this.ip} --lightstrip hsv ${state} ${this.saturation} ${this.brightness}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.lightstripname, " - Error setting characteristic 'Hue'");
                        this.debugLog("handleHue - Error - " + stderr.trim());
                    }
                    this.deviceService.updateCharacteristic(Characteristic.Hue, state);
                })
                callback(null);
            }).on('get', (callback) => {
                this.checkHue(() => {
                    this.deviceService.updateCharacteristic(Characteristic.Hue, this.hue);
                })
                callback(null, this.hue);
            })
    }

    checkHue(callback) {
        if(!this.checkingColor) {
            this.checkingColor = true;
            this.debugLog(`checkHue: 'kasa --host ${this.ip} --lightstrip hsv'`);
            exec(`kasa --host ${this.ip} --lightstrip hsv`, (err, stdout, stderr) => {
                if(err) {
                    this.hue = undefined;
                    if(callback) callback('error');
                } else {
                    stdout = stdout.split("\n");
                    this.debugLog(`Output: ${stdout[0].trim()}\nHue: ${(stdout[0].split("(")[1]).split(",")[0]}\nSaturation: ${(stdout[0].split("(")[1]).split(",")[1].trim()}`);
                    this.hue = (stdout[0].split("(")[1]).split(" ")[0];
                    this.saturation = (stdout[0].split("(")[1]).split(",")[1].trim();
                    if(callback) callback(this.hue);
                }
                this.checkingColor = false;
            });
        }
    }

    handleSaturation() {
        this.deviceService.getCharacteristic(Characteristic.Saturation)
            .on('set', (state, callback) => {
                this.debugLog(`handleSaturation: 'kasa --host ${this.ip} --lightstrip hsv ${this.hue} ${state} ${this.brightness}'`);
                exec(`kasa --host ${this.ip} --lightstrip hsv ${this.hue} ${state} ${this.brightness}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.lightstripname, " - Error setting characteristic 'Saturation'");
                        this.debugLog("handleSaturation - Error - " + stderr.trim());
                    }
                    this.deviceService.updateCharacteristic(Characteristic.Saturation, state);
                })
                callback(null);
            }).on('get', (callback) => {
                this.checkSaturation(() => {
                    this.deviceService.updateCharacteristic(Characteristic.Saturation, this.saturation);
                })
                callback(null, this.saturation);
            })
    }

    checkSaturation(callback) {
        if(!this.checkingColor) {
            this.checkingColor = true;
            this.debugLog(`checkSaturation: 'kasa --host ${this.ip} --lightstrip hsv'`);
            exec(`kasa --host ${this.ip} --lightstrip hsv`, (err, stdout, stderr) => {
                if(err) {
                    this.hue = undefined;
                    if(callback) callback('error');
                } else {
                    stdout = stdout.split("\n");
                    this.debugLog(`Output: ${stdout[0].trim()}\nHue: ${(stdout[0].split("(")[1]).split(",")[0]}\nSaturation: ${(stdout[0].split("(")[1]).split(",")[1].trim()}`);
                    this.hue = (stdout[0].split("(")[1]).split(" ")[0];
                    this.saturation = (stdout[0].split("(")[1]).split(",")[1].trim();
                    if(callback) callback(this.saturation);
                }
                this.checkingColor = false;
            });
        }
    }

    debugLog(text) {
        if(this.debug) this.log.info(`\x1b[2m${this.lightstripname} - ${text}\x1b[0m`)
    }
}