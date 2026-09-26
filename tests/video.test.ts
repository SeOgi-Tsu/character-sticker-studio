import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { createServer } from 'node:http';
import sharp from 'sharp';
import { createApp } from '../server/app.ts';
import { Images } from '../server/images.ts';
import { archetypes, videoStyles, backgrounds, defaultVideoWorkspace, motionTemplates, legacyMotionTemplates, installTheatrePack, beatTimeline, buildVideoPrompt, currentVideoPrompt, frameSignature, promptSignature, frameReady, firstFramePrompt, firstFrameConflicts, portableTemplates, promptIssues, type MotionTemplate, type VideoWorkspace } from '../src/shared/video.ts';
import type { Asset, Project } from '../src/shared/types.ts';
import { originalTheatreTemplates } from '../src/shared/theatre.ts';
import { everydayTheatreTemplates } from '../src/shared/everyday-theatre.ts';
import { comedyTheatreTemplates } from '../src/shared/comedy-theatre.ts';
import { personalityTheatreTemplates } from '../src/shared/personality-theatre.ts';
import { chatReactionTheatreTemplates } from '../src/shared/chat-reactions-theatre.ts';

const project:Project={id:'p',name:'test',character:{name:'A',identity:'Ruby eyes and black bows.',outfit:'',description:'',personality:''},styleId:'soft',selectedIds:[],customReactions:[],overrides:{},captions:{},createdAt:'',updatedAt:''};
test('all built-in modes and anatomy/style combinations use resolved, English H3 format with bounded timing',()=>{
  for(const a of archetypes)for(const s of videoStyles)for(const b of backgrounds){const w=defaultVideoWorkspace(project);w.archetype=a.id;w.style=s.id;w.background=b.id;for(const c of w.cards)for(const mode of ['I2VA','Ref2VA'] as const){c.mode=mode;for(const duration of [4,6,8] as const){c.duration=duration;const prompt=buildVideoPrompt(project.character,w,c);assert.deepEqual(promptIssues(prompt,mode),[]);assert.ok(!prompt.includes('{{'));assert.ok(prompt.includes(`to ${duration.toFixed(2)} seconds`));assert.ok(!prompt.includes('Margaret'));assert.ok(!/\[Shot 2\]/.test(prompt));}}}
  const w=defaultVideoWorkspace(project);w.archetype='animal';assert.match(firstFramePrompt(project.character,w,w.cards[0]),/front paw/);w.archetype='robot';assert.match(firstFramePrompt(project.character,w,w.cards[0]),/gripper/);
});
test('character or scene changes invalidate bindings; timing changes retain image and invalidate edited prompts',()=>{
  const w=defaultVideoWorkspace(project),c=w.cards[0];c.frame={assetId:'image',signature:frameSignature(project.character,w,c)};c.edited={text:'custom',signature:promptSignature(project.character,w,c),source:'manual'};
  assert.ok(frameReady(project.character,w,c));assert.equal(currentVideoPrompt(project.character,w,c),'custom');c.duration=8;assert.ok(frameReady(project.character,w,c));assert.notEqual(currentVideoPrompt(project.character,w,c),'custom');
  assert.equal(frameReady({...project.character,name:'Other'},w,c),false);w.style='flat';assert.equal(frameReady(project.character,w,c),false);w.style='soft';c.template.scene+=' A new table.';assert.equal(frameReady(project.character,w,c),false);
});
test('portable templates exclude image, project and prompt metadata; invalid output is flagged',()=>{
  const payload=portableTemplates([{...motionTemplates[0],assetId:'private',edited:'secret',character:project.character} as any]);assert.ok(!JSON.stringify(payload).includes('private'));assert.ok(!JSON.stringify(payload).includes('secret'));
  const w=defaultVideoWorkspace(project),p=buildVideoPrompt(project.character,w,w.cards[0]);assert.equal(promptIssues(p,'I2VA').length,0);assert.ok(promptIssues(p.replace('overall_soundscape:','wrong:'),'I2VA').length);assert.ok(promptIssues(p+'\n<Picture 2>','I2VA').length);assert.ok(promptIssues(p+'\n中文说明','I2VA').length);
});
async function fixture(options:Record<string,unknown>={}) {
 const dir=await mkdtemp(join(tmpdir(),'video-studio-test-')),runtime=createApp({dataDir:dir,autoStart:false,...options}),server=runtime.app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:response.headers.get('content-type')?.includes('json')?await response.json():Buffer.from(await response.arrayBuffer())};};
 return {...runtime,images:new Images(runtime.store),base,call,async dispose(){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await runtime.close();await rm(dir,{recursive:true,force:true});}};
}
async function prepare(f:Awaited<ReturnType<typeof fixture>>) {const p=(await f.call('/api/bootstrap')).data.projects[0] as Project;const w=(await f.call(`/api/projects/${p.id}/video`)).data.workspace as VideoWorkspace;const buffer=await sharp({create:{width:40,height:40,channels:3,background:'pink'}}).png().toBuffer();const image=(await f.call('/api/assets','POST',{filename:'scene.png',dataUrl:`data:image/png;base64,${buffer.toString('base64')}`})).data;return {p,w,image};}
function unzip(buffer:Buffer) {const entries=new Map<string,Buffer>(),end=buffer.lastIndexOf(Buffer.from([80,75,5,6]));let cursor=buffer.readUInt32LE(end+16);const count=buffer.readUInt16LE(end+10);for(let i=0;i<count;i++){const method=buffer.readUInt16LE(cursor+10),length=buffer.readUInt32LE(cursor+20),nameLength=buffer.readUInt16LE(cursor+28),extraLength=buffer.readUInt16LE(cursor+30),commentLength=buffer.readUInt16LE(cursor+32),local=buffer.readUInt32LE(cursor+42);const name=buffer.subarray(cursor+46,cursor+46+nameLength).toString(),start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28),data=buffer.subarray(start,start+length);entries.set(name,method===8?inflateRawSync(data):data);cursor+=46+nameLength+extraLength+commentLength;}return entries;}
test('video workspaces persist separately, reject stale writes and validate bindings',async()=>{const f=await fixture();try{const {p,w,image}=await prepare(f);w.masterAssetId=image.id;w.cards[0].frame={assetId:image.id,signature:frameSignature(p.character,w,w.cards[0])};const result=await f.call(`/api/projects/${p.id}/video`,'PUT',w);assert.equal(result.status,200);assert.equal(result.data.revision,1);assert.equal((await f.call(`/api/projects/${p.id}/video`,'PUT',w)).status,409);
 const boot=(await f.call('/api/bootstrap')).data;assert.equal(boot.projects[0].character.anchorAssetId,undefined);const other=(await f.call('/api/projects','POST',{name:'other'})).data;const otherW=(await f.call(`/api/projects/${other.id}/video`)).data.workspace;assert.equal(otherW.masterAssetId,undefined);assert.equal(otherW.cards[0].frame,undefined);
 const bad={...result.data,masterAssetId:'missing'};assert.equal((await f.call(`/api/projects/${p.id}/video`,'PUT',bad)).status,400);assert.equal((await f.call('/api/projects/nope/video')).status,404);assert.equal((await f.call(`/api/projects/${p.id}/video`,'PUT',{...result.data,cards:[{...w.cards[0],duration:99}]})).status,400);
 }finally{await f.dispose();}});
