# Custom Lighting Effects


```sh
kasa --host "yourIP" --lightstrip raw-command smartlife.iot.lighting_effect get_lighting_effect | sed "s/ //g"
```
...replacing `yourIP` with the actual IP address:

![grabbingCustomEffectJSON](img/gettingCustomEffectJSON.png)

This will produce a properly-formatted string, to be put into your `Custom Effects JSON` field:

Using homebridge-ui:

![setJSONviaUI](img/setJSONviaUI.png)

in config.json:

![setJSONviaConfig](img/setJSONviaConfig.png)