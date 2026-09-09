import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { CloudImageProvider, ProviderError, validateRunningHubSettings } from '../server/provider.ts';
import { createApp } from '../server/app.ts';
import type { ProviderSettings } from '../src/shared/types.ts';

const resourceId='2018709606033264641',taskId='2013508786110730241';
const config=(baseUrl:string,kind:'app'|'workflow'='app'):ProviderSettings=>({provider:'runninghub',baseUrl,model:'',apiKey:'private-rh-key',size:'1024x1024',concurrency:1,runninghub:{kind,resourceId,promptNode:{nodeId:'6',fieldName:'text'},referenceNode:{nodeId:'12',fieldName:'image'},extraNodes:[{nodeId:'3',fieldName:'seed',fieldValue:'42'}],outputIndex:1}});
async function remote(handler:(url:string,body:Buffer,headers:any)=>unknown){
 const calls:{url:string;body:Buffer;headers:any}[]=[];
 const server=createServer(async(req,res)=>{const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks),url=req.url!;calls.push({url,body,headers:req.headers});const output:any=handler(url,body,req.headers);res.statusCode=output.httpStatus||200;res.setHeader('content-type','application/json');res.end(JSON.stringify(output));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 return {calls,url:`http://127.0.0.1:${(server.address() as {port:number}).port}`,async close(){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}};
}
const result={status:'SUCCESS',taskId,results:[{url:'https://images.example.test/zero.png',outputType:'png'},{url:'https://images.example.test/one.png',outputType:'png'}]};
const provider=(bytes=Buffer.from('fixture'))=>new CloudImageProvider({runningHub:{pollIntervalMs:1,timeoutMs:5000,download:async(url:string)=>{assert.equal(url,'https://images.example.test/one.png');return bytes;}}});

for(const kind of ['app','workflow'] as const)test(`RunningHub ${kind} uploads reference, maps nodes and persists ID before querying exactly one submission`,async()=>{
 let recorded='';let polls=0;
 const upstream=await remote((url)=>url.endsWith('/binary')?{code:200,data:{fileName:'openapi/reference.png'}}:url.endsWith('/query')?(assert.equal(recorded,taskId),++polls===1?{status:'RUNNING',taskId}:result):{code:0,data:{taskId}});
 try{
  const bytes=await provider().generate({settings:config(upstream.url,kind),prompt:'full body dance',reference:Buffer.from('reference-png'),signal:new AbortController().signal,onRemoteTaskId:async(id:string)=>{recorded=id;}});
  assert.equal(bytes.toString(),'fixture');assert.equal(polls,2);
  const submits=upstream.calls.filter(c=>!c.url.endsWith('/query')&&!c.url.endsWith('/binary'));assert.equal(submits.length,1);
  assert.equal(submits[0].url,kind==='app'?'/task/openapi/ai-app/run':'/task/openapi/create');
  const body=JSON.parse(submits[0].body.toString());assert.equal(body[kind==='app'?'webappId':'workflowId'],resourceId);assert.equal(body.apiKey,'private-rh-key');
  assert.deepEqual(body.nodeInfoList,[{nodeId:'6',fieldName:'text',fieldValue:'full body dance'},{nodeId:'12',fieldName:'image',fieldValue:'openapi/reference.png'},{nodeId:'3',fieldName:'seed',fieldValue:'42'}]);
  assert.ok(upstream.calls[0].body.toString().includes('reference-png'));assert.match(upstream.calls[0].headers['content-type'],/multipart/);
  for(const call of upstream.calls)assert.equal(call.headers.authorization,'Bearer private-rh-key');
 }finally{await upstream.close();}
});

test('known task resumes query only; ambiguous submit and missing reference mapping do not retry',async()=>{
 const upstream=await remote(url=>url.endsWith('/query')?result:{httpStatus:500,error:'private-rh-key'});
 try{
  await provider().generate({settings:config(upstream.url),prompt:'unused',reference:Buffer.from('not uploaded'),secondaryReference:Buffer.from('also not uploaded'),remoteTaskId:taskId,signal:new AbortController().signal});assert.deepEqual(upstream.calls.map(c=>c.url),['/openapi/v2/query']);
  await assert.rejects(provider().generate({settings:config(upstream.url),prompt:'new',signal:new AbortController().signal}),e=>e instanceof ProviderError&&e.uncertain&&!e.message.includes('private-rh-key'));
  const missing=config(upstream.url);delete missing.runninghub!.referenceNode;
  await assert.rejects(provider().generate({settings:missing,prompt:'new',reference:Buffer.from('ref'),signal:new AbortController().signal}),/参考图节点/);
  assert.equal(upstream.calls.length,2);
 }finally{await upstream.close();}
});

for(const hasStyleNode of [false,true])test(`RunningHub ${hasStyleNode?'dual':'single'} mapping keeps original image primary`,async()=>{
 let uploads=0;const upstream=await remote(url=>url.endsWith('/binary')?{code:200,data:{fileName:`openapi/reference-${++uploads}.png`}}:url.endsWith('/query')?result:{code:0,data:{taskId}});
 try{
  const settings=config(upstream.url);if(hasStyleNode)settings.runninghub!.styleReferenceNode={nodeId:'13',fieldName:'image'};
  await provider().generate({settings,prompt:'wardrobe',reference:Buffer.from('original-clothing'),secondaryReference:Buffer.from('style-anchor'),signal:new AbortController().signal});
  const uploadCalls=upstream.calls.filter(c=>c.url.endsWith('/binary'));assert.equal(uploadCalls.length,hasStyleNode?2:1);assert.ok(uploadCalls[0].body.includes(Buffer.from('original-clothing')));if(hasStyleNode)assert.ok(uploadCalls[1].body.includes(Buffer.from('style-anchor')));
  const submissions=upstream.calls.filter(c=>c.url==='/task/openapi/ai-app/run');assert.equal(submissions.length,1);const nodes=JSON.parse(submissions[0].body.toString()).nodeInfoList;
  assert.equal(nodes.find((n:any)=>n.nodeId==='12').fieldValue,'openapi/reference-1.png');assert.equal(nodes.find((n:any)=>n.nodeId==='13')?.fieldValue,hasStyleNode?'openapi/reference-2.png':undefined);
 }finally{await upstream.close();}
});

test('RunningHub optional style mapping validates and shares uniqueness with all nodes',()=>{
 const settings=config('https://www.runninghub.ai').runninghub!;
 const valid={...settings,styleReferenceNode:{nodeId:'13',fieldName:'image'}};
 assert.deepEqual(validateRunningHubSettings(valid).styleReferenceNode,valid.styleReferenceNode);
 for(const styleReferenceNode of [settings.promptNode,settings.referenceNode,settings.extraNodes[0],{nodeId:'bad',fieldName:'image'}])assert.throws(()=>validateRunningHubSettings({...settings,styleReferenceNode}));
});

test('RunningHub second reference upload rejection never submits a partial paid task',async()=>{
 let uploads=0;const upstream=await remote(()=>++uploads===1?{code:200,data:{fileName:'original.png'}}:{httpStatus:500});
 try{
  const settings=config(upstream.url);settings.runninghub!.styleReferenceNode={nodeId:'13',fieldName:'image'};
  await assert.rejects(provider().generate({settings,prompt:'two references',reference:Buffer.from('original'),secondaryReference:Buffer.from('style'),signal:new AbortController().signal}),e=>e instanceof ProviderError&&!e.uncertain);
  assert.deepEqual(upstream.calls.map(c=>c.url),['/openapi/v2/media/upload/binary','/openapi/v2/media/upload/binary']);
 }finally{await upstream.close();}
});

test('submit timeout/conflict and unknown business errors remain uncertain; validation and permission rejects are definite',async()=>{
 for(const response of [{httpStatus:408},{httpStatus:409},{httpStatus:503},...['1000','1005','1012','804','813','999999'].map(code=>({code}))]){
  const upstream=await remote(()=>({...response,message:'private-rh-key'}));
  try{
   await assert.rejects(provider().generate({settings:config(upstream.url),prompt:'test',signal:new AbortController().signal}),e=>e instanceof ProviderError&&e.uncertain&&!e.message.includes('private-rh-key'),JSON.stringify(response));
   assert.equal(upstream.calls.length,1);
  }finally{await upstream.close();}
 }
 for(const response of [{httpStatus:400},{httpStatus:401},{httpStatus:403},{code:433},{code:802},{code:803}]){
  const upstream=await remote(()=>response);
  try{await assert.rejects(provider().generate({settings:config(upstream.url),prompt:'test',signal:new AbortController().signal}),e=>e instanceof ProviderError&&!e.uncertain);assert.equal(upstream.calls.length,1);}finally{await upstream.close();}
 }
});

test('query refuses a different task ID before download, preserving the persisted ID; omitted response ID is accepted',async()=>{
 let recorded='',mismatch=true,downloads=0;
 const upstream=await remote(url=>url.endsWith('/query')?(mismatch?{...result,taskId:'999999999999'}:{...result,taskId:undefined}):{code:0,data:{taskId}});
 const engine=new CloudImageProvider({runningHub:{pollIntervalMs:1,download:async()=>{downloads++;return Buffer.from('fixture');}}});
 try{
  await assert.rejects(engine.generate({settings:config(upstream.url),prompt:'test',signal:new AbortController().signal,onRemoteTaskId:id=>{recorded=id;}}),e=>e instanceof ProviderError&&e.uncertain);
  assert.equal(recorded,taskId);assert.equal(downloads,0);assert.equal(upstream.calls.filter(c=>c.url.endsWith('/run')).length,1);
  mismatch=false;assert.equal((await engine.generate({settings:config(upstream.url),prompt:'unused',signal:new AbortController().signal,remoteTaskId:recorded})).toString(),'fixture');assert.equal(downloads,1);assert.equal(upstream.calls.filter(c=>c.url.endsWith('/run')).length,1);
 }finally{await upstream.close();}
});

test('RunningHub app settings and job API reject invalid mappings, isolate secrets, preserve ID and query on resume/restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rh-studio-'));let queryFails=true;
 const bytes=await sharp({create:{width:32,height:32,channels:4,background:'#ffccff'}}).png().toBuffer();
 const upstream=await remote(url=>url.endsWith('/query')?(queryFails?{httpStatus:503,error:'private-rh-key'}:result):{code:0,data:{taskId}});
 let runtime=createApp({dataDir:dir,autoStart:false,provider:provider(bytes)}),server=runtime.app.listen(0,'127.0.0.1');
 const listen=()=>new Promise<void>(r=>server.listening?r():server.once('listening',r));await listen();
 const call=async(path:string,method='GET',body?:unknown)=>{const res=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}${path}`,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,data:await res.json()};};
 const until=async(id:string)=>{for(let n=0;n<200;n++){const j=(await call(`/api/jobs/${id}`)).data;if(!['queued','running'].includes(j.status))return j;await new Promise(r=>setTimeout(r,10));}throw Error('timeout');};
 const stop=async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await runtime.close();};
 try{
  const valid=config(upstream.url);valid.runninghub!.styleReferenceNode={nodeId:'13',fieldName:'image'};
  const saved=await call('/api/settings','PUT',valid);assert.equal(saved.status,200);assert.equal(saved.data.model,`app:${resourceId}`);assert.equal(saved.data.apiKey,undefined);assert.deepEqual(saved.data.runninghub.styleReferenceNode,valid.runninghub!.styleReferenceNode);
  for(const rh of [{...valid.runninghub,resourceId:2018709606033264641},{...valid.runninghub,outputIndex:16},{...valid.runninghub,extraNodes:[{nodeId:'6',fieldName:'text',fieldValue:'collision'}]},{...valid.runninghub,promptNode:{nodeId:'bad',fieldName:'text'}},{...valid.runninghub,extraNodes:[{nodeId:'1',fieldName:'x',fieldValue:{}}]}])assert.equal((await call('/api/settings','PUT',{...valid,runninghub:rh})).status,400);
  const p=(await call('/api/bootstrap')).data.projects[0];
  const noReference=config(upstream.url);delete noReference.runninghub!.referenceNode;
  await call('/api/settings','PUT',noReference);
  const asset=(await call('/api/assets','POST',{filename:'ref.png',dataUrl:`data:image/png;base64,${bytes.toString('base64')}`})).data;
  await call(`/api/projects/${p.id}`,'PUT',{character:{...p.character,referenceAssetId:asset.id}});
  for(const kind of ['anchor','sticker'])assert.equal((await call('/api/jobs','POST',{projectId:p.id,kind,requestId:`missing-map-${kind}`})).status,400);
  assert.equal(upstream.calls.length,0);
  await call(`/api/projects/${p.id}`,'PUT',{character:p.character});await call('/api/settings','PUT',valid);
  const created=(await call('/api/jobs','POST',{projectId:p.id,kind:'character',requestId:'rh-run'})).data.jobs[0];runtime.start();
  const unknown=await until(created.id);assert.equal(unknown.status,'unknown');assert.equal(unknown.remoteTaskId,taskId);assert.ok(!JSON.stringify((await call('/api/bootstrap')).data).includes('private-rh-key'));
  // Query recovery does not depend on either local image still being present.
  const missingImages=runtime.store.get<any>('jobs',created.id);missingImages.referenceId='missing-original';missingImages.secondaryReferenceId='missing-style';runtime.store.put('jobs',created.id,missingImages);
  const changed=(await call('/api/settings','PUT',{...saved.data,baseUrl:'https://example.test'})).data;assert.equal(changed.hasApiKey,false);
  assert.equal((await call(`/api/jobs/${created.id}/retry`,'POST',{requestId:'no-double-charge'})).status,409);
  queryFails=false;const resumed=await call(`/api/jobs/${created.id}/resume`,'POST',{});assert.equal(resumed.status,200);assert.equal(resumed.data.id,created.id);assert.equal((await until(created.id)).status,'succeeded');
  const record=runtime.store.get<any>('jobs',created.id);record.job.status='running';runtime.store.put('jobs',created.id,record);
  await stop();runtime=createApp({dataDir:dir,provider:provider(bytes)});server=runtime.app.listen(0,'127.0.0.1');await listen();assert.equal((await until(created.id)).status,'succeeded');
  assert.equal(upstream.calls.filter(c=>c.url==='/task/openapi/ai-app/run').length,1);
 }finally{await stop();await upstream.close();await rm(dir,{recursive:true,force:true});}
});

test('cancellation after submission retains remote ID and never claims remote cancellation',{timeout:10000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rh-cancel-'));
 const upstream=await remote(url=>url.endsWith('/query')?{status:'RUNNING',taskId}:{code:0,data:{taskId}});
 let markRecorded!:()=>void,markSettled!:()=>void;
 const recorded=new Promise<void>(resolve=>{markRecorded=resolve;}),settled=new Promise<void>(resolve=>{markSettled=resolve;});
 const engine=provider();
 const runtime=createApp({dataDir:dir,provider:{async generate(input){
  try{return await engine.generate({...input,onRemoteTaskId:async id=>{
   await input.onRemoteTaskId?.(id);
   // Hold at the persisted-ID boundary so a polling transport failure cannot
   // finish the task before this test reaches the cancellation endpoint.
   const aborted=new Promise<void>(resolve=>{if(input.signal.aborted)resolve();else input.signal.addEventListener('abort',()=>resolve(),{once:true});});
   markRecorded();await aborted;
  }});}finally{markSettled();}
 }}}),server=runtime.app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const call=async(path:string,method='GET',body?:unknown)=>{const res=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}${path}`,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,data:await res.json()};};
 try{
  await call('/api/settings','PUT',config(upstream.url));const p=(await call('/api/bootstrap')).data.projects[0];
  const job=(await call('/api/jobs','POST',{projectId:p.id,kind:'character',requestId:'cancel-running'})).data.jobs[0];
  await Promise.race([recorded,settled.then(()=>{throw new Error('Generation ended before the cancellation boundary.');})]);
  assert.equal((await call(`/api/jobs/${job.id}`)).data.status,'running');
  const cancelled=(await call(`/api/jobs/${job.id}/cancel`,'POST',{})).data;assert.equal(cancelled.status,'unknown');assert.equal(cancelled.remoteTaskId,taskId);assert.match(cancelled.error,/仍在生成或计费/);
  await settled;const after=(await call(`/api/jobs/${job.id}`)).data;assert.equal(after.status,'unknown');assert.equal(after.remoteTaskId,taskId);assert.equal(after.error,cancelled.error);assert.equal(upstream.calls.filter(c=>c.url.endsWith('/run')).length,1);assert.ok(upstream.calls.every(c=>!c.url.endsWith('/cancel')));
  // A queued recovery already has a remote task; cancelling that queue is local-only too.
  const record=runtime.store.get<any>('jobs',job.id);record.job.status='queued';runtime.store.put('jobs',job.id,record);
  const queued=(await call(`/api/jobs/${job.id}/cancel`,'POST',{})).data;assert.equal(queued.status,'unknown');assert.match(queued.error,/远程任务/);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await runtime.close();await upstream.close();await rm(dir,{recursive:true,force:true});}
});
