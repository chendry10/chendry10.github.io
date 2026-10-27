/**
 * Authored cutaway of a keystroke. The page owns time, scroll and scheduling.
 * Local Three.js MIT bundle; material microfinish and two cheap contact decals.
 * No shadow maps, transmission pass, external textures or independent frame loop.
 * Progress is reversible and deterministic: explode → seat → close → signal.
 */
const scenes = new WeakMap();
const clamp = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };

export async function createSwitchScene(host, {signal, poster=false} = {}) {
  if (!(host instanceof Element)) throw new TypeError('A sized switch host is required.');
  scenes.get(host)?.dispose();
  let dead = false, ready = false, visible = !document.hidden, contextLost = false;
  let renderer, scene, camera, environment, resizeObserver;
  let progress = 0, painted = -1, renderCount = 0, sizeDirty = true;
  let width = 1, height = 1, drawWidth = 0, drawHeight = 0;
  let pose = () => {};
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const canvas = document.createElement('canvas');
  canvas.className = 'switch-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  host.append(canvas);
  host.dataset.switchState = 'loading';
  host.dataset.switchProgress = '0.0000';
  const quiet = () => document.documentElement.classList.contains('motion-off') || matchMedia('(prefers-reduced-motion:reduce)').matches;
  const owned = () => scenes.get(host) === api;
  const api = {
    setProgress(value) {
      if (dead) return;
      progress = clamp(Number(value));
      if (!ready || !visible || quiet()) return;
      if (!sizeDirty && Math.abs(progress - painted) < 0.0001) return;
      draw();
    },
    resize() {
      // No DOM geometry read: the ResizeObserver supplies our local content box.
      if (dead) return;
      sizeDirty = true;
      if (ready && visible && !quiet()) draw();
    },
    dispose() {
      if (dead) return;
      dead = true; ready = false;
      resizeObserver?.disconnect();
      document.removeEventListener('portfolio:motion', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      signal?.removeEventListener('abort', onAbort);
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      textures.forEach(item => item.dispose());
      environment?.dispose();
      renderer?.dispose();
      if (!contextLost) renderer?.forceContextLoss();
      canvas.remove();
      if (owned()) { scenes.delete(host); host.dataset.switchState = 'disposed'; }
    }
  };
  scenes.set(host, api);
  function onMotion(event) { if (event.detail?.off) api.dispose(); }
  function onVisibility() { visible = !document.hidden; if (visible && ready && !quiet()) { sizeDirty = true; draw(); } }
  function onContextLost(event) { event.preventDefault(); contextLost = true; api.dispose(); if (!scenes.has(host)) host.dataset.switchState = 'fallback'; }
  function onAbort() { api.dispose(); }
  document.addEventListener('portfolio:motion', onMotion);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  signal?.addEventListener('abort', onAbort, {once:true});

  function draw() {
    if (dead || !ready || !visible || quiet() || width < 2 || height < 2) return;
    if (sizeDirty) {
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      // Offline still capture can supersample; interactive scroll keeps its original budget.
      const pixelBudget=poster?8_300_000:1_500_000;
      const limit = Math.min(1, Math.sqrt(pixelBudget / (width * height * ratio * ratio)));
      const w = Math.max(1, Math.round(width * ratio * limit)), h = Math.max(1, Math.round(height * ratio * limit));
      if (w !== drawWidth || h !== drawHeight) { renderer.setSize(w, h, false); drawWidth = w; drawHeight = h; }
      const aspect = width / height, vertical = Math.max(6.25, 5.9 / aspect);
      camera.left = -vertical * aspect / 2; camera.right = vertical * aspect / 2;
      camera.top = vertical / 2; camera.bottom = -vertical / 2; camera.updateProjectionMatrix();
      sizeDirty = false;
    }
    pose(progress);
    renderer.render(scene, camera);
    painted = progress; renderCount++;
    host.dataset.switchState = 'ready';
    host.dataset.switchProgress = progress.toFixed(4);
    host.dataset.switchPhase = progress < .25 ? 'exploded' : progress < .42 ? 'seat' : progress < .60 ? 'press' : progress < .80 ? 'signal' : 'settled';
    host.dataset.switchRenderCount = String(renderCount);
    host.dataset.switchDrawcalls = String(renderer.info.render.calls);
    host.dataset.switchPixels = String(drawWidth * drawHeight);
  }

  try {
    if (signal?.aborted || quiet()) { api.dispose(); if (!scenes.has(host)) host.dataset.switchState = 'fallback'; return api; }
    const T = await import('./shared/vendor/three-key-runtime.js');
    if (dead || signal?.aborted || quiet()) { api.dispose(); return api; }
    const context = canvas.getContext('webgl2', {alpha:true, antialias:true, powerPreference:'high-performance', premultipliedAlpha:true});
    if (!context) throw new Error('WebGL2 unavailable');
    renderer = new T.WebGLRenderer({canvas, context, alpha:true, antialias:true, powerPreference:'high-performance'});
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .82;
    renderer.shadowMap.enabled = false;
    scene = new T.Scene();
    camera = new T.OrthographicCamera(-3, 3, 3, -3, .1, 50);
    const pmrem = new T.PMREMGenerator(renderer), room = new T.RoomEnvironment();
    try { environment = pmrem.fromScene(room, .035); scene.environment = environment.texture; }
    finally { room.dispose(); pmrem.dispose(); }
    // A broad warm key and two restrained edge lights retain shape in dark
    // materials. Low ambient fill prevents the moulded surfaces washing flat.
    scene.environmentIntensity = .64;
    scene.add(new T.HemisphereLight(0xc0d3e4, 0x060b13, .32));
    const keyLight = new T.DirectionalLight(0xffe6cf, 3.5); keyLight.position.set(-4, 8, 6); scene.add(keyLight);
    const coolLight = new T.DirectionalLight(0x9fc4ef, 1.15); coolLight.position.set(5, 3, -4); scene.add(coolLight);
    const rimLight = new T.DirectionalLight(0xd6e5f2, 1.55); rimLight.position.set(-5, 2, -7); scene.add(rimLight);

    const geometry = item => (geometries.add(item), item);
    const material = item => (materials.add(item), item);
    const ceramic = material(new T.MeshPhysicalMaterial({color:0xb9c1c6, metalness:.025, roughness:.36, clearcoat:.24, clearcoatRoughness:.32}));
    const graphite = material(new T.MeshStandardMaterial({color:0x0b111b, metalness:.66, roughness:.32}));
    const black = material(new T.MeshStandardMaterial({color:0x05090f, metalness:.18, roughness:.40}));
    const copper = material(new T.MeshStandardMaterial({color:0xad633f, metalness:1, roughness:.22, envMapIntensity:1.1}));
    const gold = material(new T.MeshStandardMaterial({color:0xc99e5c, metalness:1, roughness:.25}));
    const steel = material(new T.MeshStandardMaterial({color:0x7d909f, metalness:1, roughness:.23, envMapIntensity:1.1}));
    const glass = material(new T.MeshStandardMaterial({color:0x7fa8c4, metalness:.15, roughness:.16, transparent:true, opacity:.08, depthWrite:false}));
    const amber = material(new T.MeshBasicMaterial({color:0xffc779, transparent:true, opacity:1}));
    const halo = material(new T.MeshBasicMaterial({color:0xffc779, transparent:true, opacity:.11, depthWrite:false, blending:T.AdditiveBlending}));
    const activeGold = material(new T.MeshStandardMaterial({color:0xffce82, metalness:.85, roughness:.18, emissive:0xff9d38, emissiveIntensity:0}));
    const model = new T.Group(); scene.add(model);
    function mesh(g, mat, parent=model) { const object = new T.Mesh(geometry(g), mat); parent.add(object); return object; }
    function textureFromPixels(paint) {
      const surface=document.createElement('canvas');surface.width=surface.height=128;
      const context=surface.getContext('2d');if(!context)return null;
      const pixels=context.createImageData(128,128);paint(pixels.data);context.putImageData(pixels,0,0);
      const texture=new T.CanvasTexture(surface);textures.add(texture);
      texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      return texture;
    }
    // Deterministic microfinish: a shallow normal/roughness variation in the
    // moulded keycap, not a colour overlay or an image fetched at runtime.
    const microfinish=textureFromPixels(pixels=>{
      let seed=0x4a3b2c1d;
      for(let i=0;i<pixels.length;i+=4){
        seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
        const value=218+Math.round((seed>>>0)/4294967295*28);
        pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255;
      }
    });
    const capFinish=material(new T.MeshPhysicalMaterial({color:0xc0c7cb,metalness:.025,roughness:.43,clearcoat:.25,clearcoatRoughness:.33,...(microfinish?{roughnessMap:microfinish,bumpMap:microfinish,bumpScale:.004}: {})}));
    // Two static occlusion decals supply contact around the carrier and the
    // housing foot. They cost two transparent draws, not a shadow-map pass.
    const occlusion=textureFromPixels(pixels=>{
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){
        const u=(x+.5)/64-1,v=(y+.5)/64-1;
        const coverage=Math.pow(Math.max(0,1-Math.abs(u)**3-Math.abs(v)**3),.75);
        const i=(y*128+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;pixels[i+3]=Math.round(coverage*150);
      }
    });
    if(occlusion){
      const contactShade=material(new T.MeshBasicMaterial({map:occlusion,color:0x000000,transparent:true,depthWrite:false,toneMapped:false}));
      const shade=(w,d,y)=>{
        const g=new T.BufferGeometry();
        g.setAttribute('position',new T.Float32BufferAttribute([-w/2,y,-d/2,-w/2,y,d/2,w/2,y,d/2,w/2,y,-d/2],3));
        g.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,1,1,1,0],2));g.setIndex([0,1,2,0,2,3]);
        return mesh(g,contactShade);
      };
      shade(5.15,3.64,-.285);
      shade(2.42,2.26,.008);
    }
    function rounded(w, d, r) {
      const s = new T.Shape(), x = -w/2, z = -d/2;
      s.moveTo(x+r,z); s.lineTo(x+w-r,z); s.quadraticCurveTo(x+w,z,x+w,z+r);
      s.lineTo(x+w,z+d-r); s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);
      s.lineTo(x+r,z+d); s.quadraticCurveTo(x,z+d,x,z+d-r);
      s.lineTo(x,z+r); s.quadraticCurveTo(x,z,x+r,z); return s;
    }
    function plate(w,d,h,r,mat,parent=model) {
      const g = new T.ExtrudeGeometry(rounded(w,d,r), {depth:h, steps:1, bevelEnabled:true, bevelThickness:Math.min(.028,h/3), bevelSize:.025, bevelSegments:3, curveSegments:10});
      g.rotateX(-Math.PI/2); g.translate(0,-h/2,0); return mesh(g,mat,parent);
    }
    function pipe(points,r,mat,parent=model,segments=64) { return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,7,false),mat,parent); }
    function batch(parent) {
      // Bake each static material group once. Moving assemblies remain separate.
      const groups = new Map();
      for (const child of [...parent.children]) if (child.isMesh && !child.material.transparent) {
        if (!groups.has(child.material)) groups.set(child.material, []);
        groups.get(child.material).push(child);
      }
      for (const [mat, list] of groups) {
        if (list.length < 2) continue;
        const vertices=[], normals=[], indices=[]; let offset=0;
        for (const child of list) {
          child.updateMatrix(); const g=child.geometry.clone(); g.applyMatrix4(child.matrix);
          const p=g.getAttribute('position'), n=g.getAttribute('normal');
          for(let i=0;i<p.count;i++){vertices.push(p.getX(i),p.getY(i),p.getZ(i)); normals.push(n.getX(i),n.getY(i),n.getZ(i));}
          if(g.index) for(let i=0;i<g.index.count;i++)indices.push(g.index.getX(i)+offset);
          else for(let i=0;i<p.count;i++)indices.push(i+offset);
          offset+=p.count;g.dispose();parent.remove(child);
        }
        const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(vertices,3)); g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(indices);mesh(g,mat,parent);
      }
    }

    // Chamfered graphite carrier and paired machined copper traces.
    const base=new T.Group();model.add(base);
    plate(4.65,3.16,.17,.26,graphite,base).position.y=-.11;
    plate(4.55,3.06,.065,.24,steel,base).position.y=-.225;
    plate(1.88,1.76,.10,.15,steel,base).position.y=.06;
    plate(1.68,1.58,.13,.13,black,base).position.y=.17;
    for(const z of[-1.25,1.25])for(let i=0;i<8;i++){const pin=mesh(new T.BoxGeometry(.14,.035,.24),gold,base);pin.position.set(-1.72+i*.49,-.005,z);}
    for(const x of[-2.02,2.02])for(const z of[-1.25,1.25]){const screw=mesh(new T.CylinderGeometry(.095,.095,.036,18),steel,base);screw.position.set(x,.001,z);const slot=mesh(new T.BoxGeometry(.11,.009,.022),black,base);slot.position.set(x,.023,z);}
    pipe([[-.5,.014,-.5],[-1.2,.014,-.85],[-1.74,.014,-.85],[-1.74,.014,-1.23]],.018,copper,base);
    pipe([[-.6,.014,.5],[-1.32,.014,.83],[-1.74,.014,.83],[-1.74,.014,1.23]],.018,copper,base);
    batch(base);

    // Open sided optical housing: thin glass walls keep every internal legible.
    const housing=new T.Group();model.add(housing);
    for(const y of[.32,1.20])for(const z of[-.68,.68]){const beam=mesh(new T.BoxGeometry(1.49,.045,.045),steel,housing);beam.position.set(0,y,z);}
    for(const y of[.32,1.20])for(const x of[-.72,.72]){const beam=mesh(new T.BoxGeometry(.045,.045,1.39),steel,housing);beam.position.set(x,y,0);}
    for(const x of[-.70,.70])for(const z of[-.66,.66]){const guide=mesh(new T.CylinderGeometry(.027,.027,.90,12),gold,housing);guide.position.set(x,.76,z);}
    for(const x of[-.73,.73]){const wall=mesh(new T.BoxGeometry(.02,.84,1.30),glass,housing);wall.position.set(x,.76,0);wall.renderOrder=2;}
    const backGlass=mesh(new T.BoxGeometry(1.40,.84,.02),glass,housing);backGlass.position.set(0,.76,-.68);backGlass.renderOrder=1;
    const rim=plate(.56,.54,.09,.08,steel,housing);rim.position.y=1.22;
    batch(housing);

    const springGroup=new T.Group();model.add(springGroup);
    const coilPoints=[];for(let i=0;i<=240;i++){const t=i/240,a=t*Math.PI*13;coilPoints.push(new T.Vector3(Math.cos(a)*.31,t*.91,Math.sin(a)*.31));}
    const spring=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(coilPoints),240,.037,8,false),copper,springGroup);
    const springFoot=mesh(new T.TorusGeometry(.31,.042,10,48),gold,springGroup);springFoot.rotation.x=Math.PI/2;
    const plunger=new T.Group();model.add(plunger);
    const shaft=mesh(new T.CylinderGeometry(.13,.18,.78,20),ceramic,plunger);shaft.position.y=.83;
    const saddle=plate(.53,.51,.12,.07,copper,plunger);saddle.position.y=1.04;
    const crossA=mesh(new T.BoxGeometry(.54,.16,.17),ceramic,plunger);crossA.position.y=1.44;
    const crossB=mesh(new T.BoxGeometry(.17,.16,.54),ceramic,plunger);crossB.position.y=1.44;
    batch(plunger);

    const cap=new T.Group();model.add(cap);
    const levels=[[-.31,2.43,2.19,.23],[-.24,2.49,2.25,.25],[-.18,2.46,2.22,.25],[.17,2.06,1.89,.21],[.24,2,1.83,.21],[.28,1.89,1.72,.20],[.265,1.63,1.47,.18],[.245,1.30,1.17,.17]];
    const vertices=[],indices=[];const ringCount=64;
    for(const[y,w,d,r]of levels){for(const[cx,cz,start]of[[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let j=0;j<16;j++){const a=start+j/16*Math.PI/2;vertices.push(cx+Math.cos(a)*r,y,cz+Math.sin(a)*r);}}
    for(let l=0;l<levels.length-1;l++)for(let i=0;i<ringCount;i++){const j=(i+1)%ringCount,a=l*ringCount+i,b=(l+1)*ringCount+i,c=l*ringCount+j,d=(l+1)*ringCount+j;indices.push(a,b,c,c,b,d);}
    const top=vertices.length/3;vertices.push(0,.245,0);const bottom=vertices.length/3;vertices.push(0,-.31,0);
    for(let i=0;i<ringCount;i++){const j=(i+1)%ringCount;indices.push(top,(levels.length-1)*ringCount+j,(levels.length-1)*ringCount+i,bottom,i,j);}
    const capUV=[];for(let i=0;i<vertices.length;i+=3)capUV.push((vertices[i]+1.28)/2.56,(vertices[i+2]+1.16)/2.32);
    const capGeo=new T.BufferGeometry();capGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));capGeo.setAttribute('uv',new T.Float32BufferAttribute(capUV,2));capGeo.setIndex(indices);capGeo.computeVertexNormals();mesh(capGeo,capFinish,cap);
    pipe([[.35,.278,-.29],[.35,.274,.08],[.21,.263,.23],[-.35,.253,.23]],.018,graphite,cap,32);
    for(const z of[-1,1]){const arrow=mesh(new T.BoxGeometry(.27,.013,.035),graphite,cap);arrow.position.set(-.25,.257,.23+z*.082);arrow.rotation.y=z*-.65;}
    batch(cap);

    const contact=new T.Group();model.add(contact);
    const leaf=mesh(new T.BoxGeometry(.70,.029,.14),copper,contact);leaf.position.x=-.29;
    const moving=mesh(new T.SphereGeometry(.067,16,10),activeGold,contact);moving.position.x=.055;
    const fixed=mesh(new T.BoxGeometry(.63,.035,.14),gold,model);fixed.position.set(.55,.36,.80);
    const fixedPad=mesh(new T.SphereGeometry(.067,16,10),activeGold,model);fixedPad.position.set(.235,.36,.80);
    const signalCurve=new T.CatmullRomCurve3([[.235,.045,.80],[.58,.045,1.01],[1.20,.045,1.01],[1.62,.045,.64],[2.27,.045,.64]].map(p=>new T.Vector3(...p)));
    mesh(new T.TubeGeometry(signalCurve,96,.022,7,false),copper);
    const liveGeometry=geometry(new T.TubeGeometry(signalCurve,96,.029,7,false)),haloGeometry=geometry(new T.TubeGeometry(signalCurve,96,.072,7,false));
    const trace=new T.Mesh(liveGeometry,amber),traceHalo=new T.Mesh(haloGeometry,halo);model.add(trace,traceHalo);traceHalo.renderOrder=4;trace.renderOrder=5;
    const pulse=mesh(new T.SphereGeometry(.075,18,12),amber);pulse.renderOrder=6;
    const end=mesh(new T.TorusGeometry(.105,.020,9,32),gold);end.rotation.x=Math.PI/2;end.position.set(2.27,.048,.64);
    const endLight=mesh(new T.CylinderGeometry(.061,.061,.014,18),activeGold);endLight.position.set(2.27,.052,.64);

    pose=p=>{
      const assemble=smooth(.08,.42,p),spread=1-assemble;
      const press=smooth(.42,.60,p)*(1-smooth(.84,1,p));
      const travel=smooth(.60,.80,p),exit=smooth(.80,1,p);
      cap.position.set(spread*.12,1.73+spread*1.50-press*.38,spread*-.10);
      cap.rotation.set(spread*-.06,spread*-.14,spread*-.10);
      housing.position.set(spread*-.18,spread*.60,spread*-.08);
      housing.rotation.y=spread*.08;
      springGroup.position.set(0,.28+spread*.20,0);spring.scale.y=1-press*.44;
      plunger.position.set(0,spread*.77-press*.36,0);
      contact.position.set(press*.11,.36,.80);contact.rotation.z=-.16*(1-press);
      activeGold.emissiveIntensity=press*.65+travel*.50;
      const count=Math.floor(liveGeometry.index.count*travel/3)*3;
      liveGeometry.setDrawRange(0,count);haloGeometry.setDrawRange(0,count);
      pulse.visible=p>=.60&&p<.94;signalCurve.getPoint(travel,pulse.position);
      amber.opacity=1-exit*.20;halo.opacity=.13*(1-exit*.40);
      model.rotation.y=-.16+smooth(.08,.58,p)*.22;
      model.rotation.z=-.035+smooth(.25,.65,p)*.045;
      const orbit=smooth(0,.65,p);
      camera.position.set(6.5-orbit*3.9,5.8-orbit*2.4,8.7+orbit*.9);
      camera.lookAt(.08,1.47-orbit*.42-spread*.06,0);
      // A restrained lens move punctuates closure, then returns to full framing.
      camera.zoom=1+.11*smooth(.30,.50,p)*(1-smooth(.67,.85,p));
      camera.updateProjectionMatrix();
    };
    pose(progress);
    // Shader compilation is awaited before the consumer reveals this canvas.
    if (renderer.compileAsync) await renderer.compileAsync(scene,camera);
    else renderer.compile(scene,camera);
    if(dead || signal?.aborted || quiet()){api.dispose();return api;}
    ready=true;
    resizeObserver=new ResizeObserver(entries=>{
      if(dead)return;
      const bounds=entries[0]?.contentRect;
      if(!bounds)return;
      width=bounds.width;height=bounds.height;sizeDirty=true;
      if(visible&&!quiet())draw();
    });
    resizeObserver.observe(host);
    host.dataset.switchState='prepared';
    return api;
  } catch(error) {
    const wasOwned=owned();api.dispose();
    if(wasOwned&&!scenes.has(host)){host.dataset.switchState='fallback';host.dataset.switchFallback='renderer-unavailable';}
    return api;
  }
}
