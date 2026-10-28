# Cameron Hendry's portfolio

Live at **https://chendry10.github.io/**. The connected Cobalt Concerto story begins with a Blender Cycles Silicon Stack processor study. Its layers open into actual Typing Agent gameplay, and that same game window settles into the engineering case. A later score-page journey lands in a working LyreLink demonstration.

## Local preview and validation

Node.js 24 is sufficient. There are no install or build steps and no runtime CDN requests.

```sh
npm start
npm test
```

The preview listens on loopback port 4296 by default; `PORT` can override it. Checks cover local references and modules, licensed media hashes, genuine gameplay provenance, the nine complete demo parts, and the approved one-page resume.

## Publication

GitHub Pages publishes the root of `main`; `.nojekyll` preserves the buildless static files. Use a ready pull request, validate the candidate, merge, and wait for the Pages build and deployment to succeed. The canonical address, robots file, sitemap and resume all use the GitHub Pages origin.

The previous portfolio remains in Git history. Its original resume download path, `/Cameron_Hendry_Resume.pdf`, continues to serve the current PDF. The current site's resume link lives under `/shared/assets/`.

The animation entry and deferred key renderer use content-versioned URLs so returning visitors receive matching code after a Pages update. When either module changes, refresh its 12-character SHA-256 query in its importer (normalize CRLF to LF before hashing); the validation command checks both versions.

## Sources and boundaries

- `motion.js`, `switch-scene.js`, `product-bridge.js`, `score-folio.js` and `score-journey.js` contain the visual choreography. One demand-driven scheduler follows native scrolling; the game and score each retain their identity through their handoffs. The processor uses 121 pre-rendered frames with bounded bitmap decoding. Reduced motion and tablet/phone layouts use a matching still and native reading positions.
- `shared/lyre-demo.js` implements the browser-local director/member demonstration; it does not connect to a live band or private music library.
- Media source notices and licenses are beside the files under `shared/assets/` and `shared/vendor/`. The archived keyboard study uses Santiago Castelo's MIT-licensed Cherry-profile keycap CAD, including its internal ribs and switch/stabilizer sockets. The switch mechanism, keyboard case, plate, materials and lighting are independently authored. Blender 4.5.15 Cycles renders the 3840×3360 hero at 1536 samples and the 1600×1400 sequence at 384 samples using the same scene and Poly Haven's CC0 Studio Small 09 environment. These are AgX-tonemapped SDR exports. Illustrative music artwork is distinguished from actual product captures. Previously used keyboard photographs remain archived in the assets but are not loaded by the page.
- No student records, private application source, analytics trackers, credentials or backend API are included. Local QA evidence stays outside the publication.

This repository is the canonical hosting source for the portfolio.

## Active processor study

The chosen Silicon Stack is original procedural Blender geometry: graphite package, silicon die, copper heat spreader and titanium lid. Its 2560×2240 still uses 384 Cycles samples; 121 animation frames use 1280×1120 at 160 samples, with 960×840 variants. Both animation tiers total about 21.1 MB and fit the compressed cache. This is illustrative hardware, not a claim to have designed a manufactured CPU. The existing keyboard assets and their mechanical audit remain archived and are never requested by the active page.

To reproduce with Blender 4.5.15 and an NVIDIA OptiX device, obtain the CC0 Studio Small 09 environment linked below, then run:

```sh
blender --background --factory-startup --python-exit-code 1 --python scripts/render-hero-studies.py -- --concept silicon --out /path/cpu-sequence --hdri /path/studio_small_09_4k.exr --font /path/arial.ttf --width 1280 --samples 160 --frames 121
blender --background --factory-startup --python-exit-code 1 --python scripts/render-hero-studies.py -- --concept silicon --out /path/cpu-hero --hdri /path/studio_small_09_4k.exr --font /path/arial.ttf --width 2560 --samples 384 --still --progress 0
```

Keep raw Blender/PNG outputs outside this repository. The selected exports and provenance are under `shared/assets/product/processor-sequence/`; `npm test` validates every full and compact frame, the responsive posters and the parameterized authoring source.

## Sequence delivery and archived keyboard reproduction

The scroll player warms compressed frames after the opening pose paints, deduplicates identical held poses, and decodes a bounded neighbourhood ahead of the requested frame. Network transfers and decoding have separate concurrency limits (four and two). The decoded cache stays at or below 48 MiB; compressed images have a 32 MiB cap. The conservative owned-resource model is 112 MiB, including source decode buffers and canvas, not a claim about total browser memory. Save-Data clients load only the nearby window; mobile and reduced-motion visitors keep the still.

