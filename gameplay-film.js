/** A genuine local gameplay recording. No decoder/seek loop or game logic. */
export function createGameplayFilm(video, button,{startTime=0}={}){
  let dead=false,active=false,inView=false,loaded=false,userPaused=false,playTicket=0,ready=false,positioned=startTime<=0;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const quiet=()=>document.documentElement.classList.contains('motion-off')||reduced.matches;
  const label=()=>{button.textContent=userPaused?'Play recording':'Pause recording';button.setAttribute('aria-pressed',String(!userPaused));};
  function prepare(){
    if(dead||loaded||quiet())return;
    loaded=true;
    video.src=innerWidth<=1100?video.dataset.sourceSmall:video.dataset.source;
    video.load();
  }
  function pause(){playTicket++;video.pause();video.dataset.filmState=loaded?'paused':'poster';}
  function sync(){
    if(dead)return;
    if(!active||!inView||userPaused||document.hidden||quiet()){pause();return;}
    prepare();
    if(!ready)return;
    const ticket=++playTicket;
    Promise.resolve(video.play()).then(()=>{
      if(dead||!active||!inView||userPaused||document.hidden||quiet())video.pause();
    }).catch(()=>{if(!dead&&ticket===playTicket){userPaused=true;video.dataset.filmState='poster';label();}});
  }
  const onMetadata=()=>{
    if(dead||positioned)return;
    positioned=true;
    video.currentTime=Math.min(startTime,Math.max(0,video.duration-.05));
  };
  const onReady=()=>{if(!dead&&positioned&&!video.seeking&&video.readyState>=2){ready=true;video.dataset.filmReady='true';sync();}};
  const onPlay=()=>{if(!dead)video.dataset.filmState='playing';};
  const onError=()=>{if(!dead){video.dataset.filmState='poster';button.hidden=true;}};
  const onVisibility=()=>sync();
  const toggle=()=>{userPaused=!userPaused;label();sync();};
  const io=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;sync();},{threshold:.1});io.observe(video);
  video.addEventListener('loadedmetadata',onMetadata);video.addEventListener('seeked',onReady);video.addEventListener('loadeddata',onReady);video.addEventListener('playing',onPlay);video.addEventListener('error',onError);
  button.addEventListener('click',toggle);document.addEventListener('visibilitychange',onVisibility);
  reduced.addEventListener('change',sync);document.addEventListener('portfolio:motion',sync);
  video.dataset.filmState='poster';label();
  return {
    prepare,
    setActive(value){
      const next=Boolean(value);if(next===active)return;active=next;
      // Reversing into the rendered monitor returns to its exact source frame.
      // Seek only at this boundary; the matching poster covers decoder latency.
      if(!next&&loaded&&positioned&&startTime>0&&video.readyState>=1){
        ready=false;delete video.dataset.filmReady;
        video.currentTime=Math.min(startTime,Math.max(0,video.duration-.05));
      }
      sync();
    },
    dispose(){if(dead)return;dead=true;pause();io.disconnect();video.removeEventListener('loadedmetadata',onMetadata);video.removeEventListener('seeked',onReady);video.removeEventListener('loadeddata',onReady);video.removeEventListener('playing',onPlay);video.removeEventListener('error',onError);button.removeEventListener('click',toggle);document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',sync);document.removeEventListener('portfolio:motion',sync);video.removeAttribute('src');video.load();delete video.dataset.filmReady;}
  };
}
