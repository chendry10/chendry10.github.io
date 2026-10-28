/**
 * A continuous, full-size published score: instrument -> folio -> real reader.
 * The page owns scroll, scheduling and geometry invalidation. This layer never
 * changes product state, focus, broadcasts, scrolling or persistence.
 */
export const SCORE_ARRIVAL_END=.30;
export const scoreFolioProgress=value=>Math.max(0,Math.min(1,(value-SCORE_ARRIVAL_END)/(1-SCORE_ARRIVAL_END)));

// Fixed viewport endpoints give the travelling sheet one continuous path.
// In particular, no halfway heading-clearance branch can teleport the sheet.
export function scoreArrivalPose({from,to,paperWidth,width,height},progress){
  const p=Math.max(0,Math.min(1,progress)),t=p*p*(3-2*p);
  const arc=Math.sin(t*Math.PI)**2,mix=(a,b)=>a+(b-a)*t;
  const travelWidth=mix(from.w,paperWidth)+arc*Math.max(0,Math.min(450,width*.39)-Math.max(from.w,paperWidth));
  return {x:mix(from.x,to.x)-arc*width*.045,y:mix(from.y,to.y)-arc*height*.06,z:to.z*t+arc*70,s:travelWidth/paperWidth,rx:to.rx*t-arc*9,ry:to.ry*t+arc*17,rz:to.rz*t-arc*10,captionOpacity:0};
}

