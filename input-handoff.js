// Camera-projected corners of the actual game display at the final Blender pose.
// Reproduce with scripts/audit-keystroke-story.py; order TL, TR, BR, BL.
export const SCREEN_QUAD=[[.23708957433700562,.20488518476486206],[.8190798759460449,.21491920948028564],[.8005638122558594,.5568128824234009],[.251465380191803,.5275896489620209]];
export function screenHandoffMatrix({keyBox,productWidth,viewportWidth,viewportHeight},progress){
  const t=Math.max(0,Math.min(1,progress)),w=productWidth,h=w*1326/2560,total=w*27/32;
  if(!(w>0&&keyBox.w>0&&keyBox.h>0))throw new RangeError('A measured scene is required');
  const end=[[-w/2,-total/2],[w/2,-total/2],[w/2,-total/2+h],[-w/2,-total/2+h]];
  const q=SCREEN_QUAD.map(([x,y],i)=>{
    const start=[keyBox.x+x*keyBox.w-viewportWidth/2,keyBox.y+y*keyBox.h-(viewportHeight/2+80)];
    return start.map((v,j)=>v+(end[i][j]-v)*t);
  });
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q;
  const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
  const det=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/det,k=(dx1*dy3-dx3*dy1)/det;
  return [(x1-x0+g*x1)/w,(y1-y0+g*y1)/w,0,g/w,(x3-x0+k*x3)/h,(y3-y0+k*y3)/h,0,k/h,0,0,1,0,x0,y0,0,1];
}
