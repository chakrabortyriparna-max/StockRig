# Media Pipeline (videos + audio)

## How media gets made
No generation APIs are used or available. All assets are programmatic:
- **Logo/site graphics**: hand-authored SVG (`brand/logo-mark.svg`, `logo-horizontal.svg`)
- **Video**: ffmpeg only — kinetic typography via stacked `drawtext` filters on a `color` lavfi source, slow push-in via `zoompan`, scenes concatenated with the concat demuxer, then AAC audio muxed
- **Audio**: pure Python stdlib synthesis (`videos/make_audio.py`): kick = pitch-sweeping sine, hats = enveloped noise, bass = triangle-ish, pads = detuned sines over an Am–F–C–G-ish progression at 122 BPM

## Build commands
```
python videos/make_audio.py                    # writes launch.wav + letter.wav
powershell -File videos/build_videos.ps1       # renders both mp4s (needs ffmpeg on PATH)
```

## Hard-won Windows gotchas (these cost real debugging time — do not regress)
1. **Font paths must be relative.** `fontfile=C\:/Windows/Fonts/ariblk.ttf` breaks filter parsing ("No option name near '/Windows/...'"). Fonts are copied next to the scripts (`videos/ariblk.ttf`, `arialbd.ttf`) — use bare filenames.
2. **PowerShell `$var:` interpolation** treats `colon-after-variable` as a scope separator and silently empties it. All ffmpeg filter strings are built with `-f` format operators or single-quoted constants — keep it that way.
3. **Filter chaining**: multiple drawtext filters are separated by COMMAS. Colons separate options within one filter. Joining scenes' filters with `:` produces "Error applying option 'drawtext'".
4. Text content: apostrophes stripped, `:` `,` `%` escaped in the T()/LScene() helpers.

## Brand rules for any new scene
Colors are the brandbook's exact hexes (charcoal `#1C1E22`, paper `#F7F5F2`, orange `#F25C05`, steel `#8A9199`). Orange marks the emphasis beat of each scene. Arial Black for display lines, Arial Bold for letter/body lines. Claims shown in videos must match current business plan pricing — the v1.1 revision changed video copy from "$29/mo" to "Free forever"; don't reintroduce stale claims.
