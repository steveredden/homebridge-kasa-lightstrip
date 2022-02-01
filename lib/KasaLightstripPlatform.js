let exec = require('child_process').exec;

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

        this.deviceString = undefined;
        this.pythonKasaErrorMessage = "# Unable to run \"kasa --version\" successfully (or parse its results) during initialization; the most likely cause is needing to install python-kasa. See https://github.com/steveredden/homebridge-kasa-lightstrip/blob/main/README.md" // because this error will become part of the command string, prefix it with # so it's not interpreted as part of a command
        this.pythonKasaVersion = undefined;

        this.api.on('didFinishLaunching', async () => {
            await this.setPythonKasaVersion();
            await this.setDeviceString();

            if(this.config.accessories && Array.isArray(this.config.accessories)) {

                //loop through each lightstrp in array
                for (let lightstrip of this.config.accessories) {

                    //Lightbulbs
                    const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip );
                    let accessory = this.accessories.find(accessory => accessory.UUID === uuid)
                    new KasaLightstrip(this.log, lightstrip, this.api, this.debug, this.deviceString, uuid, accessory);

                    //Lighting Effect Switches / "buttons"
                    for (let effect in lightstrip.effects) {

                        //Custom Effects
                        if(effect == "CustomEffects") {
                            //loop through each custom effect in array
                            for (let customEffect of lightstrip.effects[effect]) {

                                const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip + customEffect.name);
                                let accessory = this.accessories.find(accessory => accessory.UUID === uuid)
                                new KasaLightEffect(this.log, lightstrip, customEffect.json, this.api, this.debug, this.deviceString, uuid, accessory, customEffect.name);
                            }
                            
                        //Pre-defined Kasa Effects
                        } else {
                        
                            const uuid = this.api.hap.uuid.generate('homebridge-kasa-lightstrip' + lightstrip.name + lightstrip.ip + effect);
                            let accessory = this.accessories.find(accessory => accessory.UUID === uuid)

                            if (lightstrip.effects[effect] == true) {
                                new KasaLightEffect(this.log, lightstrip, effect, this.api, this.debug, this.deviceString, uuid, accessory);
                            } else {
                                if (accessory) this.removeAccessory(accessory);  //remove any existing, disabled effects
                            }
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

    setDeviceString() {
        return new Promise((resolve, reject) => {
            if (this.pythonKasaVersion == "0.0.0") {
                // treat 0.0.0 as an error, so that HB will continue, and debug messages will print our error string
                // this may help avoid a lot of missing python-kasa questions
                this.deviceString = this.pythonKasaErrorMessage;
                resolve(this.deviceString);
                return 0;
            }
            var SEMVER = this.pythonKasaVersion.split(".", 3);
            var MAJOR = SEMVER[0];
            var MINOR = SEMVER[1];
            var PATCH = SEMVER[2];
            if (MAJOR > 0 || (MAJOR == 0 && MINOR >4) || (MAJOR == 0 && MINOR == 4 && PATCH >= 1)) {
                this.deviceString = "--type lightstrip";
            } else {
                this.deviceString = "--lightstrip";
            }
            resolve(this.deviceString);
        });
    }

    setPythonKasaVersion() {
        return new Promise((resolve,reject) => {
            exec(`kasa --version`, (err, stdout, stderr) => {
                if(err) {
                    this.pythonKasaVersion = "0.0.0";
                    resolve(this.pythonKasaVersion);
                } else {
                    try {
                        this.pythonKasaVersion = stdout.split("kasa, version ")[1].trim();
                        this.log.info("Got python-kasa version: " + this.pythonKasaVersion);
                    } catch (error) {
                        this.log.info("Error parsing python-kasa version; setting to 0.0.0");
                        this.pythonKasaVersion = "0.0.0";
                    }
                    resolve(this.pythonKasaVersion);
                }
            });
        });
    }

}

module.exports = KasaLightstripPlatform;
