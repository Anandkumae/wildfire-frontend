# 🔊 Adding Your Own Fire Alarm MP3

The audio alert system now supports **MP3 fire alarm sounds**! Follow these simple steps to add your own alarm sound.

## Quick Setup

1. **Download a fire alarm MP3** from any of these free sources:
   - [Mixkit Free Alarm Sounds](https://mixkit.co/free-sound-effects/alarm/)
   - [Uppbeat Fire Alarm Sounds](https://uppbeat.io/sfx/fire-alarm)
   - [ElevenLabs Siren Sounds](https://elevenlabs.io/sound-effects/siren)
   - [Directory.Audio Fire Alarms](https://directory.audio/search?q=fire+alarm)

2. **Rename the file** to `fire-alarm.mp3`

3. **Place it in the public folder**:
   ```
   d:\wildfire\frontend-new\public\fire-alarm.mp3
   ```

4. **Done!** The system will automatically use your MP3 file

## How It Works

- ✅ **MP3 First**: System tries to play your MP3 file
- ✅ **Automatic Fallback**: If MP3 not found, uses generated siren sound
- ✅ **Loud Volume**: MP3 plays at maximum volume (100%)
- ✅ **No Code Changes**: Just drop the file in the public folder

## Recommended Sound Characteristics

For best results, choose an MP3 with:
- **Duration**: 3-5 seconds
- **Volume**: Already loud/normalized
- **Type**: Emergency siren, fire alarm, or alert sound
- **Format**: MP3 (most compatible)

## Testing

After adding your MP3:
1. Refresh the web app
2. Upload an image/video with fire
3. Click "Start Detection"
4. The alarm should play when fire is detected

## Troubleshooting

If the MP3 doesn't play:
- Check the console for error messages
- Verify the file is named exactly `fire-alarm.mp3`
- Ensure it's in the `public` folder
- The system will automatically fall back to the generated siren

## Custom MP3 Path

To use a different filename or path, edit `src/utils/audioAlert.js`:

```javascript
this.mp3Path = '/your-custom-alarm.mp3';
```
