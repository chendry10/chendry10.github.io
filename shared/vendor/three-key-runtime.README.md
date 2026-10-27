# Three.js physical-key runtime

This locally served ES module contains the WebGL renderer, required geometry and material classes, and `RoomEnvironment` from **Three.js 0.186.1**. There is no runtime CDN or external asset request. The original MIT license is preserved in `three-key-runtime.LICENSE.txt`; the distribution also retains its bundled license comment.

- Official source package: <https://registry.npmjs.org/three/-/three-0.186.1.tgz>
- npm integrity: `sha512-blFeqb49wRCSGUGj7gtpfnSGHy2lwDk94RhUmS1c/hTby70kvChbWpkJ4Pm1390LqzzvTmzgXKHPEafJwCb8jA==`
- Runtime bundle size: 587,297 bytes
- Runtime bundle SHA-256: `3b5def2f01c19a8aba1f0cec52ab555aeb860cd10e6205377f564005dce070e6`
- Build tool: official `esbuild@0.28.2`, build-only, not a website dependency.
- Bundling: ES module, browser platform, ES2022 target, minified, legal comments retained.

The temporary build installation was isolated outside the website. Its `package.json` and lockfile were not added to the portfolio, and the portfolio's package manifest was not changed.

## Entry module

```js
export {
  WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap,
  Scene, OrthographicCamera, PMREMGenerator, HemisphereLight, DirectionalLight, PointLight,
  Color, Group, MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, SpriteMaterial,
  AdditiveBlending, Mesh, Shape, ExtrudeGeometry, BufferGeometry, Float32BufferAttribute,
  CylinderGeometry, BoxGeometry, TorusGeometry, SphereGeometry, TubeGeometry,
  CatmullRomCurve3, Vector3, CanvasTexture, Sprite
} from 'three';
export { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
```

To reproduce, install exact versions `three@0.186.1 esbuild@0.28.2` from `https://registry.npmjs.org` into a separate build directory. Bundle the entry above with esbuild `{bundle:true,format:'esm',platform:'browser',minify:true,target:['es2022'],legalComments:'eof'}`. Keep the Three.js license beside the output. This repository does not need npm installation to serve the module.
