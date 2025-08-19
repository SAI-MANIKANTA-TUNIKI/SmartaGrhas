import Led from '../models/LedModel.mjs';
import mqtt from 'mqtt';

export const updateLedSettings = async (req, res) => {
  const { microcontrollerNumber } = req.params;
  const { color, brightness, effectSpeed, effectIntensity, power, effectMode, syncMusic } = req.body;

  try {
    let led = await Led.findOne({ microcontrollerNumber });
    if (!led) {
      led = new Led({ microcontrollerNumber, ...req.body });
    } else {
      led.color = color;
      led.brightness = brightness;
      led.effectSpeed = effectSpeed;
      led.effectIntensity = effectIntensity;
      led.power = power;
      led.effectMode = effectMode;
      led.syncMusic = syncMusic;
    }
    await led.save();

    // Publish to MQTT
    const client = mqtt.connect(`mqtt://${process.env.AWS_IOT_ENDPOINT}`);
    client.on('connect', () => {
      client.publish(`led/${microcontrollerNumber}`, JSON.stringify(req.body));
      client.end();
    });

    res.status(200).json(led);
  } catch (error) {
    res.status(500).json({ message: 'Error updating LED settings', error });
  }
};

export const getLedSettings = async (req, res) => {
  const { microcontrollerNumber } = req.params;
  try {
    const led = await Led.findOne({ microcontrollerNumber });
    if (!led) return res.status(404).json({ message: 'LED not found' });
    res.status(200).json(led);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching LED settings', error });
  }
};