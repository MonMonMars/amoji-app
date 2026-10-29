# Recorded emotion bursts

Laugh, smile, giggle, wow, um, oh, and ha in `public/voice-clips/{yue,zh,ja,en}/{female,male}/` are short human recordings. They are not Edge TTS and not the old formant synthesis. Greetings (`hello`, `nice`, `hihi`, `pleasure`) and the longer loading lines (`think`, `search`) are still the espeak clips from `apps/web/scripts/gen-voice-clips.py`. That script does not overwrite these bursts.

Files are trimmed, faded, and encoded to mono MP3. Freesound originals need a logged-in download; those takes were cut from the CC0 high-quality preview of the same recording. OpenGameArt and Wikimedia files were cut from the original wav.

Japanese game-style reactions sit in `ja/female/`: cicifyre's CC0 visual-novel pack (laugh, single laugh, え / わー / あっ / はあ / う). Paid "Japanese Anime Voices" packs forbid redistribution, so they are not in this tree. `ja/male/` uses CC0 male laughs, chuckles, and surprise reactions — the closest free human bursts, not a seiyuu pack. Where a language had no native recording, the clip is a short human vocalization of the same kind.

The select screen's Reactions row plays these files for the current language and the companion's gender. Chat leads use the same paths and do not synthesize the burst with live TTS.

## Licenses

| source | license | page |
|---|---|---|
| cicifyre — Free Voice Clips Pack (Bright Female, Mature Female) | CC0 | https://opengameart.org/content/voice-clip-packs-for-visual-novels-and-rpgs |
| susychristiansen — Female giggling, a bit subdued | CC0 | https://freesound.org/people/susychristiansen/sounds/535257/ |
| AO-SoundPawz — "Wow" vocal expressions | CC0 | https://freesound.org/people/AO-SoundPawz/sounds/475065/ |
| esperar — Hmms various 2 | CC0 | https://freesound.org/people/esperar/sounds/170766/ |
| thedialogueproject — Female laugh (short) | CC0 | https://freesound.org/people/thedialogueproject/sounds/565973/ |
| lmbubec — Short clip of girl laughing | CC0 | https://commons.wikimedia.org/wiki/File:Short_clip_of_girl_laughing.wav |
| dastudiospr — Laughing (male) | CC0 | https://freesound.org/people/dastudiospr/sounds/529818/ |
| arbernaut — Male Laughter 01 | CC0 | https://freesound.org/people/arbernaut/sounds/450528/ |
| SnowFightStudios — Various Chuckles, male | CC0 | https://freesound.org/people/SnowFightStudios/sounds/643665/ |
| Sadiquecat — Noises, short laugh | CC0 | https://freesound.org/people/Sadiquecat/sounds/800973/ |
| Nafu — Wow, male surprise reactions | CC0 | https://freesound.org/people/Nafu/sounds/580971/ |
| VSE00 — Hmm, male NPC (shared by every male `um.mp3`) | CC0 | https://freesound.org/people/VSE00/sounds/867879/ |

## Which file uses which take

| clip | take |
|---|---|
| `yue/female/laugh.mp3` | cicifyre bright laughter 03 |
| `yue/female/giggle.mp3` | susychristiansen giggle |
| `yue/female/smile.mp3` | susychristiansen single giggle |
| `yue/female/wow.mp3` | AO-SoundPawz wow |
| `yue/female/oh.mp3` | cicifyre bright anime gasp |
| `yue/female/um.mp3` | esperar hmm |
| `yue/female/ha.mp3` | lmbubec girl laugh, first burst |
| `zh/female/laugh.mp3` | cicifyre bright laughter 02 |
| `zh/female/giggle.mp3` | susychristiansen giggle |
| `zh/female/smile.mp3` | susychristiansen single giggle |
| `zh/female/wow.mp3` | AO-SoundPawz wow |
| `zh/female/oh.mp3` | cicifyre mature gasp |
| `zh/female/um.mp3` | esperar hmm |
| `zh/female/ha.mp3` | cicifyre bright laughter 01, first burst |
| `ja/female/laugh.mp3` | cicifyre mature laugh |
| `ja/female/giggle.mp3` | cicifyre mature single laugh |
| `ja/female/smile.mp3` | cicifyre anime え |
| `ja/female/wow.mp3` | cicifyre anime わー |
| `ja/female/oh.mp3` | cicifyre anime あっ |
| `ja/female/um.mp3` | cicifyre anime う |
| `ja/female/ha.mp3` | cicifyre anime はあ |
| `en/female/laugh.mp3` | lmbubec girl laugh |
| `en/female/giggle.mp3` | susychristiansen giggle |
| `en/female/smile.mp3` | susychristiansen single giggle |
| `en/female/wow.mp3` | AO-SoundPawz wow |
| `en/female/oh.mp3` | AO-SoundPawz wow, softer take |
| `en/female/um.mp3` | esperar hmm |
| `en/female/ha.mp3` | thedialogueproject short laugh |
| `yue/male/laugh.mp3` | dastudiospr male laugh |
| `yue/male/giggle.mp3` | SnowFightStudios chuckle |
| `yue/male/smile.mp3` | SnowFightStudios short chuckle |
| `yue/male/wow.mp3` | Nafu male surprise |
| `yue/male/oh.mp3` | Nafu male surprise |
| `yue/male/um.mp3` | VSE00 male hmm |
| `yue/male/ha.mp3` | dastudiospr single ha |
| `zh/male/laugh.mp3` | arbernaut male laughter |
| `zh/male/giggle.mp3` | SnowFightStudios chuckle |
| `zh/male/smile.mp3` | arbernaut short burst |
| `zh/male/wow.mp3` | Nafu male surprise |
| `zh/male/oh.mp3` | Nafu male surprise |
| `zh/male/um.mp3` | VSE00 male hmm |
| `zh/male/ha.mp3` | arbernaut short burst |
| `ja/male/laugh.mp3` | arbernaut male laughter |
| `ja/male/giggle.mp3` | Sadiquecat short laugh |
| `ja/male/smile.mp3` | dastudiospr short burst |
| `ja/male/wow.mp3` | Nafu male surprise |
| `ja/male/oh.mp3` | Nafu male surprise |
| `ja/male/um.mp3` | VSE00 male hmm |
| `ja/male/ha.mp3` | arbernaut short burst |
| `en/male/laugh.mp3` | arbernaut male laughter |
| `en/male/giggle.mp3` | arbernaut short run |
| `en/male/smile.mp3` | arbernaut short burst |
| `en/male/wow.mp3` | Nafu male surprise |
| `en/male/oh.mp3` | Nafu male surprise |
| `en/male/um.mp3` | VSE00 male hmm |
| `en/male/ha.mp3` | arbernaut short burst |
