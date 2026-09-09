import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, request } from 'node:http';
import { inflateRawSync } from 'node:zlib';
import sharp from 'sharp';
import { createApp, resolveAppPaths } from '../server/app.ts';

async function fixture(options: Record<string, unknown> = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'sticker-test-'));
  const runtime = createApp({ dataDir: dir, ...options });
  const server = runtime.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as {port: number}).port}`;
  const call = async (url: string, method = 'GET', body?: unknown, headers?: Record<string,string>) => {
    const response = await fetch(base + url, {method, headers:{'content-type':'application/json', ...headers}, body: body === undefined ? undefined : JSON.stringify(body)});
    return {response, data: response.headers.get('content-type')?.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer())};
  };
  return { ...runtime, dir, call, base, async dispose(){server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); await runtime.close(); await rm(dir, {recursive:true, force:true});} };
}
async function pixel() { return sharp({create:{width:64,height:64,channels:4,background:{r:255,g:120,b:180,alpha:0.4}}}).png().toBuffer(); }
async function upload(f:Awaited<ReturnType<typeof fixture>>) {return (await f.call('/api/assets','POST',{filename:'reference.png',dataUrl:'data:image/png;base64,'+(await pixel()).toString('base64')})).data;}
async function until(f:Awaited<ReturnType<typeof fixture>>, id:string) {for(let i=0;i<100;i++){const {data}=await f.call(`/api/jobs/${id}`); if(!['queued','running'].includes(data.status))return data;await new Promise(r=>setTimeout(r,20));} throw new Error('job timeout');}
function zipEntries(buffer:Buffer){const entries=new Map<string,Buffer>();const end=buffer.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));let cursor=buffer.readUInt32LE(end+16);const count=buffer.readUInt16LE(end+10);for(let i=0;i<count;i++){assert.equal(buffer.readUInt32LE(cursor),0x02014b50);const method=buffer.readUInt16LE(cursor+10),length=buffer.readUInt32LE(cursor+20),nameLength=buffer.readUInt16LE(cursor+28),extraLength=buffer.readUInt16LE(cursor+30),commentLength=buffer.readUInt16LE(cursor+32),local=buffer.readUInt32LE(cursor+42);const name=buffer.subarray(cursor+46,cursor+46+nameLength).toString();const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);const data=buffer.subarray(start,start+length);entries.set(name,method===8?inflateRawSync(data):data);cursor+=46+nameLength+extraLength+commentLength;}return entries;}

test('bootstrap, editable project, secret isolation and portable recipe', async()=>{
 const f=await fixture({autoStart:false});
 try {
  const {data:boot}=await f.call('/api/bootstrap'); assert.equal(boot.projects[0].character.name,'Margaret');
  const p=boot.projects[0]; const asset=await upload(f); assert.equal(asset.hasAlpha,true);
  const saved=(await f.call(`/api/projects/${p.id}`,'PUT',{...p,name:'我的表情',character:{...p.character,referenceAssetId:asset.id},id:'tampered'})).data;
  assert.equal(saved.id,p.id); assert.equal(saved.character.referenceAssetId,asset.id);
  const config={provider:'openai',baseUrl:'https://api.openai.com/v1',model:'gpt-image-1.5',apiKey:'fixture-secret',size:'1024x1024',concurrency:2};
  const safe=(await f.call('/api/settings','PUT',config)).data; assert.equal(safe.hasApiKey,true); assert.equal(safe.apiKey,undefined);
  const all=(await f.call('/api/bootstrap')).data; assert.ok(!JSON.stringify(all).includes('fixture-secret'));
  const recipe=(await f.call(`/api/projects/${p.id}/recipe`)).data;assert.equal(recipe.project.character.referenceAssetId,undefined);
  const restored=(await f.call('/api/projects/import','POST',{...recipe,project:{...recipe.project,character:{...recipe.project.character,referenceAssetId:asset.id}}})).data;
  assert.notEqual(restored.id,p.id);assert.equal(restored.character.referenceAssetId,undefined);
  const changed=(await f.call('/api/settings','PUT',{...safe,baseUrl:'https://example.com/v1'})).data;assert.equal(changed.hasApiKey,false);
 }finally{await f.dispose();}
});

test('rejects untrusted origins and host rebinding; token cookie protects assets', async()=>{
 const f=await fixture({token:'test-token'});
 try{
  assert.equal((await f.call('/api/bootstrap')).response.status,401);
  assert.equal((await f.call('/api/login','POST',{token:'test-token'},{origin:'https://evil.example'})).response.status,403);
  const rebound=await new Promise<number|undefined>((resolve,reject)=>{const req=request(f.base+'/api/health',{headers:{host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(rebound,403);
  const login=await f.call('/api/login','POST',{token:'test-token'});assert.equal(login.response.status,200);
  const cookie=login.response.headers.get('set-cookie')!.split(';')[0];assert.equal((await f.call('/api/bootstrap','GET',undefined,{cookie})).response.status,200);
  assert.equal((await f.call('/api/bootstrap','GET',undefined,{cookie,origin:'http://127.0.0.1:5178'})).response.status,200);
  assert.equal((await f.call('/assets-local/whatever.png')).response.status,401);
 }finally{await f.dispose();}
});

test('jobs require references, deduplicate request IDs and freeze config before edits', async()=>{
 const calls:{url:string;body:string;auth:string|undefined}[]=[];
 const bytes=await pixel();
 const provider=createServer(async(req,res)=>{let body='';for await(const x of req)body+=x;calls.push({url:req.url!,body,auth:req.headers.authorization});res.setHeader('content-type','application/json');res.end(JSON.stringify({data:[{b64_json:bytes.toString('base64')}]}));});
 await new Promise<void>(r=>provider.listen(0,'127.0.0.1',r));
 const f=await fixture({autoStart:false});
 try{
  const boot=(await f.call('/api/bootstrap')).data;const p=boot.projects[0];const reaction=boot.catalog.reactions[0];
  const config={provider:'openai',baseUrl:`http://127.0.0.1:${(provider.address() as {port:number}).port}/v1`,model:'fixture-model',apiKey:'fixture-key',size:'1024x1024',concurrency:2};
  await f.call('/api/settings','PUT',config);
  const body={projectId:p.id,kind:'sticker',reactionIds:[reaction.id],requestId:'batch-1'};
  assert.equal((await f.call('/api/jobs','POST',body)).response.status,400);
  const asset=await upload(f);await f.call(`/api/projects/${p.id}`,'PUT',{...p,character:{...p.character,referenceAssetId:asset.id}});
  const one=(await f.call('/api/jobs','POST',body)).data.jobs[0];const two=(await f.call('/api/jobs','POST',body)).data.jobs[0];assert.equal(one.id,two.id);
  assert.equal((await f.call('/api/jobs','POST',{...body,kind:'anchor'})).response.status,409);
  await f.call('/api/settings','PUT',{...config,model:'changed',apiKey:'changed'});
  f.start();const done=await until(f,one.id);assert.equal(done.status,'succeeded');assert.equal(calls.length,1);assert.equal(calls[0].url,'/v1/images/edits');assert.ok(calls[0].body.includes('name="model"\r\n\r\nfixture-model'));assert.ok(!calls[0].body.includes('name="model"\r\n\r\nchanged'));assert.equal(calls[0].auth,'Bearer fixture-key');
  const rendered=await f.call(`/api/jobs/${one.id}/render?size=256&caption=0`);const meta=await sharp(rendered.data).metadata();assert.equal(meta.width,256);assert.equal(meta.hasAlpha,true);
  const zip=await f.call(`/api/projects/${p.id}/export?captions=1&size=256`);assert.equal(zip.response.status,200);assert.equal(zip.data.subarray(0,2).toString(),'PK');
  const entries=zipEntries(zip.data);assert.ok([...entries.keys()].some(name=>name.startsWith('originals/')));assert.ok([...entries.keys()].some(name=>name.startsWith('captioned/')));assert.ok(entries.has('contact-sheet.png'));const packed=entries.get('recipe.json')!.toString();assert.ok(!packed.includes('fixture-key'));assert.ok(!packed.includes('apiKey'));assert.equal(JSON.parse(packed).project.character.referenceAssetId,undefined);assert.equal((await sharp(entries.get('contact-sheet.png')!).metadata()).width,256);
  const plain=zipEntries((await f.call(`/api/projects/${p.id}/export?captions=0&size=128`)).data);const resized=[...plain.entries()].filter(([name])=>name.startsWith('resized/'));assert.equal(resized.length,1);assert.equal((await sharp(resized[0][1]).metadata()).width,128);assert.equal((await sharp([...plain.entries()].find(([name])=>name.startsWith('originals/'))![1]).metadata()).width,64);assert.ok(![...plain.keys()].some(name=>name.startsWith('captioned/')));
 }finally{provider.closeAllConnections();await new Promise<void>(r=>provider.close(()=>r()));await f.dispose();}
});

