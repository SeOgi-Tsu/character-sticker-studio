import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../server/app.ts';
import type { MiniScene, Project, Reaction } from '../src/shared/types.ts';

async function fixture(){
 const directory=await mkdtemp(join(tmpdir(),'sticker-mini-scene-'));
 const pixel=await sharp({create:{width:32,height:32,channels:4,background:'#ffffff'}}).png().toBuffer();
 const prompts:string[]=[];
 const runtime=createApp({dataDir:directory,autoStart:false,provider:{async generate(input){prompts.push(input.prompt);return pixel;}}});
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise<void>(done=>server.once('listening',done));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
 const boot=(await call('/api/bootstrap')).data,project:Project=boot.projects[0],reactionId:string=boot.catalog.reactions[0].id;
 const until=async(id:string)=>{for(let n=0;n<200;n++){const job=(await call(`/api/jobs/${id}`)).data;if(!['queued','running'].includes(job.status))return job;await new Promise(r=>setTimeout(r,10));}throw Error('fixture timeout');};
 return {...runtime,call,project,reactionId,catalog:boot.catalog,until,prompts,pixel,async close(){server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await runtime.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));await rm(directory,{recursive:true,force:true});}};
}
const miniScene:MiniScene={enabled:true,setup:'她端着小杯子逞强。',reveal:'手里空杯子暴露已经喝完。',prop:'一只小茶杯'};
const custom:Reaction={id:'custom-little-scene',name:'嘴硬小剧场',caption:'才没有',category:'自定义',action:'Hold one small cup.',tags:[],emoji:'',miniScene};

test('mini-scenes and motifs survive custom and catalog override recipe roundtrips, including disabled drafts and empty text',async()=>{
 const f=await fixture();try{
  const input={character:{...f.project.character,signatureMotifs:'小茶杯、心形便签'},customReactions:[custom],overrides:{[f.reactionId]:{miniScene:{...miniScene,enabled:false}}},selectedIds:[f.reactionId,custom.id]};
  const saved=(await f.call(`/api/projects/${f.project.id}`,'PUT',input)).data;
  assert.equal(saved.character.signatureMotifs,input.character.signatureMotifs);assert.deepEqual(saved.customReactions[0].miniScene,miniScene);assert.deepEqual(saved.overrides[f.reactionId].miniScene,{...miniScene,enabled:false});
  const recipe=(await f.call(`/api/projects/${f.project.id}/recipe`)).data;
  const restored=await f.call('/api/projects/import','POST',recipe);assert.equal(restored.status,201);assert.deepEqual(restored.data.customReactions,saved.customReactions);assert.deepEqual(restored.data.overrides,saved.overrides);assert.equal(restored.data.character.signatureMotifs,saved.character.signatureMotifs);
  const empty={enabled:true,setup:'',reveal:'',prop:''};const blank=await f.call(`/api/projects/${f.project.id}`,'PUT',{character:{...f.project.character,signatureMotifs:''},overrides:{[f.reactionId]:{miniScene:empty}}});assert.equal(blank.status,200);assert.deepEqual(blank.data.overrides[f.reactionId].miniScene,empty);assert.equal(blank.data.character.signatureMotifs,'');
  const {miniScene:unused,...legacyCustom}=custom;const legacy=await f.call('/api/projects','POST',{character:f.project.character,customReactions:[legacyCustom],selectedIds:[legacyCustom.id]});assert.equal(legacy.status,201);assert.equal(legacy.data.character.signatureMotifs,undefined);assert.equal(legacy.data.customReactions[0].miniScene,undefined);
  const limits=await f.call(`/api/projects/${f.project.id}`,'PUT',{character:{...f.project.character,signatureMotifs:'x'.repeat(400)},overrides:{[f.reactionId]:{miniScene:{enabled:false,setup:'x'.repeat(240),reveal:'x'.repeat(240),prop:'x'.repeat(160)}}}});assert.equal(limits.status,200);
 }finally{await f.close();}
});

test('invalid mini-scene objects, required field types and lengths reject atomically on update or import',async()=>{
 const f=await fixture();try{
  await f.call(`/api/projects/${f.project.id}`,'PUT',{customReactions:[custom],overrides:{[f.reactionId]:{miniScene}},character:{...f.project.character,signatureMotifs:'小茶杯'}});
  const original=f.store.get<Project>('projects',f.project.id);
  const invalidScenes:unknown[]=[null,[],false,'scene',{}, {...miniScene,enabled:'false'}, {...miniScene,enabled:1}, {...miniScene,enabled:null}, {...miniScene,enabled:undefined}, {...miniScene,setup:undefined}, {...miniScene,reveal:42}, {...miniScene,prop:null}, {...miniScene,setup:'x'.repeat(241)}, {...miniScene,reveal:'x'.repeat(241)}, {...miniScene,prop:'x'.repeat(161)}];
  for(const invalid of invalidScenes){
   const response=await f.call(`/api/projects/${f.project.id}`,'PUT',{name:'must not persist',overrides:{[f.reactionId]:{miniScene:invalid}}});assert.equal(response.status,400,JSON.stringify(invalid));assert.deepEqual(f.store.get('projects',f.project.id),original);
  }
  for(const invalid of [null,[],42,'x'.repeat(401)]){const response=await f.call(`/api/projects/${f.project.id}`,'PUT',{name:'must not persist',character:{...f.project.character,signatureMotifs:invalid}});assert.equal(response.status,400);assert.deepEqual(f.store.get('projects',f.project.id),original);}
  const count=f.store.all('projects').length;
  const invalidCustom=await f.call('/api/projects/import','POST',{version:1,project:{customReactions:[{...custom,miniScene:{...miniScene,prop:false}}],selectedIds:[custom.id]}});assert.equal(invalidCustom.status,400);assert.equal(f.store.all('projects').length,count);
  const invalidMotif=await f.call('/api/projects/import','POST',{version:1,project:{character:{...f.project.character,signatureMotifs:'x'.repeat(401)}}});assert.equal(invalidMotif.status,400);assert.equal(f.store.all('projects').length,count);
 }finally{await f.close();}
});