test('template import strips private fields and commits only fully validated batches',async()=>{const f=await fixture();try{const created=await f.call('/api/video/templates','POST',{...motionTemplates[0],frame:{assetId:'private'},edited:{text:'secret'}});assert.equal(created.status,201);assert.notEqual(created.data.id,motionTemplates[0].id);assert.equal(created.data.frame,undefined);const file=(await f.call('/api/video/templates/export')).data;assert.equal(file.templates.length,1);assert.equal((await f.call('/api/video/templates/import','POST',{...file,templates:[file.templates[0],{...file.templates[0],beats:[]}]})).status,400);assert.equal((await f.call('/api/video/templates/export')).data.templates.length,1);const imported=await f.call('/api/video/templates/import','POST',file);assert.equal(imported.status,201);assert.notEqual(imported.data[0].id,created.data.id);}finally{await f.dispose();}});
test('ZIP binds Picture 1 to the selected mode and blocks stale first frames',async()=>{const f=await fixture();try{const {p,w,image}=await prepare(f);w.cards=w.cards.slice(0,2);w.masterAssetId=image.id;w.cards[0].frame={assetId:image.id,signature:frameSignature(p.character,w,w.cards[0])};w.cards[1].mode='Ref2VA';await f.call(`/api/projects/${p.id}/video`,'PUT',w);const result=await f.call(`/api/projects/${p.id}/video/export`);assert.equal(result.status,200);const entries=unzip(result.data),manifest=JSON.parse(entries.get('manifest.json')!.toString());assert.equal(manifest.recipes.length,2);for(const r of manifest.recipes){assert.ok(entries.get(r.image)!.length>0);assert.deepEqual(promptIssues(entries.get(r.prompt)!.toString(),r.mode),[]);}const portable=entries.get('reusable-templates.json')!.toString();assert.ok(!portable.includes(image.id));
 const changed={...w,revision:1,background:'illustration'};await f.call(`/api/projects/${p.id}/video`,'PUT',changed);assert.equal((await f.call(`/api/projects/${p.id}/video/export`)).status,400);
 }finally{await f.dispose();}});
