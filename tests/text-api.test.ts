import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import sharp from 'sharp';
import { createApp } from '../server/app.ts';
import type { Caption } from '../src/shared/types.ts';

async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),'sticker-text-api-'));
 const pixel=await sharp({create:{width:64,height:64,channels:4,background:'#eeddee'}}).png().toBuffer();
 const runtime=createApp({dataDir:dir,autoStart:false,provider:{async generate(){return pixel;}}});
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:response.headers.get('content-type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer())};};
 const boot=(await call('/api/bootstrap')).data,p=boot.projects[0],id=boot.catalog.reactions[0].id;
 const asset=(await call('/api/assets','POST',{filename:'fixture.png',dataUrl:`data:image/png;base64,${pixel.toString('base64')}`})).data;
 await call(`/api/projects/${p.id}`,'PUT',{character:{...p.character,referenceAssetId:asset.id}});
 await call('/api/settings','PUT',{apiKey:'private-fixture-key'});
 const until=async(id:string)=>{for(let n=0;n<200;n++){const j=(await call(`/api/jobs/${id}`)).data;if(!['queued','running'].includes(j.status))return j;await new Promise(r=>setTimeout(r,10));}throw Error('timeout');};
 return {...runtime,call,p,id,asset,until,async dispose(){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await runtime.close();await rm(dir,{recursive:true,force:true});}};
}
const caption:Caption={text:'才没有！\n哼',enabled:true,mode:'generated',styleId:'brush',rotation:-12,position:'right',color:'#382537',stroke:'#ffffff',fontSize:64};
function zipEntries(buffer:Buffer){const entries=new Map<string,Buffer>();const end=buffer.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));let cursor=buffer.readUInt32LE(end+16);const count=buffer.readUInt16LE(end+10);for(let i=0;i<count;i++){const method=buffer.readUInt16LE(cursor+10),length=buffer.readUInt32LE(cursor+20),nameLength=buffer.readUInt16LE(cursor+28),extraLength=buffer.readUInt16LE(cursor+30),commentLength=buffer.readUInt16LE(cursor+32),local=buffer.readUInt32LE(cursor+42);const name=buffer.subarray(cursor+46,cursor+46+nameLength).toString();const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);const data=buffer.subarray(start,start+length);entries.set(name,method===8?inflateRawSync(data):data);cursor+=46+nameLength+extraLength+commentLength;}return entries;}

test('caption controls and persona survive save and recipe import with strict input bounds',async()=>{
 const f=await fixture();try{
  const saved=(await f.call(`/api/projects/${f.p.id}`,'PUT',{character:{...f.p.character,memePersona:'爱逞强，会害羞的成年角色。'},captions:{[f.id]:caption},overrides:{[f.id]:{textMode:'generated',captionStyleId:'comic'}}})).data;
  assert.equal(saved.character.memePersona,'爱逞强，会害羞的成年角色。');assert.deepEqual(saved.captions[f.id],caption);assert.equal(saved.overrides[f.id].textMode,'generated');
  const recipe=(await f.call(`/api/projects/${f.p.id}/recipe`)).data,restored=(await f.call('/api/projects/import','POST',recipe)).data;assert.deepEqual(restored.captions[f.id],caption);assert.equal(restored.character.memePersona,saved.character.memePersona);
  assert.ok(!JSON.stringify(recipe).includes('private-fixture-key'));
  for(const invalid of [{mode:'bad'},{styleId:'unknown'},{position:'center'},{rotation:21},{rotation:'8'},{enabled:'false'},{text:'a'.repeat(49)}])assert.equal((await f.call(`/api/projects/${f.p.id}`,'PUT',{captions:{[f.id]:{...caption,...invalid}}})).status,400,JSON.stringify(invalid));
  assert.equal((await f.call(`/api/projects/${f.p.id}`,'PUT',{character:{...f.p.character,memePersona:'x'.repeat(1201)}})).status,400);
 }finally{await f.dispose();}
});
test('queued generation freezes native text and retry preserves it after desired settings change',async()=>{
 const f=await fixture();try{
  await f.call(`/api/projects/${f.p.id}`,'PUT',{captions:{[f.id]:caption}});
  const original=(await f.call('/api/jobs','POST',{projectId:f.p.id,kind:'sticker',reactionIds:[f.id],requestId:'frozen-native'})).data.jobs[0];
  assert.equal(original.textMode,'generated');assert.equal(original.generatedText,caption.text);assert.ok(original.prompt.includes('才没有！'));
  await f.call(`/api/projects/${f.p.id}`,'PUT',{captions:{[f.id]:{...caption,mode:'overlay',text:'另一个字'}}});
  f.start();assert.equal((await f.until(original.id)).status,'succeeded');
  const withText=(await f.call(`/api/jobs/${original.id}/render?caption=1`)).data,raw=(await f.call(`/api/jobs/${original.id}/render?caption=0`)).data;assert.ok(withText.equals(raw),'native lettering must never be double-stamped');
  const retried=(await f.call(`/api/jobs/${original.id}/retry`,'POST',{requestId:'retry-native'})).data;assert.equal(retried.textMode,'generated');assert.equal(retried.generatedText,caption.text);assert.equal(retried.prompt,original.prompt);await f.until(retried.id);
  const boot=(await f.call('/api/bootstrap')).data;assert.ok(!JSON.stringify(boot).includes('private-fixture-key'));
  const zipped=zipEntries((await f.call(`/api/projects/${f.p.id}/export?captions=1&size=512`)).data);const recipe=JSON.parse(zipped.get('recipe.json')!.toString());assert.equal(recipe.results[0].textMode,'generated');assert.equal(recipe.results[0].generatedText,caption.text);assert.ok(!JSON.stringify(recipe).includes('private-fixture-key'));
  const resized=[...zipped].find(([name])=>name.startsWith('resized/'))![1],captioned=[...zipped].find(([name])=>name.startsWith('captioned/'))![1];assert.ok(resized.equals(captioned));
 }finally{await f.dispose();}
});
test('imported native text is preserved and legacy clean sources allow caption toggles',async()=>{
 const f=await fixture();try{
  const body={projectId:f.p.id,kind:'sticker',reactionId:f.id,assetId:f.asset.id};
  const native=(await f.call('/api/jobs/import','POST',{...body,textMode:'generated',generatedText:'原生字'})).data;assert.equal(native.textMode,'generated');assert.equal(native.generatedText,'原生字');
  await f.call(`/api/projects/${f.p.id}`,'PUT',{captions:{[f.id]:{...caption,mode:'overlay'}}});
  assert.ok((await f.call(`/api/jobs/${native.id}/render?caption=1`)).data.equals((await f.call(`/api/jobs/${native.id}/render?caption=0`)).data));
  const clean=(await f.call('/api/jobs/import','POST',body)).data;assert.equal(clean.textMode,'overlay');
  const raw=(await f.call(`/api/jobs/${clean.id}/render?caption=0`)).data;assert.ok(!(await f.call(`/api/jobs/${clean.id}/render?caption=1`)).data.equals(raw));
  await f.call(`/api/projects/${f.p.id}`,'PUT',{captions:{[f.id]:{...caption,mode:'none'}}});assert.ok((await f.call(`/api/jobs/${clean.id}/render?caption=1`)).data.equals(raw));
  for(const invalid of [{textMode:'invalid'},{textMode:'none',generatedText:'baked'},{textMode:'generated',generatedText:'x'.repeat(49)}])assert.equal((await f.call('/api/jobs/import','POST',{...body,...invalid})).status,400);
 }finally{await f.dispose();}
});