test('queued mini-scene direction and motifs freeze before edits and explicit retry keeps the original prompt',async()=>{
 const f=await fixture();try{
  const asset=(await f.call('/api/assets','POST',{filename:'fixture.png',dataUrl:'data:image/png;base64,'+f.pixel.toString('base64')})).data;
  await f.call('/api/settings','PUT',{apiKey:'test-only-no-paid-provider'});
  await f.call(`/api/projects/${f.project.id}`,'PUT',{character:{...f.project.character,referenceAssetId:asset.id,signatureMotifs:'MOTIF_ORIGINAL_CUP'},overrides:{[f.reactionId]:{miniScene:{enabled:true,setup:'SCENE_ORIGINAL_SETUP',reveal:'SCENE_ORIGINAL_REVEAL',prop:'SCENE_ORIGINAL_PROP'}}}});
  const first=(await f.call('/api/jobs','POST',{projectId:f.project.id,kind:'sticker',reactionIds:[f.reactionId],requestId:'mini-scene-original'})).data.jobs[0];
  for(const marker of ['MOTIF_ORIGINAL_CUP','SCENE_ORIGINAL_SETUP','SCENE_ORIGINAL_REVEAL','SCENE_ORIGINAL_PROP'])assert.ok(first.prompt.includes(marker),marker);
  await f.call(`/api/projects/${f.project.id}`,'PUT',{character:{...f.project.character,referenceAssetId:asset.id,signatureMotifs:'MOTIF_CHANGED'},overrides:{[f.reactionId]:{miniScene:{enabled:false,setup:'SCENE_CHANGED',reveal:'',prop:''}}}});
  f.start();assert.equal((await f.until(first.id)).status,'succeeded');assert.equal(f.prompts[0],first.prompt);assert.ok(!f.prompts[0].includes('SCENE_CHANGED'));
  const retry=(await f.call(`/api/jobs/${first.id}/retry`,'POST',{requestId:'mini-scene-retry'})).data;assert.equal(retry.prompt,first.prompt);assert.equal((await f.until(retry.id)).status,'succeeded');assert.equal(f.prompts[1],first.prompt);
 }finally{await f.close();}
});

test('a seventy-reaction selection saves and queues as an explicit batch without changing default selections',async()=>{
 const f=await fixture();try{
  const defaultSelection=[...f.project.selectedIds];
  const selectedIds=f.catalog.packs.find((pack:{id:string})=>pack.id==='all70')?.reactionIds;assert.equal(selectedIds?.length,70);
  const asset=(await f.call('/api/assets','POST',{filename:'fixture.png',dataUrl:'data:image/png;base64,'+f.pixel.toString('base64')})).data;
  const saved=await f.call(`/api/projects/${f.project.id}`,'PUT',{selectedIds,character:{...f.project.character,referenceAssetId:asset.id}});assert.equal(saved.status,200);assert.deepEqual(saved.data.selectedIds,selectedIds);
  const recipe=(await f.call(`/api/projects/${f.project.id}/recipe`)).data;const restored=await f.call('/api/projects/import','POST',recipe);assert.equal(restored.status,201);assert.deepEqual(restored.data.selectedIds,selectedIds);
  const catalogScene=f.catalog.reactions.find((reaction:Reaction)=>reaction.miniScene);assert.ok(catalogScene);assert.deepEqual((await f.call('/api/bootstrap')).data.catalog.reactions.find((reaction:Reaction)=>reaction.id===catalogScene.id).miniScene,catalogScene.miniScene);
  await f.call('/api/settings','PUT',{apiKey:'test-only-no-paid-provider'});
  const batch=await f.call('/api/jobs','POST',{projectId:f.project.id,kind:'sticker',reactionIds:selectedIds,requestId:'explicit-seventy'});assert.equal(batch.status,201);assert.equal(batch.data.jobs.length,70);assert.ok(batch.data.jobs.every((j:{status:string})=>j.status==='queued'));assert.equal(f.prompts.length,0);
  const next=await f.call('/api/projects','POST',{});assert.deepEqual(next.data.selectedIds,defaultSelection);
 }finally{await f.close();}
});