test('queued cancellation and ambiguous failure never auto-retry', async()=>{
 let calls=0;const provider=createServer(async(req,res)=>{calls++;for await(const _ of req){}res.destroy();});await new Promise<void>(r=>provider.listen(0,'127.0.0.1',r));
 const f=await fixture({autoStart:false});
 try{
  const boot=(await f.call('/api/bootstrap')).data;const p=boot.projects[0];
  await f.call('/api/settings','PUT',{provider:'openai',baseUrl:`http://127.0.0.1:${(provider.address() as {port:number}).port}/v1`,model:'fake',apiKey:'fixture',size:'1024x1024',concurrency:1});
  const first=(await f.call('/api/jobs','POST',{projectId:p.id,kind:'character',requestId:'cancel-me'})).data.jobs[0];
  assert.equal((await f.call(`/api/jobs/${first.id}/cancel`,'POST',{})).data.status,'cancelled');
  const next=(await f.call('/api/jobs','POST',{projectId:p.id,kind:'character',requestId:'run-me'})).data.jobs[0];f.start();const result=await until(f,next.id);assert.equal(result.status,'unknown');assert.equal(calls,1);
  await new Promise(r=>setTimeout(r,50));assert.equal(calls,1);
  const retry=(await f.call(`/api/jobs/${next.id}/retry`,'POST',{requestId:'explicit-retry'})).data;assert.notEqual(retry.id,next.id);await until(f,retry.id);assert.equal(calls,2);
 }finally{provider.closeAllConnections();await new Promise<void>(r=>provider.close(()=>r()));await f.dispose();}
});