test('text configuration is secret-safe; rewrite calls the configured model and validates result',async()=>{const f=await fixture();let received:any,answer='';const provider=createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{received={url:req.url,auth:req.headers.authorization,...JSON.parse(body)};res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{message:{content:answer}}]}));});}).listen(0,'127.0.0.1');await new Promise<void>(r=>provider.once('listening',r));try{const {p,w}=await prepare(f),baseUrl=`http://127.0.0.1:${(provider.address() as {port:number}).port}/v1`;const settings=await f.call('/api/video/text-settings','PUT',{baseUrl,model:'fixture-text',apiKey:'fixture-secret'});assert.equal(settings.status,200);assert.ok(!JSON.stringify(settings.data).includes('fixture-secret'));assert.equal(settings.data.hasApiKey,true);
 answer=buildVideoPrompt(p.character,w,w.cards[0]);const rewritten=await f.call(`/api/projects/${p.id}/video/rewrite`,'POST',{workspace:w,cardId:w.activeId});assert.equal(rewritten.status,200);assert.equal(rewritten.data.prompt,answer);assert.equal(received.url,'/v1/chat/completions');assert.equal(received.auth,'Bearer fixture-secret');assert.equal(received.model,'fixture-text');assert.ok(!JSON.stringify(received.messages).includes('data:image'));answer='bad output';assert.equal((await f.call(`/api/projects/${p.id}/video/rewrite`,'POST',{workspace:w,cardId:w.activeId})).status,422);
 const changed=await f.call('/api/video/text-settings','PUT',{baseUrl:'https://example.com/v1',model:'other'});assert.equal(changed.data.hasApiKey,false);
 }finally{provider.closeAllConnections();await new Promise<void>(r=>provider.close(()=>r()));await f.dispose();}});
