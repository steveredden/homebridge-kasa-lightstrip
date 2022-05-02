let exec = require('child_process').exec;

const PLUGIN_NAME = 'homebridge-kasa-lightstrip';
const PLATFORM_NAME = 'HomebridgeKasaLightstrip';

class KasaLightstrip {
    constructor(log, config, api, debug, deviceString, uuid, device) {
        if(!config) return;

        this.log = log;
        this.config = config;
        this.api = api;
        this.debug = debug;
        this.uuid = uuid;
        this.device = device;
        this.deviceString = deviceString;

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

        //Create Accessory if we didn't find a matching device by uuid
        if ( this.device == undefined ) {
            this.device = new this.api.platformAccessory(this.name, this.uuid);
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
                this.debugLog(`SetPower: 'kasa --host ${this.ip} ${this.deviceString} ${translatedState}'`);
                exec(`kasa --host ${this.ip} ${this.deviceString} ${translatedState}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.name + " - Error setting characteristic 'On'");
                        this.debugLog("SetPower - Error - " + this.name + ": " + stderr.trim());
                    }
                    this.onStatus = state;
                });
            }).onGet(async () => {
                if(!this.checkingOn) {
                    this.checkingOn = true;
                    this.debugLog(`GetPower: 'kasa --host ${this.ip} ${this.deviceString}'`);
                    exec(`kasa --host ${this.ip} ${this.deviceString}`, (err, stdout, stderr) => {
                        if(err) {
                            this.log.info(this.name + " - Error getting characteristic 'On'");
                            this.debugLog("GetPower - Error - " + this.name + ": " + stderr.trim());
                        } else {
                            try {
                                stdout = stdout.split("\n")[2].trim();
                                this.debugLog(stdout);
                                this.onStatus = stdout.includes("Device state: ON");
                                this.deviceService.updateCharacteristic(this.Characteristic.On, this.onStatus);   //keep in sync in case the light was turned on elsewhere
                            } catch (error) {
                                this.ParseError(error);
                            }
                        }
                        this.checkingOn = false;
                    });
                }
                return this.onStatus;
            });
    
        //Brightness = int
        this.deviceService.getCharacteristic(this.Characteristic.Brightness)
            .onSet(async (state) => {
                this.debugLog(`SetBrightness: 'kasa --host ${this.ip} ${this.deviceString} brightness ${state}'`);
                exec(`kasa --host ${this.ip} ${this.deviceString} brightness ${state}`, (err, stdout, stderr) => {
                    if(err) {
                        this.log.info(this.name + " - Error setting characteristic 'Brightness'");
                        this.debugLog("SetBrightness - Error - " + this.name + ": " + stderr.trim());
                    }
                    this.brightness = state;
                });
            }).onGet(async () => {
                if(!this.checkingBrightness) {
                    this.checkingBrightness = true;
                    this.debugLog(`GetBrightness: 'kasa --host ${this.ip} ${this.deviceString} brightness'`);
                    exec(`kasa --host ${this.ip} ${this.deviceString} brightness`, (err, stdout, stderr) => {
                        if(err) {
                            this.log.info(this.name + " - Error getting characteristic 'Brightness'");
                            this.debugLog("GetBrightness - Error - " + stderr.trim());
                        } else {
                            try {
                                stdout = stdout.split("\n")[0].trim();
                                this.debugLog(stdout);
                                this.brightness = stdout.split("Brightness: ")[1];
                            } catch (error) {
                                ParseError(error);
                            }
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
                    this.debugLog(`GetHue: 'kasa --host ${this.ip} ${this.deviceString} hsv'`);
                    exec(`kasa --host ${this.ip} ${this.deviceString} hsv`, (err, stdout, stderr) => {
                        if(err) {
                            this.log.info(this.name + " - Error getting characteristic 'Hue/Saturation'");
                            this.debugLog("GetHue - Error - " + this.name + ": " + stderr.trim());
                        } else {
                            try {
                                stdout = stdout.split("\n")[0].trim();
                                this.debugLog(stdout);  //expects "Current HSV: ($h, $s, $b)"
                                this.hue = (stdout.split("(")[1]).split(",")[0].split("=")[1];
                                this.saturation = (stdout.split("(")[1]).split(",")[1].split("=")[1];
                            } catch (error) {
                                this.ParseError(error);
                            }
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

    ParseError(error) {
        this.log.info(this.name + " - Error parsing python-kasa output: " + error);
        this.log.info("This may be an indicator you need to install python-kasa, preferably 0.4.1 or greater; visit https://github.com/steveredden/homebridge-kasa-lightstrip/blob/main/README.md for instructions");
    }

    SetColor() {
        if(this.tempHue != undefined && this.tempSaturation != undefined) {
            let hue = this.tempHue;
            let saturation = this.tempSaturation;
            this.debugLog(`SetColor: 'kasa --host ${this.ip} ${this.deviceString} hsv ${hue} ${saturation} ${this.brightness}'`);
            exec(`kasa --host ${this.ip} ${this.deviceString} hsv ${hue} ${saturation} ${this.brightness}`, (err, stdout, stderr) => {
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