test('restart marks persisted running jobs unknown, preserves queued jobs and secrets stay private',async()=>{
 const f=await fixture({autoStart:false});
 try{
  const p=(await f.call('/api/bootstrap')).data.projects[0];await f.call('/api/settings','PUT',{provider:'openai',baseUrl:'https://api.openai.com/v1',model:'fixture',apiKey:'restart-secret',size:'1024x1024',concurrency:1});
  const first=(await f.call('/api/jobs','POST',{projectId:p.id,kind:'character',requestId:'interrupted'})).data.jobs[0];
  const second=(await f.call('/api/jobs','POST',{projectId:p.id,kind:'character',requestId:'queued'})).data.jobs[0];
  const record=f.store.get<any>('jobs',first.id);record.job.status='running';f.store.put('jobs',first.id,record);
  const resumed=createApp({dataDir:f.dir,autoStart:false});
  assert.equal(resumed.store.get<any>('jobs',first.id).job.status,'unknown');assert.equal(resumed.store.get<any>('jobs',second.id).job.status,'queued');await resumed.close();
  assert.ok(!JSON.stringify((await f.call('/api/bootstrap')).data).includes('restart-secret'));
 }finally{await f.dispose();}
});

test('invalid images, unsafe captions and empty exports are rejected before generation',async()=>{
 const f=await fixture({autoStart:false});
 try{
  const boot=(await f.call('/api/bootstrap')).data;const p=boot.projects[0];
  assert.equal((await f.call('/api/assets','POST',{filename:'x.png',dataUrl:'data:image/png;base64,YWJj'})).response.status,400);
  assert.equal((await f.call(`/api/projects/${p.id}`,'PUT',{captions:{[boot.catalog.reactions[0].id]:{text:'test',color:'url(x)',stroke:'#ffffff'}}})).response.status,400);
  assert.equal((await f.call(`/api/projects/${p.id}/export`)).response.status,409);
 }finally{await f.dispose();}
});

