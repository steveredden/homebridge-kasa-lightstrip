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

class KasaLightstripPlugin {
    constructor(log, config, api) {
        if(!config) return;

        this.log = log;
        this.config = config;
        this.api = api;

        this.name = this.config.name || 'Lightstrip'
        this.ip = this.config.ip;
        if(!this.ip) {
            this.log.error(`\n\nMissing IP for lightstrip accessory`);
        }

        //Create Accessory
        const uuid = this.api.hap.uuid.generate('homebridge:kasa-lightstrip' + this.ip + this.name);
        this.device = new this.api.platformAccessory(this.name, uuid);
        this.device.category = this.api.hap.Categories.LIGHTBULB;
        this.deviceService = this.device.addService(Service.Lightbulb);
        this.deviceInfo = this.device.getService(Service.AccessoryInformation);
    }

    handleOn() {
        this.deviceService.getCharacteristic(Characteristic.On)
            .on('get', (callback) => {
                this.checkPower(() => {
                    this.deviceService.setCharacteristic(Characteristic.On, this.awake)
                })
                callback(null, this.awake);
            })
            .on('set', (state, callback) => {
                exec(`kasa --host ${this.ip} --lightstrip ${state}`, (err, stdout, stderr) => {
                    this.deviceService.updateCharacteristic(Characteristic.On, state)
                })
                callback(null)
            })
    }

    checkPower(callback) {
        exec(`kasa --host ${this.ip} --lightstrip`, (err, stdout, stderr) => {
            if(err) {
                this.awake = 0;
                if(callback) callback('error');
            } else {
                this.awake = Array.isArray(stdout.match("Device State: ON"));
                if(callback) callback(this.awake);
            }
        });
    }
}

class KasaLightstripPluginPlatform {
    constructor(log, config, api) {
        if (!config) return;

        this.log = log;
        this.api = api;
        this.config = config;

        if(this.api) this.api.on('didFinishLaunching', this.initAccessory.bind(this));
    }

    initAccessory() {
        //read from config.accessories
        if(this.config.accessories && Array.isArray(this.config.accessories)) {
            for (let lightstrip of this.config.accessories) {
                if(lightstrip) new KasaLightstripPlugin(this.log, lightstrip, this.api);
            }
        } else if (this.config.accessories) {
            this.log.info('Cannot initialize. Type %s', typeof this.config.accessories);
        }

        if(!this.config.accessories) {
            this.log.info('Please add one or more accessories in your config');
        }
    }
}