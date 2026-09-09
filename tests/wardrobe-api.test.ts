import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../server/app.ts';
import type { GenerationInput } from '../server/provider.ts';

async function fixture() {
 const dir=await mkdtemp(join(tmpdir(),'sticker-wardrobe-'));
 const seen:GenerationInput[]=[];
 const bytes=await sharp({create:{width:32,height:32,channels:4,background:'#ffffff'}}).png().toBuffer();
 const runtime=createApp({dataDir:dir,autoStart:false,provider:{async generate(input){seen.push(input);return bytes;}}});
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
 const upload=async(color:string)=>{const image=await sharp({create:{width:32,height:32,channels:4,background:color}}).png().toBuffer();const asset=(await call('/api/assets','POST',{filename:'fixture.png',dataUrl:`data:image/png;base64,${image.toString('base64')}`})).data;return {asset,bytes:await readFile(join(dir,'assets',`${asset.id}.png`))};};
 const until=async(id:string)=>{for(let n=0;n<200;n++){const j=(await call(`/api/jobs/${id}`)).data;if(!['queued','running'].includes(j.status))return j;await new Promise(r=>setTimeout(r,10));}throw Error('timeout');};
 return {...runtime,call,upload,until,seen,async dispose(){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await runtime.close();await rm(dir,{recursive:true,force:true});}};
}

test('outfit mode defaults, validates and survives portable recipe roundtrip',async()=>{
 const f=await fixture();try{
  const p=(await f.call('/api/bootstrap')).data.projects[0];assert.equal(p.character.outfitMode,'reference');
  for(const outfitMode of ['custom','reference']){
   const saved=await f.call(`/api/projects/${p.id}`,'PUT',{character:{...p.character,outfitMode}});assert.equal(saved.data.character.outfitMode,outfitMode);
   const recipe=(await f.call(`/api/projects/${p.id}/recipe`)).data;
   const restored=await f.call('/api/projects/import','POST',recipe);assert.equal(restored.status,201);assert.equal(restored.data.character.outfitMode,outfitMode);
  }
  for(const outfitMode of ['invalid',null,42])assert.equal((await f.call(`/api/projects/${p.id}`,'PUT',{character:{...p.character,outfitMode}})).status,400);
  const {outfitMode,...legacyCharacter}=p.character;
  assert.equal((await f.call(`/api/projects/${p.id}`,'PUT',{character:legacyCharacter})).data.character.outfitMode,'reference');
  const imported=await f.call('/api/projects/import','POST',{version:1,project:{character:{...legacyCharacter,outfitMode:'bad'}}});assert.equal(imported.status,400);
 }finally{await f.dispose();}
});

test('queued reference-mode sticker freezes distinct original and style bytes while custom mode selects one anchor',async()=>{
 const f=await fixture();try{
  const boot=(await f.call('/api/bootstrap')).data,p=boot.projects[0],reactionId=boot.catalog.reactions[0].id;
  const original=await f.upload('#dd1133'),anchor=await f.upload('#1144cc');
  await f.call('/api/settings','PUT',{apiKey:'fixture'});
  await f.call(`/api/projects/${p.id}`,'PUT',{character:{...p.character,referenceAssetId:original.asset.id,anchorAssetId:anchor.asset.id}});
  const create=async(kind:string,key:string)=>(await f.call('/api/jobs','POST',{projectId:p.id,kind,reactionIds:[reactionId],requestId:key})).data.jobs[0];
  const sticker=await create('sticker','frozen-sticker'),neutral=await create('anchor','neutral-anchor'),sheet=await create('character','sheet');
  const frozen=f.store.get<any>('jobs',sticker.id);assert.equal(frozen.referenceId,original.asset.id);assert.equal(frozen.secondaryReferenceId,anchor.asset.id);
  await f.call(`/api/projects/${p.id}`,'PUT',{character:{...p.character,outfitMode:'custom',outfit:'new outfit',referenceAssetId:anchor.asset.id,anchorAssetId:original.asset.id}});
  const custom=await create('sticker','custom-outfit');
  assert.equal(f.store.get<any>('jobs',custom.id).referenceId,original.asset.id);assert.equal(f.store.get<any>('jobs',custom.id).secondaryReferenceId,undefined);
  assert.equal(f.store.get<any>('jobs',sticker.id).job.prompt,frozen.job.prompt);
  f.start();for(const job of [sticker,neutral,sheet,custom])assert.equal((await f.until(job.id)).status,'succeeded');
  const captured=f.seen.find(item=>item.prompt===frozen.job.prompt)!;
  assert.deepEqual(captured.reference,original.bytes);assert.deepEqual(captured.secondaryReference,anchor.bytes);assert.notDeepEqual(captured.reference,captured.secondaryReference);
  for(const job of [neutral,sheet]){const record=f.store.get<any>('jobs',job.id);assert.equal(record.referenceId,original.asset.id);assert.equal(record.secondaryReferenceId,undefined);}
 }finally{await f.dispose();}
});

test('single reference, deduplicated image and old saved jobs remain compatible',async()=>{
 const f=await fixture();try{
  const boot=(await f.call('/api/bootstrap')).data,p=boot.projects[0],reactionId=boot.catalog.reactions[0].id;const original=await f.upload('#227733');await f.call('/api/settings','PUT',{apiKey:'fixture'});
  for(const [key,character] of Object.entries({original:{...p.character,referenceAssetId:original.asset.id},anchor:{...p.character,anchorAssetId:original.asset.id},same:{...p.character,referenceAssetId:original.asset.id,anchorAssetId:original.asset.id}})){
   await f.call(`/api/projects/${p.id}`,'PUT',{character});
   const job=(await f.call('/api/jobs','POST',{projectId:p.id,kind:'sticker',reactionIds:[reactionId],requestId:key})).data.jobs[0];
   const record=f.store.get<any>('jobs',job.id);assert.equal(record.referenceId,original.asset.id);assert.equal(record.secondaryReferenceId,undefined);
   // Explicitly reproduce an older persisted record without the new field.
   delete record.secondaryReferenceId;f.store.put('jobs',job.id,record);
  }
  f.start();for(const record of f.store.all<any>('jobs'))assert.equal((await f.until(record.job.id)).status,'succeeded');
  assert.equal(f.seen.length,3);for(const input of f.seen){assert.deepEqual(input.reference,original.bytes);assert.equal(input.secondaryReference,undefined);}
 }finally{await f.dispose();}
});
