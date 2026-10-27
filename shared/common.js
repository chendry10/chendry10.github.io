import {cases} from './data.js';
import './lyre-demo.js';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
// These widgets are actual browser-local tools, independent of scroll position.
let opener=null;const dialog=make('dialog','case-dialog');dialog.setAttribute('aria-labelledby','case-title');
const header=make('div','cd-header'),close=make('button','','Close ×');close.type='button';close.setAttribute('aria-label','Close case study');header.append(make('span','','Behind the build'),close);
const content=make('div','cd-body'),footer=make('div','cd-footer'),mail=make('a','','Talk engineering with me ↗'),back=make('button','','Back to work');mail.href='mailto:cameron.hendry@hotmail.com';back.type='button';footer.append(mail,back);dialog.append(header,content,footer);document.body.append(dialog);
function openCase(key,trigger){const c=cases[key];if(!c)return;opener=trigger;content.replaceChildren();const title=make('h2','',c.title);title.id='case-title';content.append(title,make('p','cd-lead',c.lead));const meta=make('div','cd-meta');for(const [label,value]of [['Role',c.role],['When',c.date]]){const item=make('div');item.append(make('span','',label),make('p','',value));meta.append(item);}content.append(meta);c.sections.forEach((section,i)=>{const el=make('section','cd-section');el.append(make('h3','',section.title));if(section.text)el.append(make('p','',section.text));if(section.bullets){const ul=make('ul');for(const b of section.bullets)ul.append(make('li','',b));el.append(ul);}content.append(el);if(i===0){const flow=make('div','cd-flow');c.flow.forEach(t=>flow.append(make('span','',t)));content.append(flow);}if(i===1)content.append(make('p','cd-callout',c.callout));});const tools=make('section','cd-section');tools.append(make('h3','','Tools'),make('p','',c.stack));content.append(tools,make('p','cd-note',c.note));dialog.showModal();document.body.classList.add('dialog-open');dialog.scrollTop=0;close.focus();}
document.addEventListener('click',event=>{const button=event.target.closest('[data-case]');if(button)openCase(button.dataset.case,button);});
close.addEventListener('click',()=>dialog.close());back.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');opener?.focus({preventScroll:true});});dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
$$('[data-copy-email]').forEach(button=>button.addEventListener('click',async()=>{const status=$('[data-copy-status]');try{await navigator.clipboard.writeText('cameron.hendry@hotmail.com');if(status)status.textContent='Email address copied.';}catch{if(status)status.textContent='cameron.hendry@hotmail.com';}}));

const motionQuery=matchMedia('(prefers-reduced-motion:reduce)');let motionOff=motionQuery.matches;
let scrollEngine=null,fontsReady=false;
// The vendor snapshots the OS preference. A manual off switch must also stop
// its decoder/seek loop and release clip blobs, rather than only hide motion.
function syncScrollEngine(){
  if(motionOff){
    scrollEngine?.destroy();scrollEngine=null;
    $$('video[data-sc-scrub]').forEach(video=>video.pause());
    $$('.sc-has-clip').forEach(el=>el.classList.remove('sc-has-clip'));
    document.documentElement.dataset.scrollEngine='off';
    return;
  }
  if(fontsReady&&window.ScrollCraft&&!scrollEngine){
    scrollEngine=window.ScrollCraft.mount(document.body);
    document.documentElement.dataset.scrollEngine='scrollcraft';
    document.dispatchEvent(new Event('portfolio:ready'));
  }
}
function setMotion(value){value=motionQuery.matches||value;motionOff=value;document.documentElement.classList.toggle('motion-off',value);$$('[data-motion-toggle]').forEach(b=>{b.textContent=value?'Motion off':'Motion on';b.setAttribute('aria-pressed',String(!value));b.disabled=motionQuery.matches;if(motionQuery.matches)b.setAttribute('aria-label','Motion off. Your system prefers reduced motion.');else b.removeAttribute('aria-label');});syncScrollEngine();document.dispatchEvent(new CustomEvent('portfolio:motion',{detail:{off:value}}));window.dispatchEvent(new Event('resize'));}
document.addEventListener('play',event=>{if(motionOff&&event.target.matches?.('video[data-sc-scrub]'))event.target.pause();},true);
$$('[data-motion-toggle]').forEach(button=>button.addEventListener('click',()=>setMotion(!motionOff)));motionQuery.addEventListener('change',e=>setMotion(e.matches));setMotion(motionOff);
const revealFonts=()=>{document.documentElement.classList.remove('fonts-pending');document.documentElement.classList.add('fonts-ready');};
setTimeout(revealFonts,2200);
await document.fonts.load('500 16px "DM Sans"').catch(()=>{});await document.fonts.ready;revealFonts();
fontsReady=true;syncScrollEngine();
