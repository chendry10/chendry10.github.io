# Keystroke-to-play opening

The hero follows the actual B-O-W-L inputs from the existing approved Blizzard Defense recording. A Blender keyboard depresses its real Cherry-profile caps at the recorded keydown times. The camera reveals that same recording on a desktop display. The display then expands into the existing gameplay figure, which continues into the engineering section.

## Source and reproduction

- `render-keystroke-story.py`: Cycles scene, lighting, physical key travel, cable pulse and camera choreography. Uses the approved keyboard scene from `build-typing-keyboard.py`.
- `audit-keystroke-story.py`: verifies 4 mm key contacts and final framing, and projects the display corners for the browser transition.
- `prepare-keystroke-story.py`: packages all 181 full and compact frames, responsive hero images, and hashed provenance.
- `input-handoff.js`: interpolates the audited display quadrilateral into the existing gameplay figure. The movie is held at 4.8 seconds until the transition ends, and returns to that frame when scrolling back.

Use Blender 4.5 with Cycles and the existing local keyboard scene, approved recording, key-event JSON, and CC0 studio_small_09 environment. Extract 60 fps screen frames from source seconds 3 through 4.85; name them game-001.png onward. Pass `--keyboard`, `--screen`, `--screen-dir`, `--events`, and `--output` to the renderer. The sequence uses `--width 1600 --samples 256`; the opening still uses `--width 2560 --samples 512 --still 0`. Run the audit with the same arguments and `--save-only`, then copy its projection.json into the packaged asset directory. Run the packager after every sequence render completes.

The saved blend is the assembled initial scene; the Python pose function drives each output frame. Raw Blender scenes, HDRI, original captures, and intermediate PNGs stay outside this public repository. The visible cable pulse is illustrative. The game display and key contacts use recorded source timing.

## Verification

`npm test` checks asset hashes and dimensions, bounded sequence decoding, exact display projection and continuity, gameplay seek/playback lifecycle, and the existing score transition. Visually inspect forward and reverse scroll, motion off, and widths 390, 1024 and desktop before publishing. Preview with `npm start` on port 4296. The local server supports byte ranges so the recording can seek as it does on Pages.