For the archived keyboard only, the 960px sequence is exported directly from the same original PNG poses with `node scripts/prepare-key-compact.mjs /path/sequence`. Medium displays decode these at their native size; larger displays retain the native frames (1280px for the active CPU; 1600px for the archived keyboard). This avoids resizing a full-resolution image during each scroll update. Run `npm test` for asset integrity and deterministic latency/lifecycle regression checks; the synthetic timing test is not a browser FPS measurement.

Blender is optional authoring software; visitors and local previews need no Blender installation. Obtain these two inputs and pass their local paths explicitly:

- [Cherry Keycaps Full.fbx](https://raw.githubusercontent.com/endeavoursc/cherry-mx-keycaps/3b94e3c7f8ed465917c1975ae0802d8965d5066b/Cherry%20Keycaps%20Full.fbx), pinned to [upstream commit 3b94e3c7](https://github.com/endeavoursc/cherry-mx-keycaps/commit/3b94e3c7f8ed465917c1975ae0802d8965d5066b). Copyright (c) 2020 Santiago Castelo, [MIT license](shared/assets/product/cherry-keycaps-MIT-LICENSE.txt); the complete notice accompanies the derived renders. The raw CAD is not bundled with this site. Source identity and hashes are recorded in [the CAD notice](shared/assets/product/cherry-keycaps-source.json).
- [Studio Small 09](https://polyhaven.com/a/studio_small_09), by Sergej Majboroda, [CC0](https://polyhaven.com/license). Download the [4K EXR](https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/4k/studio_small_09_4k.exr).

The archived `render-key.py` defaults select a satin titanium Enter key, cinematic lighting, opaque studio floor, and depth of field at f/40. The cap, clear upper housing, amber stem, spring and hollow lower tray separate along one axis in stages. Reverse assembly seats the lower parts before the cap descends. The spring changes pitch without scaling its wire thickness or collapsing its end coils. A font file is optional: the publication uses locally supplied Arial glyphs, while omitting `--font` uses Blender Bfont. Supply your own local font path to match the legends. Fonts are rendered as geometry; font files are not distributed. To reproduce the publication's sampling and native dimensions:

```sh
blender --background --factory-startup --python-exit-code 1 --python scripts/render-key.py -- --cad "/path/Cherry Keycaps Full.fbx" --hdri /path/studio_small_09_4k.exr --font /path/arial.ttf --output-dir /path/sequence --width 1600 --height 1400 --samples 384 --frames 201
blender --background --factory-startup --python-exit-code 1 --python scripts/render-key.py -- --cad "/path/Cherry Keycaps Full.fbx" --hdri /path/studio_small_09_4k.exr --font /path/arial.ttf --output-dir /path/hero --width 3840 --height 3360 --samples 1536 --progress .42
node scripts/prepare-key-assets.mjs /path/sequence /path/hero/key-p420.png
node scripts/prepare-key-compact.mjs /path/sequence
blender --background --factory-startup --python-exit-code 1 --python scripts/render-key-lift.py -- --cad "/path/Cherry Keycaps Full.fbx" --hdri /path/studio_small_09_4k.exr --font /path/arial.ttf --output-dir /path/dense-lift
node scripts/prepare-key-dense.mjs /path/dense-lift
```

Use `--transparent` (or `--no-opaque-floor`) for transparent film and `--no-dof` to disable depth of field. `--save-only` builds and saves the scene without rendering. Preview dimensions and samples can be lowered through their explicit flags.

Before rendering an edited mechanism, run `scripts/audit-key.py` through the same Blender command, with the same CAD/HDRI arguments and an output directory outside the publication. It checks evaluated mesh intersections across 1,001 positions, including switch/plate and neighboring-cap clearance, computes a lower bound for clearance between spring turns, and projects the cap bounds through the moving camera to detect clipping. It writes `mesh-audit.json` and exits unsuccessfully on intersections or inadequate framing. This checks the illustrative focal mechanism; it is not a physics simulation or a manufacturing certification. Review the rendered open, intermediate and pressed poses as well: geometrically clear parts can still overlap confusingly in the camera projection.

The conversion step requires FFmpeg with libwebp. Keep raw PNGs, EXRs and Blender projects outside the publication, then update the hero provenance and the module versions before running validation. The modeled mechanism uses the manufacturer's [MX construction description](https://www.cherry.de/en-gb/product/mx2a-black) as a physical reference. The resulting keyboard is an illustrative brandless assembly, rather than a claim to reproduce a commercial keyboard or a photograph of Cameron's software.
