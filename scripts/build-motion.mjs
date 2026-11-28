import {mkdir,writeFile,rm,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {services,imageFor} from '../public/catalog.js';
const ids=['01M3FAYAQHQ672D2YNRECCN5GN','01M3FAYAQGETJX06P8PVQT7169','01M3FAYAQGM74HMJV0TQW1XT8N','01M3FAYAQHSN1PG2J9KM3PT506'];
const base='https://d2kt395i2p6b75.cloudfront.net/01M3FAY5W6SYPV4PK9RCTR4P7T/media/videos/';
const ffmpeg=process.env.FFMPEG_PATH||join(process.cwd(),'node_modules/@ffmpeg-installer/linux-x64/ffmpeg');
await mkdir('public/motion',{recursive:true});await mkdir('.motion-tmp',{recursive:true});
function run(args){const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',timeout:90000});if(r.status!==0)throw Error(r.stderr||String(r.error||'ffmpeg failed'));}
for(const id of ids){const temp=join('.motion-tmp',id+'.mp4');try{
let response;for(let attempt=0;attempt<3;attempt++){try{response=await fetch(base+id+'/hls/playlist_720p.m4s',{signal:AbortSignal.timeout(30000)});if(response.ok)break;}catch{}}
if(!response?.ok)throw Error('Source unavailable '+id);
const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<10000)throw Error('Source too small');await writeFile(temp,bytes);
const mp4=join('public/motion',id+'.mp4'),webp=join('public/motion',id+'.webp');
if(id==='01M3FAYAQGETJX06P8PVQT7169')run(['-i',temp,'-map','0:v:0','-an','-c:v','copy','-movflags','+faststart',mp4]);else run(['-i',temp,'-map','0:v:0','-an','-t','9','-c:v','libx264','-pix_fmt','yuv420p','-preset','fast','-crf','19','-maxrate','2200k','-bufsize','4400k','-movflags','+faststart',mp4]);
if(id==='01M3FAYAQGETJX06P8PVQT7169')run(['-i',temp,'-an','-t','3','-vf','fps=15','-c:v','libwebp_anim','-loop','0','-quality','82',webp]);else run(['-i',temp,'-an','-t','4','-vf','fps=15,scale=540:-2:flags=lanczos','-c:v','libwebp_anim','-loop','0','-quality','76',webp]);
run(['-ss','0.5','-i',temp,'-frames:v','1','-q:v','2',join('public/motion',id+'.jpg')]);
console.log('MOTION READY',id,(await stat(mp4)).size,(await stat(webp)).size);
}catch(e){console.warn('MOTION ERROR',id,e.message);throw e;}finally{await rm(temp,{force:true});}}

await mkdir('public/service-media',{recursive:true});
for(const service of services){try{const response=await fetch(imageFor(service.asset,service.kind),{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);const data=Buffer.from(await response.arrayBuffer());if(data.length<100)throw Error('Empty image');await writeFile('public/service-media/'+service.asset+(service.kind==='video'?'.jpg':'.webp'),data);}catch(e){console.warn('Service image unavailable',service.id,e.message);}}
