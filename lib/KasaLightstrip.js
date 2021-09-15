let exec = require('child_process').exec;

const PLUGIN_NAME = 'homebridge-kasa-lightstrip';
const PLATFORM_NAME = 'HomebridgeKasaLightstrip';

class KasaLightstrip {
    constructor(log, config, api, debug, uuid, device) {
        if(!config) return;

        this.log = log;
        this.config = config;
        this.api = api;
        this.debug = debug;
        this.device = device;

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.Categories = this.api.hap.Categories;

        this.name = this.config.name
        this.ip = this.config.ip;
        
        this.onStatus = false;
        this.brightness = 100;
        this.hue = 0;
        this.saturation = 0;

        this.tempHue = undefined;
        this.tempSaturation = undefined;

        this.checkingOn = false;
        this.checkingBrightness = false;
        this.checkingHSV = false;

        //Create Accessory if we've generated a new uuid;
        if ( uuid != undefined ) {
            this.device = new this.api.platformAccessory(this.name, uuid);
            this.device.category = this.Categories.LIGHTBULB;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.device]);
        }
        this.deviceService = this.device.getService(this.Service.Lightbulb) || this.device.addService(this.Service.Lightbulb);

        this.log.info(this.name + " - Initialized");
        this.debugLog("uuid: [" + this.device.UUID + "]");
        
        this.updateAllCharacteristics();
    }

    updateAllCharacteristics() {

        //On = boolean
        this.deviceService.getCharacteristic(this.Characteristic.On)
            .onSet(async (state) => {
                var translatedState = (state == true) ? "on":"off";
                this.debugLog(`SetPower: 'kasa --host ${this.ip} --lightstrip ${translatedState}'`);
                exec(`kasa --host ${this.ip} --lightstrip ${translatedState}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.name + " - Error setting characteristic 'On'");
                        this.debugLog("SetPower - Error - " + this.name + ": " + stderr.trim());
                    }
                    this.onStatus = state;
                });
            }).onGet(async () => {
                if(!this.checkingOn) {
                    this.checkingOn = true;
                    this.debugLog(`GetPower: 'kasa --host ${this.ip} --lightstrip'`);
                    exec(`kasa --host ${this.ip} --lightstrip`, (err, stdout, stderr) => {
                        if(err) {
                            this.log.info(this.name + " - Error getting characteristic 'On'");
                            this.debugLog("GetPower - Error - " + this.name + ": " + stderr.trim());
                        } else {
                            stdout = stdout.split("\n")[2].trim();
                            this.debugLog(stdout);
                            this.onStatus = stdout.includes("Device state: ON");
                            this.deviceService.updateCharacteristic(this.Characteristic.On, this.onStatus);   //keep in sync in case the light was turned on elsewhere
                        }
                        this.checkingOn = false;
                    });
                }
                return this.onStatus;
            });
    
        //Brightness = int
        this.deviceService.getCharacteristic(this.Characteristic.Brightness)
            .onSet(async (state) => {
                this.debugLog(`SetBrightness: 'kasa --host ${this.ip} --lightstrip brightness ${state}'`);
                exec(`kasa --host ${this.ip} --lightstrip brightness ${state}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.name + " - Error setting characteristic 'Brightness'");
                        this.debugLog("SetBrightness - Error - " + this.name + ": " + stderr.trim());
                    }
                    this.brightness = state;
                });
            }).onGet(async () => {
                if(!this.checkingBrightness) {
                    this.checkingBrightness = true;
                    this.debugLog(`GetBrightness: 'kasa --host ${this.ip} --lightstrip brightness'`);
                    exec(`kasa --host ${this.ip} --lightstrip brightness`, (err, stdout, stderr) => {
                        if(err) {
                            this.log.info(this.name + " - Error getting characteristic 'Brightness'");
                            this.debugLog("GetBrightness - Error - " + stderr.trim());
                        } else {
                            stdout = stdout.split("\n")[0].trim();
                            this.debugLog(stdout);
                            this.brightness = stdout.split("Brightness: ")[1];
                        }
                        this.checkingBrightness = false;
                    });
                }
                return this.brightness;
            });
        
        //Hue = int
        this.deviceService.getCharacteristic(this.Characteristic.Hue)
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
                            this.log.info(this.name + " - Error getting characteristic 'Hue/Saturation'");
                            this.debugLog("GetHue - Error - " + this.name + ": " + stderr.trim());
                        } else {
                            stdout = stdout.split("\n")[0].trim();
                            this.debugLog(stdout);  //expects "Current HSV: ($h, $s, $b)"
                            this.hue = (stdout.split("(")[1]).split(",")[0].trim();
                            this.saturation = (stdout.split("(")[1]).split(",")[1].trim();
                        }
                        this.checkingHSV = false;
                    });
                }
                return this.hue;
            });
        
        //Saturation = int
        this.deviceService.getCharacteristic(this.Characteristic.Saturation)
            .onSet(async (state) => {
                //wait for .Hue handle updating the characteristic
                this.tempSaturation = state;
            }).onGet(async () => {
                return this.saturation;
            });
    }

    //helpers

    SetColor() {
        if(this.tempHue != undefined && this.tempSaturation != undefined) {
            let hue = this.tempHue;
            let saturation = this.tempSaturation;
            this.debugLog(`SetColor: 'kasa --host ${this.ip} --lightstrip hsv ${hue} ${saturation} ${this.brightness}'`);
            exec(`kasa --host ${this.ip} --lightstrip hsv ${hue} ${saturation} ${this.brightness}`, (err, stdout, stderr) => {
                if(err) {
                    this.log.info(this.name + " - Error setting characteristic 'Hue/Saturation'");
                    this.debugLog("SetColor - Error - " + this.name + ": " + stderr.trim());
                }
                this.hue = hue;
                this.saturation = saturation;
                if(this.onStatus == false) {
                    //can't change the color without turning on the light
                    this.onStatus = true;
                    this.deviceService.updateCharacteristic(this.Characteristic.On, this.onStatus);
                }
            });
            this.tempHue = undefined;
            this.tempSaturation = undefined;
        }
    }

    debugLog(text) {
        if(this.debug) this.log.info(`\x1b[2m${this.name} - ${text}\x1b[0m`);
    }
}

module.exports = KasaLightstrip;