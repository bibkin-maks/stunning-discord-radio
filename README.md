# discord-radio

_____________________________________________________________________________________



https://github.com/user-attachments/assets/7675036b-783b-4fc9-8913-567956ffb54b


_____________________________________________________________________________________
Little electron app that plays internet radio (or anything playing on your pc) into a
virtual audio device, so discord picks it up as your mic. Made it so I could have music
in a voice channel without screen sharing.

It doesn't create the virtual mic itself, that needs a signed driver - you install
VoiceMeeter or VB-CABLE once (both free) and this app does the rest.

## running it

```
npm install
npm start
```

## voicemeeter setup (talk + radio at the same time)

Grab it here; the standard version is enough: https://vb-audio.com/Voicemeeter/

After install you get two new windows devices:
- "VoiceMeeter Input" - a playback device, apps play into it
- "VoiceMeeter Output" - a recording device, discord listens to it

Then:
1. In VoiceMeeter, set A1 (top right) to your headphones so you can hear what's going on
2. Hardware Input 1 = your real mic. Click B on that strip so your voice goes to Discord (A too if you want to hear yourself)
3. On the Virtual Input strip, click A and B
4. In this app, set "Send to Discord" to VoiceMeeter Input
5. in discord: Settings -> Voice & Video -> Input Device = VoiceMeeter Output

Now Discord gets your mic and the radio at the same time, and you hear both.
Balance radio vs voice with the strip faders.

## simpler setup (radio only, no talking)

If you want the radio *instead of* your mic: install VB-CABLE, set this app's output to
CABLE Input and Discord's input to CABLE Output. Done.

## notes

- any direct mp3/aac stream URL works in the custom field. hls (.m3u8) doesn't; the bare audio element can't play it - most station sites list a direct stream link somewhere
- stations are hardcoded in renderer.js; add your own there
- If the device list shows blank names, hit refresh; Windows hides the labels until you grant audio access once
- there's a small localhost proxy running; it only exists because chromium refuses to route cross-origin audio to a non-default output device. it doesn't send anything anywhere