export function createScoreJourney({music, scoreAct, demo}) {
  const source=music?.querySelector('.hero-score > img');
  const field=scoreAct?.querySelector('.score-routing-field');
  const stage=scoreAct?.querySelector('.score-routing-stage');
  const headingElement=scoreAct?.querySelector('.score-routing-heading');
  const nativePaper=scoreAct?.querySelector('[data-score-part="0"] .score-paper');
  const otherPapers=[...(scoreAct?.querySelectorAll('[data-score-part]:not([data-score-part="0"]) .score-paper')||[])];
  if(!source||!field||!stage||!nativePaper||!demo)throw new TypeError('Score journey needs its source, folio and real demo.');

  const layer=document.createElement('div');
  layer.className='score-journey';layer.setAttribute('aria-hidden','true');
  const scene=document.createElement('div');scene.className='score-journey-stage folio-enhanced';
  const track=document.createElement('div');track.className='score-journey-track';
  const paper=nativePaper.cloneNode(true);paper.removeAttribute('style');
  paper.classList.add('score-journey-sheet');
  paper.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
  const image=paper.querySelector('img');image.removeAttribute('style');image.loading='eager';image.alt='';
  const caption=paper.querySelector('figcaption');caption?.removeAttribute('style');
  const shadow=document.createElement('div');shadow.className='score-journey-shadow';
  paper.prepend(shadow);track.append(paper);scene.append(track);layer.append(scene);document.body.append(layer);
  demo.classList.add('score-journey-targeted');

  const originals=new Map([source,nativePaper,headingElement,...otherPapers].filter(Boolean).map(element=>[element,element.style.opacity]));
  const writes=new WeakMap();
  const clamp=n=>Math.min(1,Math.max(0,Number.isFinite(n)?n:0));
  const range=(n,a,b)=>clamp((n-a)/Math.max(.000001,b-a));
  const smooth=n=>n*n*(3-2*n);
  const mix=(a,b,p)=>a+(b-a)*p;
  const fmt=n=>(Math.round(n*1000)/1000).toString();
  const write=(element,key,value)=>{
    if(!element)return;
    let cache=writes.get(element);if(!cache){cache=new Map();writes.set(element,cache);}
    if(cache.get(key)===value)return;element.style[key]=value;cache.set(key,value);
  };
  let dead=false,layout=null,targetImage=null,finalCancelled=false,lastY=0,lastStill=true,lastScore=NaN;
  const setPhase=value=>{if(layer.dataset.journeyPhase!==value)layer.dataset.journeyPhase=value;};
  const visible=value=>write(layer,'opacity',value?'1':'0');
  const restore=element=>{if(element)write(element,'opacity',originals.get(element)||'');};
  const restoreOthers=()=>otherPapers.forEach(restore);
  const restoreNative=()=>{restore(source);restore(nativePaper);restore(targetImage);restore(headingElement);restoreOthers();};
  const invalidate=()=>{if(!dead)document.dispatchEvent(new Event('portfolio:journey-layout'));};
  function interacted(event){
    if(finalCancelled||!event.target?.closest?.('button,select,input,a,dialog'))return;
    finalCancelled=true;demo.classList.remove('score-journey-targeted');
    restore(targetImage);render(lastY,lastStill,lastScore);
  }
  for(const type of ['pointerdown','keydown','change','input'])demo.addEventListener(type,interacted,true);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(invalidate):null;
  observer?.observe(music);observer?.observe(field);observer?.observe(demo);
  const mutations=typeof MutationObserver==='function'?new MutationObserver(invalidate):null;
  mutations?.observe(demo,{childList:true,subtree:true});

  function measure(){
    if(dead)return;
    const y=scrollY,height=innerHeight,width=innerWidth;
    const src=source.getBoundingClientRect(),section=scoreAct.getBoundingClientRect();
    const sr=stage.getBoundingClientRect(),fr=field.getBoundingClientRect();
    const heading=scoreAct.querySelector('.score-routing-heading').getBoundingClientRect();
    const paperWidth=parseFloat(field.style.getPropertyValue('--folio-paper-width'))||nativePaper.offsetWidth;
    const paperHeight=paperWidth*(1700/2200)+38;
    const reading=demo.querySelector('[data-reading-area="1"]');
    const nextTarget=reading?.querySelector('img[data-score-song="victory"][data-score-part="cornet"]')||null;
    if(targetImage!==nextTarget){restore(targetImage);targetImage=nextTarget;if(targetImage&&!originals.has(targetImage))originals.set(targetImage,targetImage.style.opacity);}
    const targetBox=reading?.getBoundingClientRect();
    const targetHeight=targetBox?Math.min(targetBox.height,targetBox.width*(1700/2200)):0;
    const targetWidth=targetHeight*(2200/1700);
    const target=targetBox?{x:targetBox.left+(targetBox.width-targetWidth)/2,y:targetBox.top+y+(targetBox.height-targetHeight)/2,w:targetWidth,h:targetHeight}:null;
    const pinStart=section.top+y,pinRange=Math.max(1,section.height-height);
    const progressEnd=pinStart+pinRange,pinEnd=pinStart+Math.max(1,section.height-sr.height);
    const heroWidth=Math.max(300,Math.min(450,width*.32,(height-230)*(2200/1700)));
    const heroHeight=heroWidth*(1700/2200);
    const flight={
      x:Math.max(36,width-48-heroWidth),
      y:Math.max(110,Math.min(height*.34,height-heroHeight-92)),
      w:heroWidth,rx:-11,ry:17,rz:-8,
    };
    const exitStart=Math.max(pinStart+pinRange*.83,pinEnd-height*.20);
    const liftEnd=pinEnd+height*.36;
    const approachStart=target?Math.max(liftEnd,target.y-height*.78):Infinity;
    const approachEnd=target?Math.max(approachStart+height*.24,target.y-Math.max(118,height*.30)):Infinity;
    layout={
      width,height,paperWidth,paperHeight,fieldWidth:fr.width,fieldHeight:fr.height,
      fieldX:fr.left,fieldY:fr.top-sr.top,headingBottom:heading.bottom-sr.top,
      pinStart,pinRange,pinEnd,progressEnd,
      source:{x:src.left,y:src.top+y,w:src.width,h:src.height},target,flight,
      stackX:(fr.width-paperWidth)/2,
      stackY:Math.min(74,Math.max(44,(fr.height-paperHeight-90)*.5)),
      slotX:fr.width*.165-paperWidth/2,
      begin:src.top+y+src.height*.5-height*.56,
      enterEnd:pinStart+pinRange*SCORE_ARRIVAL_END,
      exitStart,liftEnd,approachStart,approachEnd,
    };
    write(scene,'width',`${fmt(fr.width)}px`);write(scene,'height',`${fmt(fr.height)}px`);
    write(track,'width',`${fmt(paperWidth)}px`);
    layer.dataset.flightWidth=fmt(heroWidth);
  }
  function stageTop(y){
    if(y<layout.pinStart)return layout.pinStart-y;
    if(y>layout.pinEnd)return layout.pinEnd-y;
    return 0;
  }
  function folioPose(p){
    // Same cornet trajectory and perspective as the first native folio part.
    const lift=smooth(range(p,.035,.25)),fan=smooth(range(p,.23,.66));
    const arc=Math.sin(fan*Math.PI),dock=smooth(range(p,.68,.9));
    return {x:mix(layout.stackX,layout.slotX,fan),y:mix(layout.stackY-lift*27,14,fan)-arc*30+dock*8,z:(1-fan)*18+arc*22,rx:(1-fan)*(-9-lift*7),ry:-23*(1-fan)+arc*13,rz:-4.8*(1-fan)-arc*3};
  }
  function paint({x,y,z=0,s=1,rx=0,ry=0,rz=0,captionOpacity=0,shadowOpacity=1},originY){
    write(scene,'transform',`translate3d(${fmt(layout.fieldX)}px,${fmt(originY)}px,0)`);
    write(track,'transform',`translate3d(${fmt(x-layout.fieldX)}px,${fmt(y-originY)}px,${fmt(z)}px) scale(${fmt(s)})`);
    write(paper,'transform',`rotateX(${fmt(rx)}deg) rotateY(${fmt(ry)}deg) rotateZ(${fmt(rz)}deg)`);
    write(caption,'opacity',fmt(captionOpacity));write(shadow,'opacity',fmt(shadowOpacity));visible(true);
  }
  function render(scrollPosition,still=false,scoreProgress=NaN){
    if(dead||!layout)return;
    const y=Number.isFinite(scrollPosition)?scrollPosition:0;
    lastY=y;lastStill=still;lastScore=scoreProgress;
    const approach=fmt(range(y,layout.approachStart,layout.approachEnd));
    if(layer.dataset.approachProgress!==approach)layer.dataset.approachProgress=approach;
    const departure=fmt(range(y,layout.exitStart,layout.liftEnd));
    if(layer.dataset.departureProgress!==departure)layer.dataset.departureProgress=departure;
    // Match the real demo's single-column breakpoint, where there is no safe
    // side lane for a large sheet. All native evidence remains available.
    if(still||layout.width<=760||y<layout.begin){visible(false);restoreNative();setPhase('native');return;}
    const p=Number.isFinite(scoreProgress)?clamp(scoreProgress):scoreFolioProgress(range(y,layout.pinStart,layout.progressEnd));
    const local=folioPose(p),originY=stageTop(y)+layout.fieldY;
    const native={x:layout.fieldX+local.x,y:originY+local.y,z:local.z,s:1,rx:local.rx,ry:local.ry,rz:local.rz,captionOpacity:smooth(range(smooth(range(p,.23,.66)),.48,.93))};
    if(y<layout.enterEnd){
      const raw=range(y,layout.begin,layout.enterEnd),t=smooth(raw);
      const from={...layout.source,y:layout.source.y-layout.begin};
      const to={...native,y:layout.fieldY+local.y};
      restore(targetImage);restoreOthers();write(source,'opacity','0');write(nativePaper,'opacity','0');
      write(headingElement,'opacity',fmt(smooth(range(t,.90,1))));
      paint(scoreArrivalPose({from,to,paperWidth:layout.paperWidth,width:layout.width,height:layout.height},raw),originY);
      setPhase('trumpet-to-folio');return;
    }
    restore(source);restore(headingElement);
    if(y<layout.exitStart){
      restore(targetImage);restoreOthers();write(nativePaper,'opacity','0');paint(native,originY);setPhase('folio');return;
    }
    if(finalCancelled||!layout.target||!targetImage){visible(false);restoreNative();setPhase(finalCancelled?'interactive':'native');return;}
    const flight=layout.flight;
    write(nativePaper,'opacity','0');
    if(y<layout.liftEnd){
      const t=smooth(range(y,layout.exitStart,layout.liftEnd)),arc=Math.sin(t*Math.PI);
      restore(targetImage);otherPapers.forEach(element=>write(element,'opacity',fmt(1-t*.62)));
      const top=Math.max(stageTop(y)+layout.headingBottom+18,mix(native.y,flight.y,t)-arc*layout.height*.11);
      paint({x:mix(native.x,flight.x,t)+arc*layout.width*.035,y:top,z:arc*125,s:mix(1,flight.w/layout.paperWidth,t),rx:mix(native.rx,flight.rx,t)-arc*8,ry:mix(native.ry,flight.ry,t)+arc*13,rz:mix(native.rz,flight.rz,t)-arc*11,captionOpacity:1,shadowOpacity:1},originY);
      setPhase('folio-lift');return;
    }
    otherPapers.forEach(element=>write(element,'opacity','.38'));
    if(y<layout.approachStart){
      restore(targetImage);
      paint({x:flight.x,y:flight.y,z:0,s:flight.w/layout.paperWidth,rx:flight.rx,ry:flight.ry,rz:flight.rz,captionOpacity:1},originY);
      setPhase('score-flight');return;
    }
    if(y<layout.approachEnd){
      const travel=range(y,layout.approachStart,layout.approachEnd),t=smooth(travel),arc=Math.sin(t*Math.PI);
      write(targetImage,'opacity','0');
      paint({x:mix(flight.x,layout.target.x,t),y:mix(flight.y,layout.target.y-y,t)-arc*layout.height*.055,s:mix(flight.w/layout.paperWidth,layout.target.w/layout.paperWidth,t),rx:flight.rx*(1-t)-arc*4,ry:flight.ry*(1-t),rz:flight.rz*(1-t)-arc*5,captionOpacity:1-smooth(range(travel,.35,.85)),shadowOpacity:1-t},originY);
      setPhase('landing');return;
    }
    visible(false);restoreNative();setPhase('docked');
  }
  function dispose(){
    if(dead)return;dead=true;observer?.disconnect();mutations?.disconnect();
    for(const type of ['pointerdown','keydown','change','input'])demo.removeEventListener(type,interacted,true);
    originals.forEach((value,element)=>{element.style.opacity=value;});
    demo.classList.remove('score-journey-targeted');layer.remove();layout=null;
  }
  measure();
  return {measure,render,dispose};
}
