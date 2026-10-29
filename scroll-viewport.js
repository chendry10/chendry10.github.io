// Match the pinned CSS small viewport, not the browser toolbar's moving edge.
export function scrollViewportHeight(width,liveHeight,stageHeight,animated=true){
  return animated&&width<=900&&stageHeight>0?stageHeight:liveHeight;
}
export function scrollLayoutChanged(previous,next){
  return previous.width!==next.width||Math.abs(previous.height-next.height)>1;
}
