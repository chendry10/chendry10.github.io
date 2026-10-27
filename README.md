# Cameron Hendry's portfolio

Live at **https://chendry10.github.io/**. The connected Cobalt Concerto story begins with an authored 3D key. Its signal becomes actual Typing Agent gameplay, and that same game window settles into the engineering case. A later score-page journey lands in a working LyreLink demonstration.

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

- `motion.js`, `switch-scene.js`, `product-bridge.js`, `score-folio.js` and `score-journey.js` contain the visual choreography. One demand-driven scheduler follows native scrolling; the game and score each retain their identity through their handoffs. Reduced motion and tablet/phone layouts use native reading positions.
- `shared/lyre-demo.js` implements the browser-local director/member demonstration; it does not connect to a live band or private music library.
- Media source notices and licenses are beside the files under `shared/assets/` and `shared/vendor/`. The key still is rendered from this site's procedural geometry; it matches the interactive object. Illustrative music artwork is distinguished from actual product captures. Previously used keyboard photographs remain archived in the assets but are not loaded by the page.
- No student records, private application source, analytics trackers, credentials or backend API are included. Local QA evidence stays outside the publication.

This repository is the canonical hosting source for the portfolio.