test('new anchor uses original reference; sticker retains original clothing and selected anchor',async()=>{
 const f=await fixture({autoStart:false});
 try{
  const boot=(await f.call('/api/bootstrap')).data;const p=boot.projects[0];const reference=await upload(f),anchor=await upload(f);
  await f.call(`/api/projects/${p.id}`,'PUT',{character:{...p.character,referenceAssetId:reference.id,anchorAssetId:anchor.id}});
  await f.call('/api/settings','PUT',{apiKey:'fixture'});
  const a=(await f.call('/api/jobs','POST',{projectId:p.id,kind:'anchor',requestId:'new-anchor'})).data.jobs[0];
  const b=(await f.call('/api/jobs','POST',{projectId:p.id,kind:'sticker',reactionIds:[boot.catalog.reactions[0].id],requestId:'new-sticker'})).data.jobs[0];
  assert.equal(f.store.get<any>('jobs',a.id).referenceId,reference.id);assert.equal(f.store.get<any>('jobs',a.id).secondaryReferenceId,undefined);
  assert.equal(f.store.get<any>('jobs',b.id).referenceId,reference.id);assert.equal(f.store.get<any>('jobs',b.id).secondaryReferenceId,anchor.id);
 }finally{await f.dispose();}
});

test('successful custom sticker remains renderable after its reaction is removed',async()=>{
 const f=await fixture({autoStart:false});
 try{
  const boot=(await f.call('/api/bootstrap')).data;const p=boot.projects[0];const asset=await upload(f);
  await f.call(`/api/projects/${p.id}`,'PUT',{customReactions:[{id:'mine',name:'我的表情',caption:'可爱！',category:'custom',action:'smile',emoji:'✨',tags:[]}],selectedIds:['mine']});
  const imported=(await f.call('/api/jobs/import','POST',{projectId:p.id,kind:'sticker',assetId:asset.id,reactionId:'mine'})).data;
  await f.call(`/api/projects/${p.id}`,'PUT',{customReactions:[],selectedIds:[]});
  assert.equal((await f.call(`/api/jobs/${imported.id}/render?caption=1`)).response.status,200);
 }finally{await f.dispose();}
});

test('production paths are rooted in the app package and SPA routes do not shadow APIs',async()=>{
 const packageRoot=fileURLToPath(new URL('../',import.meta.url));
 const previous=process.cwd();process.chdir(tmpdir());
 try{const paths=resolveAppPaths({},{});assert.equal(paths.frontendDir,join(packageRoot,'dist'));assert.equal(paths.dataDir,join(packageRoot,'data'));}finally{process.chdir(previous);}
 const customData=join(tmpdir(),'custom-studio-data');assert.equal(resolveAppPaths({dataDir:customData},{}).dataDir,customData);
 const web=await mkdtemp(join(tmpdir(),'sticker-web-'));await writeFile(join(web,'index.html'),'<!doctype html><title>Production fixture</title>');
 const f=await fixture({frontendDir:web});
 try{assert.match((await f.call('/')).data.toString(),/Production fixture/);assert.match((await f.call('/studio/nested')).data.toString(),/Production fixture/);assert.equal((await f.call('/api/nonexistent')).response.status,404);}finally{await f.dispose();await rm(web,{recursive:true,force:true});}
});

test('composition overrides and imported custom recipes persist; unknown compositions are rejected',async()=>{
 const f=await fixture({autoStart:false});
 try{
  const boot=(await f.call('/api/bootstrap')).data,p=boot.projects[0],id=boot.catalog.reactions[0].id;
  const saved=await f.call(`/api/projects/${p.id}`,'PUT',{overrides:{[id]:{compositionId:'fullbody'}}});
  assert.equal(saved.data.overrides[id].compositionId,'fullbody');
  const recipe=(await f.call(`/api/projects/${p.id}/recipe`)).data;
  assert.equal((await f.call('/api/projects/import','POST',recipe)).data.overrides[id].compositionId,'fullbody');
  assert.equal((await f.call(`/api/projects/${p.id}`,'PUT',{overrides:{[id]:{compositionId:'invented'}}})).response.status,400);
  assert.equal((await f.call('/api/projects/import','POST',{version:1,project:{customReactions:[{id:'mine',compositionId:'invented'}]}})).response.status,400);
 }finally{await f.dispose();}
});
