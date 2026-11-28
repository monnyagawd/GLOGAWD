import {services,imageFor,money,quote} from './catalog.js';
const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
const iconPaths={"up":"M4 12 12 4M5 4h7v7","down":"M8 2v11M3 8l5 5 5-5","left":"M13 8H3m5-5L3 8l5 5","right":"M3 8h10M8 3l5 5-5 5","star":"M8 1v14M1 8h14M3 3l10 10M13 3 3 13","check":"m3 8 3 3 7-7","prev":"m10 3-5 5 5 5","next":"m6 3 5 5-5 5","close":"M4 4l8 8m0-8-8 8"};
function uiIcon(name){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),p=document.createElementNS(ns,'path');svg.setAttribute('class','ui-icon ui-icon-'+name);svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');p.setAttribute('d',iconPaths[name]);svg.append(p);return svg;}
function iconElement(tag,cls,name){const node=el(tag,cls);node.append(uiIcon(name));return node;}
function refreshMedia(target){
 if(target.dataset.poster==='failed'&&target.dataset.motion==='failed'){target.closest('figure')?.classList.add('media-unavailable');const note=$('#asset-note');if(note)note.hidden=false;}
}
function addImage(target,src,label){const i=new Image();i.alt=label;i.loading='lazy';i.decoding='async';i.style.visibility='hidden';target.dataset.poster='loading';i.onload=()=>{target.dataset.poster='ready';target.classList.add('has-poster');i.style.visibility='visible';const placeholder=target.querySelector('span');if(placeholder)placeholder.hidden=true;};i.onerror=()=>{target.dataset.poster='failed';target.classList.add('poster-unavailable');i.remove();refreshMedia(target);};target.append(i);i.src=src;}
// The hero playlist was captured from the original site's Network tab.
// Gallery playlists are candidate paths following the same source's video ID convention.
const heroStream='https://d2kt395i2p6b75.cloudfront.net/01M3FAY5W6SYPV4PK9RCTR4P7T/media/videos/01M3FAYAQHQ672D2YNRECCN5GN/hls/playlist_360p.m3u8';
const streamFor=id=>'/original-media/'+id+'/playlist_360p.m3u8';
// Probe optional HD encodes, but preserve the known 360p fallback.
async function chooseQuality(url,hero){
 const heights=hero?[720]:[720,480]; // The hero’s 720p rendition was verified; 1080p and 480p returned 403.
 if(navigator.connection?.saveData)return url;
 const candidates=await Promise.all(heights.map(async height=>{
  const candidate=url.replace('playlist_360p.m3u8','playlist_'+height+'p.m3u8');
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),2500);
  try{const res=await fetch(candidate,{signal:ctrl.signal});if(!res.ok)return null;const body=await res.text();return body.trimStart().startsWith('#EXTM3U')?candidate:null;}catch{return null;}finally{clearTimeout(timeout);}
 }));
 return candidates.find(Boolean)||url;
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let hlsLoader;
function getHls(){
 if(window.Hls)return Promise.resolve(window.Hls);
 if(!hlsLoader)hlsLoader=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js';script.onload=()=>window.Hls?resolve(window.Hls):reject(Error('HLS unavailable'));script.onerror=reject;document.head.append(script);});
 return hlsLoader;
}
const videoStyles=document.createElement('style');
videoStyles.textContent='.original-motion{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s;pointer-events:none}.original-motion.is-ready{opacity:1}.motion-toggle{position:absolute;z-index:3;right:14px;bottom:14px;border:1px solid #ffffff88;border-radius:30px;background:#111c;color:#fff;padding:10px 16px;font:12px Arial;cursor:pointer}.hero-motion-toggle{bottom:auto;top:18px;right:4vw}.motion-toggle[hidden]{display:none}#hero-image{width:100%;opacity:1}.hero-media:after{background:linear-gradient(90deg,#111112c9,transparent 80%),linear-gradient(0deg,#111112d9,transparent 70%)}@media(max-width:700px){.hero-media:after{background:linear-gradient(0deg,#111112e6 8%,#11111255 65%,transparent)}.gallery figure:nth-child(3){display:block;margin-top:0}.hero-motion-toggle{top:12px}}';
document.head.append(videoStyles);
function mountMotion(target,url,label,hero=false){
 const v=document.createElement('video');v.className='original-motion';v.muted=true;v.defaultMuted=true;v.setAttribute('muted','');v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.preload='metadata';v.autoplay=!reduced.matches;v.setAttribute('aria-label',label);target.append(v);target.dataset.motion='loading';
 const native=!!v.canPlayType('application/vnd.apple.mpegurl');const toggle=el('button','motion-toggle'+(hero?' hero-motion-toggle':''),'Play video');toggle.type='button';toggle.setAttribute('aria-label','Play '+label);(hero?document.querySelector('.hero'):target).append(toggle);
 let initialized=false,visible=hero,manualPause=false,manualPlay=false,failed=false,hls,activeUrl=url,fallbackUsed=false,blocked=false;
 const report=message=>{target.dataset.playback=message;console.info('[Glo motion]',label,message);};report('waiting');
 const updateButton=playing=>{toggle.textContent=playing?'Pause video':'Play video';toggle.setAttribute('aria-label',(playing?'Pause ':'Play ')+label);toggle.hidden=false;};
 const play=(gesture=false)=>{if(failed||!initialized||manualPause||document.hidden||(!gesture&&!visible)||(!gesture&&blocked)||(!gesture&&reduced.matches&&!manualPlay))return;v.muted=true;const p=v.play();if(p?.catch)p.catch(e=>{blocked=e.name==='NotAllowedError';updateButton(false);report('play rejected: '+e.name);});};
 const fail=(reason='media unavailable')=>{if(failed)return;report(typeof reason==='string'?reason:'media error');failed=true;target.dataset.motion='failed';v.pause();hls?.destroy();v.remove();toggle.remove();refreshMedia(target);};
 const ready=()=>{v.classList.add('is-ready');target.dataset.motion='ready';target.classList.add('has-motion');const p=target.querySelector('span');if(p)p.hidden=true;};
 v.addEventListener('loadeddata',()=>{ready();play();});v.addEventListener('canplay',()=>play());
 v.addEventListener('playing',()=>{blocked=false;ready();updateButton(true);target.dataset.videoResolution=v.videoWidth+'x'+v.videoHeight;report('playing '+target.dataset.videoResolution);});
 v.addEventListener('pause',()=>updateButton(false));
 v.addEventListener('error',()=>recover('native media error'));
 const recover=reason=>{if(failed)return;if(activeUrl!==url&&!fallbackUsed){fallbackUsed=true;activeUrl=url;blocked=false;report('HD unavailable; retrying 360p');if(hls){hls.destroy();hls=null;}load(url);}else fail(reason);};
 const load=async source=>{try{activeUrl=source;target.dataset.requestedQuality=source.match(/playlist_(\d+)p/)?.[1]||'unknown';if(native){v.src=source;v.load();play();}else{const Hls=await getHls();if(failed)return;if(!Hls.isSupported())return fail();hls=new Hls({maxBufferLength:12,backBufferLength:8});hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)recover(data.type+': '+data.details);});hls.on(Hls.Events.MANIFEST_PARSED,()=>play());hls.loadSource(source);hls.attachMedia(v);}}catch{recover('HLS setup failed');}};
 const init=()=>{if(initialized||failed)return;initialized=true;if(native){load(navigator.connection?.saveData?url:url.replace('playlist_360p.m3u8','playlist_720p.m3u8'));}else chooseQuality(url,hero).then(load);};
 toggle.onclick=()=>{if(!v.paused){manualPause=true;v.pause();return;}manualPause=false;manualPlay=true;blocked=false;init();play(true);};
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){init();play();}else v.pause();},{threshold:.15});observer.observe(target);}else{visible=true;init();}
 if(hero)init();
 reduced.addEventListener('change',()=>{if(reduced.matches){manualPlay=false;v.pause();}else play();});document.addEventListener('visibilitychange',()=>{if(document.hidden)v.pause();else play();});
}
const hero=new Image();hero.onload=()=>{$('#hero-image').dataset.poster='ready';$('#hero-image').style.backgroundImage='url("'+hero.src+'")';};hero.onerror=()=>{$('#hero-image').dataset.poster='failed';refreshMedia($('#hero-image'));};hero.src=imageFor('01M3FAYAQHQ672D2YNRECCN5GN');
mountMotion($('#hero-image'),streamFor('01M3FAYAQHQ672D2YNRECCN5GN'),'Original Glo’s Lab hairstyle video',true);
['01M3FAYAQGETJX06P8PVQT7169','01M3FAYAQGM74HMJV0TQW1XT8N','01M3FAYAQHSN1PG2J9KM3PT506'].forEach((id,i)=>{const f=el('figure'),m=el('div','media');const placeholder=el('span','gallery-fallback','GLO / FILM '+String(i+1).padStart(2,'0'));m.append(placeholder);addImage(m,imageFor(id),'Glo’s Lab portfolio');const cap=el('figcaption');cap.append(el('span','','GLO ARCHIVE'),el('span','','FILM / 0'+(i+1)));f.append(m,cap);$('#gallery').append(f);mountMotion(m,streamFor(id),'Glo’s Lab portfolio clip '+(i+1));});
const serviceText={
 extensions:'Explore a loc extension appointment.',
 repairs:'Request details for individual loc repair.',
 twist:'Twist and style your existing locs.',
 temporary:'Explore a temporary loc style.',
 preorder:'Request details for an extension pre-order.',
 detox:'Explore a loc detox appointment.',
 color:'Request a color service consultation.',
 boho:'Explore a retwist with boho styling.',
 knots:'Request details for miracle knots.'
};
let category='All';
function showServices(){
 const list=$('#service-list');list.replaceChildren();const matches=services.filter(s=>category==='All'||s.category===category);$('#service-count').textContent=matches.length+' services';
 matches.forEach(s=>{
  const b=el('button','service-row'),thumb=el('span','thumb'),mark=el('span','thumb-mark','GLO / '+String(services.indexOf(s)+1).padStart(2,'0'));thumb.append(mark);addImage(thumb,imageFor(s.asset,s.kind),s.name);
  const info=el('span','service-info');info.append(el('small','service-kicker',s.category),el('strong','',s.name),el('span','service-detail',serviceText[s.id]||'Explore this service.'));
  const price=el('span','price');price.append(el('small','','Listed price'),el('b','',money(s.price)));b.append(thumb,info,price,iconElement('span','arrow','up'));b.setAttribute('aria-label','Explore '+s.name+', listed price '+money(s.price));b.onclick=()=>openBooking(s.id);list.append(b);
 });
}
['All','Maintain','Transform','Style'].forEach(c=>{const b=el('button','filter'+(c==='All'?' active':''),c);b.setAttribute('aria-pressed',String(c==='All'));b.onclick=()=>{category=c;document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});showServices();};$('#filters').append(b);});showServices();
const dialog=$('#booking');let state,opener;
function openBooking(id){opener=document.activeElement;state={step:id?1:0,id:id||null,day:null,time:null,accept:false,month:0};if(!dialog.open)dialog.showModal();document.body.classList.add('booking-open');render(true);}
document.querySelectorAll('[data-book]').forEach(b=>b.onclick=()=>openBooking());$('.close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{document.body.classList.remove('booking-open');opener?.focus({preventScroll:true});});
function row(label,value,cls=''){const r=el('div','summary-row '+cls);r.append(el('span','',label),el('strong','',value));return r;}
function setStep(step){state.step=step;render(true);}
function fmtDate(d){return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});}
function dateKey(d){return d.toISOString().slice(0,10);}
function selectedDate(){return state.day?fmtDate(new Date(state.day+'T12:00:00Z')):'';}
function dateCalendar(body,s){
 const today=new Date();const base=new Date(Date.UTC(today.getFullYear(),today.getMonth()+state.month,1,12));const year=base.getUTCFullYear(),month=base.getUTCMonth();
 const firstAvailable=new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()+1,12));
 const endAvailable=new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()+60,12));
 const toolbar=el('div','calendar-toolbar'),prev=iconElement('button','calendar-nav','prev'),next=iconElement('button','calendar-nav','next');
 prev.type=next.type='button';prev.disabled=state.month===0;next.disabled=state.month>=2;prev.setAttribute('aria-label','Previous month');next.setAttribute('aria-label','Next month');
 prev.onclick=()=>{state.month--;render();};next.onclick=()=>{state.month++;render();};toolbar.append(prev,el('strong','',base.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})),next);
 const grid=el('div','calendar-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Sample appointment dates');
 ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>grid.append(el('span','weekday',d)));
 for(let i=0;i<base.getUTCDay();i++)grid.append(el('span','calendar-empty'));
 const days=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 for(let n=1;n<=days;n++){const d=new Date(Date.UTC(year,month,n,12)),key=dateKey(d),b=el('button','calendar-day'+(state.day===key?' selected':''),String(n));b.disabled=d<firstAvailable||d>endAvailable;b.setAttribute('aria-label',fmtDate(d));b.setAttribute('aria-pressed',String(state.day===key));b.onclick=()=>{state.day=key;state.time=null;state.accept=false;render();const first=$('.slot');if(first){first.focus({preventScroll:true});$('.time-heading')?.scrollIntoView({block:'nearest',behavior:'instant'});}};grid.append(b);}
 body.append(toolbar,grid);
 if(state.day){body.append(el('h5','time-heading','Sample times · '+selectedDate()));const slots=el('div','slots');[9,10,11,13,14,15].filter(h=>h*60+s.minutes<=1080).forEach(h=>{const t=(h>12?h-12:h)+':00 '+(h>=12?'PM':'AM');const b=el('button','slot'+(state.time===t?' selected':''),t);b.setAttribute('aria-pressed',String(state.time===t));b.onclick=()=>{state.time=t;state.accept=false;render();$('.slot.selected')?.focus({preventScroll:true});};slots.append(b);});body.append(slots);}
}
function render(focus=false){
 const {step,id,day,time}=state,s=services.find(x=>x.id===id),body=$('#booking-content'),foot=$('#booking-footer'),steps=$('#steps');body.replaceChildren();foot.replaceChildren();steps.replaceChildren();
 const request=!!s&&s.deposit===null;
 const labels=request?['Service','Details','Review']:['Service','Schedule','Review','Deposit'];
 labels.forEach((x,i)=>{const item=el('div','step'+(step>=i?' active':''),(i+1)+'. '+x);if(step===i)item.setAttribute('aria-current','step');steps.append(item);});
 if(focus){body.scrollTop=0;body.focus({preventScroll:true});}
 const back=el('button','back',step===0?'Close':'Back');if(step!==0)back.prepend(uiIcon('left'));back.onclick=()=>{if(step===0)dialog.close();else setStep(step-1);};foot.append(back);
 let next,disabled=false,action;
 if(step===0){
  body.append(el('h4','','Choose your service'));
  services.forEach(x=>{const b=el('button','option'),label=el('span','',x.name);label.append(el('small','',x.deposit===null?'Request details preview':money(x.deposit)+' sample deposit'));b.append(label,el('strong','',money(x.price)));b.onclick=()=>{state={step:1,id:x.id,day:null,time:null,accept:false,month:0};render(true);};body.append(b);});return;
 }
 if(!s){setStep(0);return;}
 if(request){
  const title=s.id==='preorder'?'Pre-order inquiry': 'Service inquiry';
  if(step===1){body.append(el('h4','',title),row('Service',s.name),row('Listed price',money(s.price)),el('p','notice','The final service details, availability and deposit for this item need owner confirmation. Try a sample inquiry instead of reserving a time or paying an unconfirmed amount.'));next='Review sample inquiry';action=()=>setStep(2);}
  if(step===2){body.append(el('h4','','Review your inquiry'),row('Service',s.name),row('Listed price',money(s.price)),row('Payment due','Not collected'),el('p','notice','This is a simulated inquiry. No message, personal information, appointment or payment will be submitted.'));next='Complete inquiry demo';action=()=>complete(true);}
 }else if(step===1){
  body.append(el('h4','','Pick a day & time'),el('p','selected-service',s.name+' · '+money(s.price)),el('p','notice','Sample calendar only — studio hours and availability are not connected. Times are illustrative.'));dateCalendar(body,s);next='Review appointment';disabled=!day||!time;action=()=>setStep(2);
 }else if(step===2){
  const q=quote(id);body.append(el('h4','','Review your appointment'),row('Service',s.name),row('Sample appointment',selectedDate()+' · '+time),row('Sample duration',s.minutes+' minutes'),row('Listed service price',money(q.total)),row('Sample deposit',money(q.deposit),'total'),row('Remaining balance',money(q.balance)),el('p','notice','This preview does not collect personal information or reserve an appointment.'));
  const label=el('label','check'),check=document.createElement('input');check.type='checkbox';check.checked=state.accept;check.onchange=()=>{state.accept=check.checked;$('#continue').disabled=!state.accept;};label.append(check,el('span','','I understand this is only a demonstration.'));body.append(label);next='Continue to deposit';disabled=!state.accept;action=()=>setStep(3);
 }else if(step===3){
  const q=quote(id),card=el('div','sample-card');card.append(el('span','sample-card-label','SIMULATED PAYMENT'),el('strong','','••••  ••••  ••••  4242'),el('span','','Example card only · no card details required'));
  body.append(el('h4','','Deposit checkout'),row('Due today (example)',money(q.deposit),'total'),row('Remaining at appointment',money(q.balance)),card,el('p','notice','Payment collection is disabled. No real money can be charged.'));next='Simulate deposit confirmation';action=()=>complete(false);
 }
 const b=el('button','next',next||'Continue');b.id='continue';b.disabled=disabled;b.onclick=action;foot.append(b);
 function complete(isRequest){
  const receipt=el('div','demo-receipt');receipt.append(iconElement('div','receipt-mark','check'),el('span','receipt-kicker',isRequest?'INQUIRY PREVIEW COMPLETE':'BOOKING PREVIEW COMPLETE'),el('h4','','You’re one step closer to your next Glo.'),row('Service',s.name));
  if(!isRequest){const q=quote(state.id);receipt.append(row('Sample appointment',selectedDate()+' · '+state.time),row('Simulated deposit',money(q.deposit)),row('Remaining balance',money(q.balance)));}
  receipt.append(el('p','notice','Demo complete. No real appointment, inquiry or payment was submitted.'));body.replaceChildren(receipt);foot.replaceChildren();const again=el('button','back','Explore another service'),done=el('button','next','Done');again.onclick=()=>{state={step:0,id:null,day:null,time:null,accept:false,month:0};render(true);};done.onclick=()=>dialog.close();foot.append(again,done);body.scrollTop=0;body.focus({preventScroll:true});
 }
}

// Progressive, viewport-triggered editorial reveals. Content stays visible without motion support.
if(!reduced.matches&&'IntersectionObserver' in window){const reveal=new IntersectionObserver(entries=>{for(const x of entries){if(x.isIntersecting){x.target.classList.add('in-view');reveal.unobserve(x.target);}}},{threshold:.12});document.querySelectorAll('.section h2,.story-grid article,.section-intro,.gallery figure').forEach(x=>{x.classList.add('reveal');reveal.observe(x);});}
