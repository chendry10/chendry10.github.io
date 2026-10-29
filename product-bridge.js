import {scrollViewportHeight} from './scroll-viewport.js?v=ac31df9665ba';
/** Carry the genuine gameplay figure into its reading position; never clone it. */
export function createProductBridge({product,bay,opening}){
  if(!product||!bay||!opening)return {measure(){},render(){return false;},dispose(){}};
  const home=product.parentNode;
  const marker=document.createComment('gameplay figure home');
  home.insertBefore(marker,product);
  const fallback=bay.querySelector('[data-product-fallback]');
  const portal=document.createElement('div');
  portal.className='product-bridge-portal';
  Object.assign(portal.style,{position:'fixed',inset:'0',zIndex:'19',pointerEvents:'none'});
  document.body.append(portal);
  const properties=['position','left','right','top','bottom','width','max-width','height','max-height','margin','transform','transform-origin','opacity','visibility','pointer-events','z-index','will-change'];
  const snapshot=(node,names)=>names.map(name=>[name,node.style.getPropertyValue(name),node.style.getPropertyPriority(name)]);
  const original=snapshot(product,properties);
  const fallbackOriginal=fallback?snapshot(fallback,['display','visibility']):[];
  const caption=product.querySelector('figcaption');
  const captionOriginal=caption?snapshot(caption,['opacity','visibility']):[];
  const originalInert=product.inert;
  const originalBayState=bay.getAttribute('data-product-bridge');
  const originalProductState=product.getAttribute('data-product-bridge');
  const set=(node,name,value)=>{if(node.style.getPropertyValue(name)!==value)node.style.setProperty(name,value);};
  const inert=value=>{const next=Boolean(value);if(product.inert!==next)product.inert=next;};
  const restore=(node,values)=>{for(const [name,value,priority] of values){if(value)node.style.setProperty(name,value,priority);else node.style.removeProperty(name);}};
  const data=(node,name,value)=>{if(node.dataset[name]!==value)node.dataset[name]=value;};
  const clamp=value=>Math.max(0,Math.min(1,value));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t*t*(3-2*t);
  let dead=false,mode='home',metrics=null,invalidating=false;
  function invalidate(){
    if(dead||invalidating)return;
    invalidating=true;
    queueMicrotask(()=>{
      invalidating=false;
      if(!dead)document.dispatchEvent(new CustomEvent('portfolio:product-layout'));
    });
  }
  function move(parent,before=null){
    if(product.parentNode===parent)return;
    const focused=product.contains(document.activeElement)?document.activeElement:null;
    parent.insertBefore(product,before);
    if(focused&&!product.inert)focused.focus({preventScroll:true});
  }
  function enter(next){
    if(mode===next)return;
    mode=next;
    if(next==='home'){
      restore(product,original);
      inert(originalInert);
      move(marker.parentNode||home,marker.parentNode?marker.nextSibling:null);
      if(fallback)restore(fallback,fallbackOriginal);
      if(caption)restore(caption,captionOriginal);
    }else if(next==='native'||next==='docked'){
      inert(originalInert);
      move(bay);
      for(const [name,value] of Object.entries({position:'relative',left:'auto',right:'auto',top:'auto',bottom:'auto',width:'100%','max-width':'none',height:'auto','max-height':'none',margin:'0',transform:'none','transform-origin':'0 0',opacity:'1',visibility:'visible','pointer-events':'auto','z-index':'auto','will-change':'auto'}))set(product,name,value);
      if(fallback){set(fallback,'display','none');set(fallback,'visibility','hidden');}
      if(caption)restore(caption,captionOriginal);
    }else{
      inert(true);
      move(portal);
      for(const [name,value] of Object.entries({position:'absolute',left:'0px',right:'auto',top:'0px',bottom:'auto','max-width':'none',height:'auto','max-height':'none',margin:'0','transform-origin':'0 0',opacity:'1','z-index':'1'}))set(product,name,value);
      if(fallback){restore(fallback,fallbackOriginal);set(fallback,'visibility','hidden');}
      if(caption){set(caption,'opacity','0');set(caption,'visibility','hidden');}
      if(metrics)set(product,'width',`${metrics.baseWidth}px`);
    }
    invalidate();
  }
  function measure(){
    if(dead)return;
    const viewportWidth=innerWidth,viewportHeight=scrollViewportHeight(innerWidth,innerHeight,opening.querySelector('.concerto-stage')?.clientHeight,!document.documentElement.classList.contains('concerto-still')),y=scrollY;
    const openingRect=opening.getBoundingClientRect(),bayRect=bay.getBoundingClientRect();
    const baseWidth=bayRect.width;
    if(!(baseWidth>0&&viewportHeight>0&&openingRect.height>0)){metrics=null;return;}
    const startWidth=Math.min(viewportWidth*.90,Math.min(viewportHeight*.72,Math.max(160,viewportHeight-240))*32/27,1200);
    const baseHeight=baseWidth*27/32;
    const pinEnd=openingRect.top+y+Math.max(0,openingRect.height-viewportHeight);
    const targetTop=bayRect.top+y;
    const travel=Math.max(viewportHeight*.55,targetTop-viewportHeight*.18-pinEnd);
    metrics={viewportWidth,viewportHeight,baseWidth,baseHeight,startWidth,
      startLeft:(viewportWidth-startWidth)/2,startTop:viewportHeight*.5+80-baseHeight*(startWidth/baseWidth)/2,
      targetLeft:bayRect.left,targetTop,pinEnd,travel,landingTop:targetTop-pinEnd-travel};
    if(mode==='portal')set(product,'width',`${baseWidth}px`);
  }
  function render(y,still,openingProgress){
    if(dead)return false;
    if(still){
      enter('native');
      data(bay,'productBridge','native');data(product,'productBridge','native');
      return true;
    }
    if(!metrics||openingProgress<.84){
      enter('home');
      data(bay,'productBridge','waiting');data(product,'productBridge','waiting');
      return false;
    }
    const m=metrics,t=clamp((y-m.pinEnd)/m.travel),amount=ease(t);
    // Once the window arrives, put the real controls back in document order.
    // Reverse scrolling re-enters the portal at the same cached boundary pose.
    if(t>=1){
      enter('docked');
      data(bay,'productBridge','docked');data(product,'productBridge','docked');
      data(product,'productBridgeProgress','1.0000');
      return true;
    }
    enter('portal');
    // Clear the reading column early while the vertical landing keeps its
    // longer, calmer trajectory. Media reaches its native size before text.
    const lateral=ease(clamp(t*1.6));
    const width=mix(m.startWidth,m.baseWidth,lateral),scale=width/m.baseWidth;
    const left=mix(m.startLeft,m.targetLeft,lateral);
    // Aim at the cached landing pose, not the bay while it is still below the
    // viewport. Chasing that moving target would dip the game offscreen midway.
    const top=mix(m.startTop,m.landingTop,amount);
    const visible=top+m.baseHeight*scale>0&&top<m.viewportHeight&&left+width>0&&left<m.viewportWidth;
    const phase=t>0?'travel':'response';
    set(product,'transform',`translate3d(${left.toFixed(3)}px,${top.toFixed(3)}px,0) scale(${scale.toFixed(6)})`);
    set(product,'opacity',visible?'1':'0');set(product,'visibility',visible?'visible':'hidden');
    if(caption){
      set(caption,'opacity',ease(clamp((t-.90)/.08)).toFixed(4));
      set(caption,'visibility',visible&&t>.90?'visible':'hidden');
    }
    set(product,'will-change',t>0&&t<1?'transform':'auto');
    inert(true);
    set(product,'pointer-events','none');
    data(bay,'productBridge',phase);data(product,'productBridge',phase);
    data(product,'productBridgeProgress',t.toFixed(4));
    return true;
  }
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(invalidate);
  resize?.observe(bay);
  function dispose(){
    if(dead)return;
    dead=true;resize?.disconnect();
    restore(product,original);inert(originalInert);
    move(marker.parentNode||home,marker.parentNode?marker.nextSibling:null);
    if(fallback)restore(fallback,fallbackOriginal);
    if(caption)restore(caption,captionOriginal);
    if(originalBayState===null)bay.removeAttribute('data-product-bridge');else bay.setAttribute('data-product-bridge',originalBayState);
    if(originalProductState===null)product.removeAttribute('data-product-bridge');else product.setAttribute('data-product-bridge',originalProductState);
    delete product.dataset.productBridgeProgress;
    marker.remove();portal.remove();metrics=null;
  }
  return {measure,render,dispose};
}
