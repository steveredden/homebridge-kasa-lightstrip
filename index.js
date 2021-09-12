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

        this.name = this.config.name || 'Lightstrip'
        this.ip = this.config.ip;
        if(!this.ip) {
            this.log.error(`\n\nMissing IP for lightstrip accessory '${this.name}'`);
        }
        this.debug = debug;
        
        this.onStatus = false;
        this.brightness = 100;
        this.hue = 0;
        this.saturation = 0;

        this.tempHue = undefined;
        this.tempSaturation = undefined;

        this.checkingOn = false;
        this.checkingBrightness = false;
        this.checkingHSV = false;

        //Create Accessory
        const uuid = this.api.hap.uuid.generate('homebridge:kasa-lightstrip' + this.ip + this.name);
        this.device = new this.api.platformAccessory(this.name, uuid);
        this.device.category = this.api.hap.Categories.LIGHTBULB;
        this.deviceService = this.device.addService(Service.Lightbulb);
        this.deviceService.setCharacteristic(Characteristic.ConfiguredName, this.name);
        this.handlePower();
        this.handleBrightness();
        this.handleHue();
        this.handleSaturation();
        this.api.publishExternalAccessories(PLUGIN_NAME, [this.device]);

		this.log.info(this.name, `- Created`);
    }

    handlePower() {
        this.deviceService.getCharacteristic(Characteristic.On)
            .onSet(async (state) => {
                var translatedState = (state == true) ? "on":"off";
                this.debugLog(`SetPower: 'kasa --host ${this.ip} --lightstrip ${translatedState}'`);
                exec(`kasa --host ${this.ip} --lightstrip ${translatedState}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.name, " - Error setting characteristic 'On'");
                        this.debugLog("SetPower - Error - " + stderr.trim());
                    }
                    this.deviceService.updateCharacteristic(Characteristic.On, state);
                })
            }).onGet(async () => {
                if(!this.checkingOn) {
                    this.checkingOn = true;
                    this.debugLog(`GetPower: 'kasa --host ${this.ip} --lightstrip'`);
                    exec(`kasa --host ${this.ip} --lightstrip`, (err, stdout, stderr) => {
                        if(err) {
                            this.onStatus = false;
                            this.debugLog("GetPower - Error - " + stderr.trim());
                        } else {
                            stdout = stdout.split("\n");
                            this.debugLog(stdout[2].trim());
                            this.onStatus = stdout[2].includes("Device state: ON");
                        }
                        this.checkingOn = false;
                    });
                }
                return this.onStatus;
            });
    }

    handleBrightness() {
        this.deviceService.getCharacteristic(Characteristic.Brightness)
            .onSet(async (state) => {
                this.debugLog(`SetBrightness: 'kasa --host ${this.ip} --lightstrip brightness ${state}'`);
                exec(`kasa --host ${this.ip} --lightstrip brightness ${state}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.name, " - Error setting characteristic 'Brightness'");
                        this.debugLog("handleBrightness - Error - " + stderr.trim());
                    }
                    this.deviceService.updateCharacteristic(Characteristic.Brightness, state);
                })
            }).onGet(async () => {
                if(!this.checkingBrightness) {
                    this.checkingBrightness = true;
                    this.debugLog(`GetBrightness: 'kasa --host ${this.ip} --lightstrip brightness'`);
                    exec(`kasa --host ${this.ip} --lightstrip brightness`, (err, stdout, stderr) => {
                        if(err) {
                            this.brightness = 100;
                            this.debugLog("GetBrightness - Error - " + stderr.trim());
                        } else {
                            stdout = stdout.split("\n");
                            this.debugLog(stdout[0].trim());
                            this.brightness = stdout[0].split("Brightness: ")[1];
                        }
                        this.checkingBrightness = false;
                    });
                }
                return this.brightness;
            });
    }

    handleHue() {
        this.deviceService.getCharacteristic(Characteristic.Hue)
            .onSet(async (state) => {
                this.tempHue = state;
                await this.tempSaturation != undefined;
                this.SetColor();
            }).onGet(async () => {
                if(!this.checkingHSV) {
                    this.checkingHSV = true;
                    this.debugLog(`GetHue: 'kasa --host ${this.ip} --lightstrip hsv'`);
                    exec(`kasa --host ${this.ip} --lightstrip hsv`, (err, stdout, stderr) => {
                        if(err) {
                            this.hue = 0;
                            this.debugLog("GetHue - Error - " + stderr.trim());
                        } else {
                            stdout = stdout.split("\n");
                            this.debugLog(stdout[0].trim());  //expects "Current HSV: ($h, $s, $b)"
                            this.hue = (stdout[0].split("(")[1]).split(",")[0].trim();
                            this.saturation = (stdout[0].split("(")[1]).split(",")[1].trim();
                        }
                        this.checkingHSV = false;
                    });
                }
                this.deviceService.updateCharacteristic(Characteristic.Saturation, this.saturation);
                return this.hue;
            });
    }

    handleSaturation() {
        this.deviceService.getCharacteristic(Characteristic.Saturation)
            .onSet(async (state) => { 
                this.tempSaturation = state;
                //let handleHue handle updating the characteristic
            }).onGet(async () => {
                //do nothing; let handleHue handle the value
                return this.saturation;
            });
    }

    SetColor() {
        if(this.tempHue != undefined && this.tempSaturation != undefined) {
            let hue = this.tempHue
            let saturation = this.tempSaturation
            this.debugLog(`SetColor: 'kasa --host ${this.ip} --lightstrip hsv ${hue} ${saturation} ${this.brightness}'`);
            exec(`kasa --host ${this.ip} --lightstrip hsv ${hue} ${saturation} ${this.brightness}`, (err, stdout, stderr) => {
                if(err) {
                    this.log.info(this.name, " - Error setting characteristic 'Hue/Saturation'");
                    this.debugLog("SetColor - Error - " + stderr.trim());
                }
                this.deviceService.updateCharacteristic(Characteristic.Hue, hue);
                this.deviceService.updateCharacteristic(Characteristic.Saturation, saturation);
            })
            this.tempHue = undefined;
            this.tempSaturation = undefined;
        }
    }

    debugLog(text) {
        if(this.debug) this.log.info(`\x1b[2m${this.name} - ${text}\x1b[0m`)
    }
}