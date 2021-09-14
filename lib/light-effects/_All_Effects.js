const AURORA = stringify(require('./Aurora.json'));
const BUBBLING_CAULDRON = stringify(require('./Bubbling_Cauldron.json'));
const CANDY_CANE = stringify(require('./Candy_Cane.json'));
const CHRISTMAS = stringify(require('./Christmas.json'));
const FLICKER = stringify(require('./Flicker.json'));
const HANUKKAH = stringify(require('./Hanukkah.json'));
const HAUNTED_MANSION = stringify(require('./Haunted_Mansion.json'));
const ICICLE = stringify(require('./Icicle.json'));
const LIGHTNING = stringify(require('./Lightning.json'));
const OCEAN = stringify(require('./Ocean.json'));
const RAINBOW = stringify(require('./Rainbow.json'));
const RAINDROP = stringify(require('./Raindrop.json'));
const SPRING = stringify(require('./Spring.json'));
const VALENTINES = stringify(require('./Valentines.json'));

function stringify(jsonObject) {
    var output = JSON.stringify(jsonObject);
    output = output.replace(/"/g,"'");  //replace double-quote with single-quote
    return output;
}

module.exports = {
    Aurora: AURORA,
	BubblingCauldron: BUBBLING_CAULDRON,
	CandyCane: CANDY_CANE,
	Christmas: CHRISTMAS,
	Flicker: FLICKER,
	Hanukkah: HANUKKAH,
	HauntedMansion: HAUNTED_MANSION,
	Icicle: ICICLE,
	Lightning: LIGHTNING,
	Ocean: OCEAN,
	Rainbow: RAINBOW,
	Raindrop: RAINDROP,
	Spring: SPRING,
	Valentines: VALENTINES
}