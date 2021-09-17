# CHANGELOG

## Changes per release of [homebridge-kasa-lightstrip](https://github.com/steveredden/homebridge-kasa-lightstrip/releases)

### v2.0.1

* Additional keywords for package.json
* Supplemental documentation for Lighting Effects and general README
* Code optimization / reduction

### v2.0.0

* Complete refactor of code structure, breaking into different files
* Add support for Light Effects and [Custom Light Effects](CustomLightingEffects.md) via "Button" switches (stateless)

### v1.0.4 - v1.0.6

* Code cleanup

### v1.0.3

* Ensure lightbulb accessory is turned on if a color is selected without being on
* Cache Hue, Saturation, Brightness values between calls

### v1.0.2

* Fixed an issue where restored accessories (after reboot of homebridge or child-bridge) would not operate

### v1.0.0

* Initial Release
* Support of Kasa KL400L5 Light Strips
