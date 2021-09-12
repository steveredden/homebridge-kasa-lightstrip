<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

[![GitHub All Releases](https://img.shields.io/github/downloads/steveredden/homebridge-kasa-lightstrip/total)]()
# homebridge-kasa-lightstrip

`homebridge-kasa-lightstrip` is a [Homebridge](https://homebridge.io) plugin that exposes tp-link kasa light strip devices to [Apple's](https://www.apple.com) [HomeKit](https://www.apple.com/ios/home) smart home platform.

This plugin is a stop-gap to provide integration of Kasa's light strips, while the [far superior] plugin ([homebridge-tplink-smarthome](https://github.com/plasticrake/homebridge-tplink-smarthome#readme)) lacks support!

## Prerequisites

The [python-kasa](https://github.com/python-kasa/python-kasa) library is required for this plugin.  Credit to that team and the maintainers!

Homebridge Raspberry Pi Image:

```sh
sudo apt install python3-pip
sudo pip3 install python-kasa --pre
```

## Installation Instructions

#### Option 1: Install via Homebridge Config UI X:

Search for "kasa" in [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) and install `homebridge-kasa-lightstrip`.

#### Option 2: Manually Install:

```sh
sudo npm install -g homebridge-kasa-lightstrip
```

## Supported Devices

### Light Strips

* [KL400L5](https://www.kasasmart.com/us/products/smart-lighting/product-kl400l5)

## Configuration

Device names and IP Addresses must be configured manually in current state:

#### Example

```json
platforms: [
    {
        "platform": "HomebridgeKasaLightstrip",
        "accessories": [
            {
                "name": "Couch Strip",
                "ip": "10.10.10.10"
            }
        ],
        "debug": false
    }
]
```
* **platform** (mandatory): the name of this plugin
* **accessories** (mandatory):  array containing the devices and their info:
  * **name** (mandatory): the name of the accessory to create
  * **ip** (mandatory): the IP address of the device
* *debug* (optional): boolean to enable more verbose logging