test('video routes inherit studio authentication',async()=>{const f=await fixture({token:'fixture-token'});try{assert.equal((await f.call('/api/video/text-settings')).status,401);assert.equal((await f.call('/api/video/templates','POST',motionTemplates[0])).status,401);assert.equal((await f.call('/api/projects/any/video')).status,401);}finally{await f.dispose();}});
test('empty image bindings, unresolved two-digit references and export preflight are handled explicitly',async()=>{
 const f=await fixture();try{
  const {p,w,image}=await prepare(f);w.cards=w.cards.slice(0,1);
  const prompt=buildVideoPrompt(p.character,w,w.cards[0]);assert.ok(promptIssues(prompt+'\n<Picture 10>','I2VA').length);
  assert.ok(promptIssues(prompt.replace('non_diegetic_music: N/A','non_diegetic_music:'),'I2VA').length);
  const malformed={...w,cards:[{...w.cards[0],frame:{signature:'test'}}]};assert.equal((await f.call(`/api/projects/${p.id}/video`,'PUT',malformed)).status,400);
  w.cards[0].frame={assetId:image.id,signature:frameSignature(p.character,w,w.cards[0])};await f.call(`/api/projects/${p.id}/video`,'PUT',w);
  assert.deepEqual((await f.call(`/api/projects/${p.id}/video/export?check=1`)).data,{ok:true,count:1});
 }finally{await f.dispose();}
});
test('theatre migration preserves original images and edits, archives old cards and is idempotent',()=>{
 const w=defaultVideoWorkspace(project);w.cards=legacyMotionTemplates.map(t=>({id:t.id,template:structuredClone(t),duration:6,mode:'I2VA',included:true}));w.activeId=w.cards[0].id;
 w.cards[0].frame={assetId:'existing-private-frame',signature:frameSignature(project.character,w,w.cards[0])};w.cards[0].edited={text:'saved handwritten prompt',signature:promptSignature(project.character,w,w.cards[0]),source:'manual'};const before=structuredClone(w);
 const next=installTheatrePack(w);assert.deepEqual(w,before);assert.equal(next.cards.filter(c=>!c.archived).length,motionTemplates.length);assert.equal(next.cards.filter(c=>c.archived).length,legacyMotionTemplates.length);
 for(const old of before.cards){const archived=next.cards.find(c=>c.id===old.id)!;assert.deepEqual(archived,{...old,archived:true,included:false});}
 assert.equal(installTheatrePack(next),next);
 const retained=next.cards.find(c=>c.id===before.cards[0].id)!;assert.equal(currentVideoPrompt(project.character,next,retained),'saved handwritten prompt');
});
test('installing the complete pack preserves original theatre images and custom edits while adding every missing recipe',()=>{
 const w=defaultVideoWorkspace(project),originalIds=new Set(originalTheatreTemplates.map(t=>t.id));
 assert.deepEqual(motionTemplates.slice(0,originalTheatreTemplates.length).map(t=>t.id),[...originalIds]);
 w.cards=w.cards.filter(c=>originalIds.has(c.template.id));w.revision=7;w.masterAssetId='approved-character';
 const customized=w.cards[1];customized.duration=8;customized.included=false;customized.template.name='我的捏脸版本';customized.template.scene+=' A personal familiar living room.';
 customized.frame={assetId:'private-first-frame',signature:frameSignature(project.character,w,customized)};
 customized.edited={text:'my carefully edited H3 prompt',signature:promptSignature(project.character,w,customized),source:'manual'};
 const before=structuredClone(w),next=installTheatrePack(w);
 assert.deepEqual(w,before);assert.equal(next.revision,7);assert.equal(next.masterAssetId,'approved-character');assert.equal(next.cards.length,motionTemplates.length);
 for(const original of before.cards)assert.deepEqual(next.cards.find(c=>c.id===original.id),original);
 const additions=next.cards.filter(c=>!originalIds.has(c.template.id));assert.deepEqual(additions.map(c=>c.template.id),motionTemplates.filter(t=>!originalIds.has(t.id)).map(t=>t.id));assert.equal(next.activeId,additions[0].id);
 for(const c of additions){assert.equal(c.included,true);assert.equal(c.archived,undefined);assert.equal(c.frame,undefined);assert.equal(c.edited,undefined);}
 const retained=next.cards.find(c=>c.id===customized.id)!;assert.ok(frameReady(project.character,next,retained));assert.equal(currentVideoPrompt(project.character,next,retained),'my carefully edited H3 prompt');
 assert.equal(installTheatrePack(next),next);
});
function assertPackUpgradePreservesCards(previousTemplates:MotionTemplate[],expectedAdditions?:MotionTemplate[]) {
 const w=defaultVideoWorkspace(project);
 const previousIds=new Set(previousTemplates.map(t=>t.id));w.cards=w.cards.filter(c=>previousIds.has(c.template.id));w.revision=11;w.masterAssetId='approved-character';
 expectedAdditions??=motionTemplates.filter(t=>!previousIds.has(t.id));
 w.archetype='animal';w.style='flat';w.background='illustration';
 for(const [index,c] of w.cards.entries()){
  c.duration=index%2?8:6;c.included=index%3!==0;c.template.name+=` · 我的版本 ${index+1}`;c.template.scene+=` A personally arranged prop number ${index+1}.`;
  c.frame={assetId:`private-frame-${index}`,signature:frameSignature(project.character,w,c)};
  c.edited={text:`hand-edited prompt ${index+1}`,signature:promptSignature(project.character,w,c),source:'manual'};
 }
 const before=structuredClone(w),next=installTheatrePack(w);
 assert.deepEqual(w,before);assert.equal(before.cards.length,previousTemplates.length);assert.equal(next.cards.length,previousTemplates.length+expectedAdditions.length);
 assert.equal(next.revision,before.revision);assert.equal(next.masterAssetId,before.masterAssetId);
 assert.equal(next.archetype,before.archetype);assert.equal(next.style,before.style);assert.equal(next.background,before.background);
 for(const c of before.cards){const retained=next.cards.find(item=>item.id===c.id)!;assert.deepEqual(retained,c);assert.ok(frameReady(project.character,next,retained));assert.equal(currentVideoPrompt(project.character,next,retained),c.edited!.text);}
 const additions=next.cards.filter(c=>!previousIds.has(c.template.id));assert.deepEqual(additions.map(c=>c.template.id),expectedAdditions.map(t=>t.id));assert.equal(next.activeId,additions[0].id);
 for(const c of additions){assert.equal(c.included,true);assert.equal(c.archived,undefined);assert.equal(c.frame,undefined);assert.equal(c.edited,undefined);}
 assert.equal(installTheatrePack(next),next);
}
test('upgrading the original and everyday theatres adds all missing recipes and preserves every existing image and edit',()=>{
 assertPackUpgradePreservesCards([...originalTheatreTemplates,...everydayTheatreTemplates]);
});
test('upgrading the first three packs preserves every image, edited prompt and character setting while adding all missing recipes',()=>{
 assertPackUpgradePreservesCards([...originalTheatreTemplates,...everydayTheatreTemplates,...comedyTheatreTemplates]);
});
test('adding the chat reaction pack preserves the existing four packs and their independent images and manual prompts',()=>{
 assertPackUpgradePreservesCards([...originalTheatreTemplates,...everydayTheatreTemplates,...comedyTheatreTemplates,...personalityTheatreTemplates],chatReactionTheatreTemplates);
});
test('theatre timelines preserve fast onsets and specific camera/actor direction without global motion suppression',()=>{
 const w=defaultVideoWorkspace(project);
 for(const c of w.cards){const timeline=beatTimeline(c);assert.equal(timeline.length,4);assert.equal(timeline[0].start,0);assert.equal(timeline.at(-1)!.end,c.duration);for(let i=1;i<timeline.length;i++)assert.equal(timeline[i].start,timeline[i-1].end);
  const p=buildVideoPrompt(project.character,w,c);assert.ok(!p.includes('Keep the same character scale'));assert.ok(!p.includes('Contacts stay connected'));assert.ok(p.includes(c.template.theatre!.camera));
 }
 assert.match(buildVideoPrompt(project.character,w,w.cards[0]),/rapid alternating burst/);
 assert.match(buildVideoPrompt(project.character,w,w.cards[1]),/One realistic adult viewer hand/);
 assert.match(buildVideoPrompt(project.character,w,w.cards[2]),/alternately kicking the feet/);
 assert.match(buildVideoPrompt(project.character,w,w.cards[4]),/truck right/);
});
test('theatre API upgrades legacy cards with a backup, retains archive flags and validates timing metadata',async()=>{
 const f=await fixture();try{
  const {p,w}=await prepare(f);w.cards=legacyMotionTemplates.map(t=>({id:t.id,template:structuredClone(t),duration:6,mode:'I2VA',included:true}));w.activeId=w.cards[0].id;
  await f.call(`/api/projects/${p.id}/video`,'PUT',w);
  const installed=await f.call(`/api/projects/${p.id}/video/theatre-pack`,'POST',{revision:1});assert.equal(installed.status,200);assert.equal(installed.data.revision,2);assert.equal(installed.data.cards.length,legacyMotionTemplates.length+motionTemplates.length);assert.equal(f.store.all('video-workspace-backups').length,1);
  assert.equal((await f.call(`/api/projects/${p.id}/video/theatre-pack`,'POST',{revision:1})).status,409);
  assert.equal((await f.call(`/api/projects/${p.id}/video/theatre-pack`,'POST',{revision:2})).data.revision,2);
  const saved=await f.call(`/api/projects/${p.id}/video`,'PUT',installed.data);assert.equal(saved.data.cards.filter((c:any)=>c.archived).length,legacyMotionTemplates.length);
  const invalid=structuredClone(saved.data);invalid.cards[0].template.theatre.ends=[.1,.7,.5,1];assert.equal((await f.call(`/api/projects/${p.id}/video`,'PUT',invalid)).status,400);
  const imported=await f.call('/api/video/templates/import','POST',portableTemplates([motionTemplates[0],legacyMotionTemplates[0]]));assert.equal(imported.status,201);assert.deepEqual(imported.data[0].theatre.ends,motionTemplates[0].theatre!.ends);assert.equal(imported.data[1].theatre,undefined);
 }finally{await f.dispose();}
});
test('first-frame ownership includes unselected active I2VA cards but excludes archives, reference mode and stale bindings',()=>{
 const w=defaultVideoWorkspace(project);w.cards=w.cards.slice(0,3);
 for(const c of w.cards)c.frame={assetId:'shared-image',signature:frameSignature(project.character,w,c)};
 w.cards[1].included=false;w.masterAssetId=undefined;
 assert.equal(firstFrameConflicts(project.character,w,[])[0].cardIds.length,3);
 w.cards[1].archived=true;w.cards[2].mode='Ref2VA';assert.deepEqual(firstFrameConflicts(project.character,w,[]),[]);
 w.cards[2].mode='I2VA';w.cards[2].frame!.signature='outdated';assert.deepEqual(firstFrameConflicts(project.character,w,[]),[]);
 w.cards[2].frame={assetId:'new-upload',signature:frameSignature(project.character,w,w.cards[2])};
 const sameContent=[{id:'shared-image',contentHash:'same-content'},{id:'new-upload',contentHash:'same-content'}];
 assert.deepEqual(firstFrameConflicts(project.character,w,sameContent)[0].cardIds,[w.cards[0].id,w.cards[2].id]);
});
test('image fingerprints detect re-encoded identical uploads and lazily migrate legacy assets',async()=>{
 const f=await fixture();try{
  const {p,w,image}=await prepare(f);
  const differentEncoding=await sharp({create:{width:40,height:40,channels:4,background:'pink'}}).withMetadata({density:144}).png({compressionLevel:0}).toBuffer();
  const duplicate=(await f.call('/api/assets','POST',{filename:'renamed.png',dataUrl:`data:image/png;base64,${differentEncoding.toString('base64')}`})).data;
  assert.notEqual(image.id,duplicate.id);assert.match(image.contentHash,/^sha256:[a-f0-9]{64}$/);assert.equal(duplicate.contentHash,image.contentHash);
  const legacy={...image};delete legacy.contentHash;f.store.put('assets',image.id,legacy);
  w.cards=w.cards.slice(0,2);for(const [index,c] of w.cards.entries())c.frame={assetId:index?duplicate.id:image.id,signature:frameSignature(p.character,w,c)};
  f.store.put('video-workspaces',p.id,w);
  const loaded=await f.call(`/api/projects/${p.id}/video`);assert.equal(loaded.status,200);assert.equal(loaded.data.frameConflicts.length,1);assert.equal(loaded.data.frameAssets.length,2);
  assert.equal(f.store.get<Asset>('assets',image.id)!.contentHash,duplicate.contentHash);
 }finally{await f.dispose();}
});
test('new duplicate first-frame bindings are refused even after deselection and reupload; master references remain reusable',async()=>{
 const f=await fixture();try{
  const {p,w,image}=await prepare(f);w.cards=w.cards.slice(0,2);w.masterAssetId=image.id;
  w.cards[0].frame={assetId:image.id,signature:frameSignature(p.character,w,w.cards[0])};w.cards[0].included=false;
  let saved=await f.call(`/api/projects/${p.id}/video`,'PUT',w);assert.equal(saved.status,200);
  const duplicate=await f.images.save(await f.images.load(image.id),'same-but-new-name.png');
  for(const assetId of [image.id,duplicate.id]){
   const bad=structuredClone(saved.data) as VideoWorkspace;bad.cards[1].frame={assetId,signature:frameSignature(p.character,bad,bad.cards[1])};
   const result=await f.call(`/api/projects/${p.id}/video`,'PUT',bad);assert.equal(result.status,409);assert.match(result.data.error,/一图一剧情/);assert.ok(result.data.error.includes(w.cards[0].template.name));
   const check=await f.call(`/api/projects/${p.id}/video/check-frame`,'POST',{workspace:saved.data,cardId:w.cards[1].id,assetId});assert.equal(check.status,409);
  }
  assert.equal(f.store.get<VideoWorkspace>('video-workspaces',p.id)!.revision,1);
  const reference=structuredClone(saved.data) as VideoWorkspace;reference.cards[1].mode='Ref2VA';
  assert.equal((await f.call(`/api/projects/${p.id}/video/check-frame`,'POST',{workspace:reference,cardId:reference.cards[1].id,assetId:duplicate.id})).status,200);
  reference.cards[0].included=true;saved=await f.call(`/api/projects/${p.id}/video`,'PUT',reference);assert.equal(saved.status,200);assert.equal((await f.call(`/api/projects/${p.id}/video/export?check=1`)).status,200);
 }finally{await f.dispose();}
});
test('historical collisions stay editable and can be repaired incrementally, while affected exports are blocked',async()=>{
 const f=await fixture();try{
  const {p,w,image}=await prepare(f);w.cards=w.cards.slice(0,3);w.revision=4;
  for(const c of w.cards)c.frame={assetId:image.id,signature:frameSignature(p.character,w,c)};
  f.store.put('video-workspaces',p.id,w);
  w.cards[1].included=false;w.cards[2].included=false;
  let saved=await f.call(`/api/projects/${p.id}/video`,'PUT',w);assert.equal(saved.status,200);assert.equal(saved.data.revision,5);
  for(const suffix of ['', '?check=1']){const result=await f.call(`/api/projects/${p.id}/video/export${suffix}`);assert.equal(result.status,409);assert.match(result.data.error,/一图一剧情/);}
  const fresh=await f.images.save(await sharp({create:{width:40,height:40,channels:3,background:'blue'}}).png().toBuffer(),'independent-pose.png');
  const newCollision=structuredClone(saved.data) as VideoWorkspace;
  for(const c of newCollision.cards.slice(0,2))c.frame={assetId:fresh.id,signature:frameSignature(p.character,newCollision,c)};
  assert.equal((await f.call(`/api/projects/${p.id}/video`,'PUT',newCollision)).status,409);
  const repaired=saved.data as VideoWorkspace;repaired.cards[0].frame={assetId:fresh.id,signature:frameSignature(p.character,repaired,repaired.cards[0])};
  assert.equal((await f.call(`/api/projects/${p.id}/video/check-frame`,'POST',{workspace:repaired,cardId:repaired.cards[0].id,assetId:fresh.id})).status,200);
  saved=await f.call(`/api/projects/${p.id}/video`,'PUT',repaired);assert.equal(saved.status,200);
  const remaining=(await f.call(`/api/projects/${p.id}/video`)).data.frameConflicts;assert.equal(remaining.length,1);assert.equal(remaining[0].cardIds.length,2);
  // An independent selected card can be exported without pretending the other cards are independent.
  assert.deepEqual((await f.call(`/api/projects/${p.id}/video/export?check=1`)).data,{ok:true,count:1});
  const archived=saved.data as VideoWorkspace;archived.cards[2].archived=true;archived.cards[1].included=true;
  assert.equal((await f.call(`/api/projects/${p.id}/video`,'PUT',archived)).status,200);assert.deepEqual((await f.call(`/api/projects/${p.id}/video`)).data.frameConflicts,[]);
  assert.equal((await f.call(`/api/projects/${p.id}/video/export?check=1`)).status,200);
 }finally{await f.dispose();}
});
test('archives do not occupy an active frame, but explicitly exporting duplicated archive cards is rejected',async()=>{
 const f=await fixture();try{
  const {p,w,image}=await prepare(f);w.cards=w.cards.slice(0,2);
  for(const c of w.cards){c.archived=true;c.included=true;c.frame={assetId:image.id,signature:frameSignature(p.character,w,c)};}
  f.store.put('video-workspaces',p.id,w);
  assert.deepEqual((await f.call(`/api/projects/${p.id}/video`)).data.frameConflicts,[]);
  assert.equal((await f.call(`/api/projects/${p.id}/video/export?check=1`)).status,409);
  w.cards[1].included=false;f.store.put('video-workspaces',p.id,w);
  assert.equal((await f.call(`/api/projects/${p.id}/video/export?check=1`)).status,200);
 }finally{await f.dispose();}
});
