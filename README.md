# Cameron Hendry's portfolio

Live at **https://chendry10.github.io/**. This is the selected Cobalt Concerto design: real keyboard photography, an authored 3D switch study, actual Typing Agent gameplay, and a continuous score-page journey that lands in a working LyreLink demonstration.

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

## Sources and boundaries

- `motion.js`, `switch-scene.js`, `score-folio.js` and `score-journey.js` contain the visual choreography. Native scrolling, reduced motion and mobile fallbacks remain available.
- `shared/lyre-demo.js` implements the browser-local director/member demonstration; it does not connect to a live band or private music library.
- Media source notices and licenses are beside the files under `shared/assets/` and `shared/vendor/`. Illustrative music artwork is distinguished from actual product captures. The keyboard hero is licensed photography.
- No student records, private application source, analytics trackers, credentials or backend API are included. Local QA evidence stays outside the publication.

This repository is the canonical hosting source for the portfolio.
