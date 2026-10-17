# Premade sing and dance audio

License: **CC0-1.0** — https://creativecommons.org/publicdomain/zero/1.0/

Policy from the Free Music Maker manifest: Prefer CC0 only. No CC-BY assets included in this pack.
Attribution is not required. Source URLs are kept so a clip can be traced.

These are ~15–20s MP3 transcodes of the `clips-short/` ogg previews, split into
folders so GitHub Pages stays small. Full-length originals are not in this build.

Asking to **sing** plays `sing-female/` or `sing-male/` at dialogue volume, matched to the companion.
Asking to **dance** plays `dance/` or `song-bed/` at BGM volume.

| file | title | voice | credit | source |
|---|---|---|---|---|
| `dance/dance-silent-dance-floor.mp3` | Silent Dance Floor | — | Umplix | https://opengameart.org/content/dance-music-pack |
| `dance/dance-cant-resist.mp3` | Can't Resist the Groove | — | Umplix | https://opengameart.org/content/dance-music-pack |
| `dance/dance-twin-layers.mp3` | Twin Layers | — | Umplix | https://opengameart.org/content/dance-music-pack |
| `dance/dance-celebrity.mp3` | The Celebrity | — | Umplix | https://opengameart.org/content/dance-music-pack |
| `dance/dance-happy-loop.mp3` | Happy Loop | — | wipics | https://opengameart.org/content/happy-loop |
| `song-bed/bed-banana.mp3` | Banana Track | — | skrjablin | https://opengameart.org/content/banana-track |
| `song-bed/bed-flowerbed.mp3` | Flowerbed | — | Zane Little Music | https://opengameart.org/content/flowerbed-fields-loop |
| `song-bed/bed-jump.mp3` | Jump | — | ThePixel | https://opengameart.org/content/jump |
| `song-bed/bed-happy-adventure.mp3` | Happy Adventure | — | TinyWorlds | https://opengameart.org/content/happy-adventure-loop |
| `song-bed/bed-lullaby.mp3` | Lullaby | — | Pro Sensory (Alex McCulloch) | https://opengameart.org/content/lullaby-0 |
| `song-bed/bed-calm.mp3` | Calm Theme | — | pebonius | https://opengameart.org/content/calm-theme |
| `song-bed/bed-lofi.mp3` | Lofi | — | omfgdude | https://opengameart.org/content/lofi-hip-hop |
| `song-bed/bed-shenandoah.mp3` | Shenandoah | — | United States Air Force Concert Band (trad.) | https://commons.wikimedia.org/wiki/File:Shenandoah.ogg |
| `sing-female/sing-f-hello.mp3` | Hello There | female | Pro Sensory (Alex McCulloch) | https://opengameart.org/content/hello-there-singing |
| `sing-female/sing-f-twinkle.mp3` | Twinkle Twinkle | female | Derrick Coetzee | https://commons.wikimedia.org/wiki/File:Twinkle_Twinkle_Little_Star_-_sung_with_full_lyrics.ogg |
| `sing-female/sing-f-joy.mp3` | Joy to the World | female | Kim Butler, Alan Davis-Drake, Diyan, Claire Goget, Karen Savage, SKVE, Kara Shallenberg, Kristin Hughes | https://commons.wikimedia.org/wiki/File:Joy-to-the-World_KB.ogg |
| `sing-female/sing-f-choir.mp3` | Choir | female | cynicmusic | https://opengameart.org/content/epic-endgame-cinematic |
| `sing-female/sing-f-cantate.mp3` | Cantate Domino | female | Anonymous Choir | https://commons.wikimedia.org/wiki/File:Anonymous_Choir_-_Cantate_Domino.ogg |
| `sing-male/sing-m-happy-birthday.mp3` | Happy Birthday | male | Joseph Sardin (BigSoundBank) | https://bigsoundbank.com/joyeux-anniversaire-s2194.html |
| `sing-male/sing-m-buddham.mp3` | Buddham Saranam | male | Unknown (Wikimedia Commons CC0 upload) | https://commons.wikimedia.org/wiki/File:Buddham_Saranam_Gacchami_-_Male_Voice,_with_Female_Chorus.oga |
| `sing-male/sing-m-mass.mp3` | Mass | male | Joseph Sardin (BigSoundBank) | https://bigsoundbank.com/mass-organ-and-singing-1-s2789.html |
| `sing-male/sing-m-overtone-e.mp3` | Overtone E | male | Joseph Sardin (BigSoundBank) | https://bigsoundbank.com/overtone-singing-e-s3035.html |
| `sing-male/sing-m-overtone-c.mp3` | Overtone C | male | Joseph Sardin (BigSoundBank) | https://bigsoundbank.com/overtone-singing-c-s3033.html |

## Add another clip

1. Drop a CC0 MP3 in `dance/`, `song-bed/`, `sing-female/`, or `sing-male/`.
2. Add a row to `PERFORMANCE_CLIPS` in `apps/web/lib/performance-clips.ts`.
   Songs need `voice: 'female'` or `'male'` and `volume: 'voiceVol'`. Dance and beds use `bgmVol` and omit voice.
3. Add the file to the table above.

