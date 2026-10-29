import assert from 'node:assert/strict';
import {createGameplayFilm} from '../gameplay-film.js';
const document=new EventTarget();document.hidden=false;let quiet=false;
document.documentElement={classList:{contains:()=>quiet}};
globalThis.document=document;globalThis.innerWidth=1280;
const media=new EventTarget();media.matches=false;globalThis.matchMedia=()=>media;
let visibility;globalThis.IntersectionObserver=class{constructor(fn){visibility=fn;}observe(){}disconnect(){}};
class Video extends EventTarget{
 dataset={source:'full.mp4',sourceSmall:'compact.mp4'};duration=7.6;readyState=0;seeking=false;plays=0;pauses=0;loads=0;time=0;
 load(){this.loads++;}pause(){this.pauses++;}play(){this.plays++;return Promise.resolve();}
 set currentTime(t){this.time=t;this.seeking=true;}get currentTime(){return this.time;}
 removeAttribute(name){delete this[name];}
}
class Button extends EventTarget{setAttribute(){} }
const video=new Video(),button=new Button(),film=createGameplayFilm(video,button,{startTime:4.8});
visibility([{isIntersecting:true}]);film.prepare();assert.equal(video.src,'full.mp4');assert.equal(video.loads,1);
film.setActive(true);assert.equal(video.plays,0,'No playback before the matched frame is ready');
video.dispatchEvent(new Event('loadedmetadata'));assert.equal(video.currentTime,4.8);
video.readyState=2;video.dispatchEvent(new Event('loadeddata'));assert.equal(video.plays,0,'Seek must complete before revealing the video');
video.seeking=false;video.dispatchEvent(new Event('seeked'));assert.equal(video.plays,1);assert.equal(video.dataset.filmReady,'true');
video.time=6.2;video.readyState=1;film.setActive(false);assert.ok(video.pauses>0);assert.equal(video.currentTime,4.8);assert.equal(video.dataset.filmReady,undefined);video.readyState=2;video.seeking=false;video.dispatchEvent(new Event('seeked'));const plays=video.plays;
quiet=true;film.setActive(true);assert.equal(video.plays,plays,'Motion off prevents autoplay');
quiet=false;document.dispatchEvent(new Event('portfolio:motion'));assert.equal(video.plays,plays+1);
button.dispatchEvent(new Event('click'));assert.equal(button.textContent,'Play recording');
film.dispose();assert.equal(video.src,undefined);assert.equal(video.dataset.filmReady,undefined);
video.dispatchEvent(new Event('seeked'));assert.equal(video.dataset.filmReady,undefined,'Late media events do not revive a disposed player');
console.log('Gameplay handoff: matched initial frame, playback gating, motion preference, pause, and disposal passed.');

const steadyVideo=new Video(),steadyButton=new Button(),steady=createGameplayFilm(steadyVideo,steadyButton,{startTime:3,resetOnDeactivate:false});
visibility([{isIntersecting:true}]);steady.setActive(true);steadyVideo.dispatchEvent(new Event('loadedmetadata'));
steadyVideo.readyState=2;steadyVideo.seeking=false;steadyVideo.dispatchEvent(new Event('seeked'));
assert.equal(steadyVideo.playbackRate,1,'Monitor playback is native real-time');
steadyVideo.time=5.25;
for(let i=0;i<20;i++){steady.setActive(false);steady.setActive(true);}
assert.equal(steadyVideo.currentTime,5.25,'Crossing scroll boundaries never seeks the steady recording');
assert.equal(steadyVideo.loads,1,'Monitor and reading chapter share one video source');
const samePlays=steadyVideo.plays;
for(let i=0;i<100;i++)steady.setActive(true);
assert.equal(steadyVideo.plays,samePlays,'Scrolling does not repeatedly restart playback');
assert.equal(steadyVideo.playbackRate,1);
steadyVideo.pause();const beforeMove=steadyVideo.plays;steady.refresh();assert.equal(steadyVideo.plays,beforeMove+1,'A reparented visible recording resumes');assert.equal(steadyVideo.currentTime,5.25,'Reparent recovery does not seek');
steadyButton.dispatchEvent(new Event('click'));const userPausedPlays=steadyVideo.plays;steady.refresh();assert.equal(steadyVideo.plays,userPausedPlays,'Reparent recovery preserves explicit user pause');steady.dispose();
console.log('Steady monitor playback: one source, 1x rate, and no scroll-driven seeks passed.');
