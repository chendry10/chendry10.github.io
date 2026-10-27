# Actual product captures

Captured locally through the browser on 2026-10-26 from existing repository HTML, without authenticated student data or server API configuration. These are actual rendered product interfaces, not generated screenshots. Native dimensions are recorded per asset; no upscaling is used.

## Blizzard Defense: corrected Typing Agent implementation

- `blizzard-defense-hub.webp`: the actual Typing Agent Blizzard Defense game hub, including its station tower and game controls. Native capture:1440x900. Mobile variant:`blizzard-defense-hub-mobile.webp`,1280x800.
- `blizzard-defense-gameplay.webp`: actual active Typing Agent Blizzard Defense gameplay reached through normal UI interactions, showing the defense tower, incoming typing targets and storm HUD. Native capture:1440x900. Mobile variant:`blizzard-defense-gameplay-mobile.webp`,1280x800.

Source:`C:/Users/Cameron/ta5/modules/student/views/blizzard-defense/index.html`,501207 bytes,SHA-256 `28a7d8506acf722260ace3e7fd88813e4bc116887750f0804f3880856bd2084e`. The source file's latest commit in the inspected checkout was `313b1da5f1ed94de0e54920bd7cca5d941812e2b` (Fix game accessibility and audio controls); checkout HEAD was `d666d83436ae98accfcda320b22e880b8f343a86` during this audit. The game is served by TA5's `modules/student/controllers/BlizzardDefenseController.php` through its protected index action. This captures the actual frontend, not the authenticated route or its server behavior.

QA source:`qa/previews/blizzard-defense-ta.html`. This copy localizes dependencies and applies the QA isolation policy; gameplay logic is unchanged. The parent controller's API/session injection is absent, `BD_API` remains null, and CSP blocks connections. Hub and later gameplay states were reached through the normal game UI, without fabricated game state or inserted UI. The playable source, approved word banks, fonts and audio remain under QA and are excluded from the selected-site export.

The former `blizzard-defense.webp`/`blizzard-defense-mobile.webp` snowy-village images were taken from a separate Yeti Academy self-contained curriculum game, `web/games/blizzard-defense/blizzard-defense.html`. They did not represent the Typing Agent game intended by this portfolio and have been superseded. Historical captures belong under QA, not runtime product evidence. All eight live Blizzard image occurrences use the corrected hub or gameplay assets.

## Typing Battleship

- `battleship-practice.webp`: Typing Agent Student V6 Typing Battleship, a local Captain Salvo practice game after random ship placement. Native3840x2088; mobile1600x870. QA source:`qa/previews/battleship-practice.html`. No opponent account, multiplayer server or saved score was involved.
- `battleship-detail.webp`: direct crop of that native capture, rectangle(1310,0)-(3110,1420), yielding1800x1420, used for first-view proof frames. Mobile1200x947. No UI was added or changed.

These team product images illustrate the adjacent scoped engineering contribution descriptions. Captures do not prove server authorization, score persistence, multiplayer correctness, deployment or sole authorship. Preparation/source hashes are retained under `qa/previews/sources.json`. QA-only playable copies and sound assets are excluded from the export.


## Genuine gameplay recording - 2026-10-27

`blizzard-defense-play.mp4` is a native1920x1080,30fps,10.2second silent recording of actual Storm8 gameplay: native typing, target destruction, boss defeat and progress awards. The1280x720 encoding is a proportional derivative. Both posters come from the same real captured frame. No game state, UI pixels or scores were fabricated, and no image generation or upscaling was used.

The current original source hash remains `28a7d8506acf722260ace3e7fd88813e4bc116887750f0804f3880856bd2084e`; the same isolated QA copy differs only in local dependency paths and CSP. Rounds were played and upgrades earned through normal UI. Raw frames and input/capture timestamps remain in QA and are excluded from exports. Runtime asset sizes and hashes are in `blizzard-recording-provenance.json`.


### Smooth recording replacement (2026-10-27)

The current recording replaces the earlier capture that paused on each input. It uses direct browser viewport capture, native per-letter typing, and a 10.7-second section of genuine Storm 9 gameplay. Selected capture intervals have no gaps above 50 ms; no interpolation or fabricated frames were used. Both H.264 derivatives use standard BT.709 limited-range YUV420p for broad hardware decoding. Posters come from the new recording. Raw frames, timing comparison and QA remain outside the export.
