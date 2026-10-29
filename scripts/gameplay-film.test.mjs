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
