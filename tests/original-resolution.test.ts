import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import sharp from 'sharp';
import { createApp } from '../server/app.ts';
import { Images } from '../server/images.ts';
import type { Caption } from '../src/shared/types.ts';

const caption:Caption={text:'好呀',enabled:true,mode:'overlay',styleId:'round',position:'bottom',fontSize:52,color:'#fff080',stroke:'#382537',rotation:0};
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),'sticker-original-resolution-')),runtime=createApp({dataDir:dir,autoStart:false}),images=new Images(runtime.store);
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:response.headers.get('content-type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer())};};
 const boot=(await call('/api/bootstrap')).data,project=boot.projects[0];
 const asset=async(width:number,height:number,alpha=255)=>{const pixels=Buffer.alloc(width*height*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=(i/4)%251;pixels[i+1]=83;pixels[i+2]=197;pixels[i+3]=alpha;}return images.save(await sharp(pixels,{raw:{width,height,channels:4}}).png().toBuffer(),'original-fixture.png');};
 return {...runtime,images,call,project,ids:boot.catalog.reactions.slice(0,3).map((r:{id:string})=>r.id),asset,async close(){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await runtime.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));await rm(dir,{recursive:true,force:true});}};
}
function zipEntries(buffer:Buffer){const entries=new Map<string,Buffer>();const end=buffer.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));let cursor=buffer.readUInt32LE(end+16);const count=buffer.readUInt16LE(end+10);for(let i=0;i<count;i++){const method=buffer.readUInt16LE(cursor+10),length=buffer.readUInt32LE(cursor+20),nameLength=buffer.readUInt16LE(cursor+28),extraLength=buffer.readUInt16LE(cursor+30),commentLength=buffer.readUInt16LE(cursor+32),local=buffer.readUInt32LE(cursor+42);const name=buffer.subarray(cursor+46,cursor+46+nameLength).toString();const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);const data=buffer.subarray(start,start+length);entries.set(name,method===8?inflateRawSync(data):data);cursor+=46+nameLength+extraLength+commentLength;}return entries;}

test('default and explicit original preserve rectangular stored PNG bytes for every inactive overlay path',async()=>{
 const f=await fixture();try{for(const [width,height]of [[911,617],[617,911]]){const asset=await f.asset(width,height,123),stored=await f.images.load(asset.id);assert.ok((await f.images.render(asset)).equals(stored));for(const text of [undefined,{...caption,enabled:false},{...caption,mode:'none' as const},{...caption,mode:'generated' as const},{...caption,text:' \n '},{...caption,text:'\u0000\u0007'}])assert.ok((await f.images.render(asset,'original',text)).equals(stored));assert.ok((await f.images.render(asset,'original',caption,{embeddedText:true})).equals(stored));const meta=await sharp(await f.images.render(asset)).metadata();assert.equal(meta.width,width);assert.equal(meta.height,height);}}finally{await f.close();}
});

test('original typography uses the short dimension and actual rectangular placement without changing untouched pixels',async()=>{
 const f=await fixture();try{
  const bounds:{width:number;height:number}[]=[];
  for(const [width,height]of [[1200,800],[800,1200]]){
   const asset=await f.asset(width,height,123),stored=await f.images.load(asset.id);
   for(const styleId of ['classic','round','bubble'] as const){for(const position of ['bottom','right'] as const){const result=await f.images.render(asset,'original',{...caption,styleId,position});const meta=await sharp(result).metadata();assert.equal(meta.width,width);assert.equal(meta.height,height);assert.ok(!result.equals(stored));const sourceCorner=await sharp(stored).extract({left:0,top:0,width:24,height:24}).raw().toBuffer();const resultCorner=await sharp(result).extract({left:0,top:0,width:24,height:24}).raw().toBuffer();assert.ok(resultCorner.equals(sourceCorner),`${styleId}/${position}: original non-text pixels must remain exact`);}}
   const solid=await f.asset(width,height);const before=await sharp(await f.images.load(solid.id)).ensureAlpha().raw().toBuffer();const after=await sharp(await f.images.render(solid,'original',caption)).ensureAlpha().raw().toBuffer();let minX=width,minY=height,maxX=-1,maxY=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4;if(before[p]===after[p]&&before[p+1]===after[p+1]&&before[p+2]===after[p+2]&&before[p+3]===after[p+3])continue;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}assert.ok(minY>height*.55);assert.ok(Math.abs((minX+maxX)/2-width/2)<4);bounds.push({width:maxX-minX+1,height:maxY-minY+1});
  }
  assert.deepEqual(bounds[0],bounds[1],'the same short edge must produce the same glyph scale');
 }finally{await f.close();}
});

test('single PNG API defaults to original, retains explicit numeric squares and rejects invalid sizes',async()=>{
 const f=await fixture();try{const asset=await f.asset(917,613),stored=await f.images.load(asset.id);const job=(await f.call('/api/jobs/import','POST',{projectId:f.project.id,kind:'sticker',reactionId:f.ids[0],assetId:asset.id,textMode:'generated',generatedText:'原生'})).data;
  for(const query of ['','?size=original','?caption=0']){const response=await f.call(`/api/jobs/${job.id}/render${query}`);assert.equal(response.status,200);assert.ok(response.data.equals(stored));}
  for(const size of [128,256,512,1024]){const response=await f.call(`/api/jobs/${job.id}/render?size=${size}`);assert.equal(response.status,200);const meta=await sharp(response.data).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);}
  for(const size of ['', '0','abc','2048','512.0','original&size=512'])assert.equal((await f.call(`/api/jobs/${job.id}/render?size=${size}`)).status,400,size);
 }finally{await f.close();}
});

test('original ZIP contains exact originals and optional native-size captions with source dimensions and no duplicate resized folder',async()=>{
 const f=await fixture();try{
  const assets=[await f.asset(917,613),await f.asset(613,917),await f.asset(821,633)];
  for(let i=0;i<assets.length;i++)await f.call('/api/jobs/import','POST',{projectId:f.project.id,kind:'sticker',reactionId:f.ids[i],name:`fixture-${i}`,assetId:assets[i].id,textMode:i===1?'generated':'overlay',...(i===1?{generatedText:'已画好'}:{})});
  await f.call(`/api/projects/${f.project.id}`,'PUT',{captions:{[f.ids[0]]:caption,[f.ids[1]]:caption,[f.ids[2]]:{...caption,mode:'none'}}});
  const response=await f.call(`/api/projects/${f.project.id}/export?captions=1`);assert.equal(response.status,200);const entries=zipEntries(response.data);assert.ok(![...entries.keys()].some(name=>name.startsWith('resized/')));assert.equal([...entries.keys()].filter(name=>name.startsWith('originals/')).length,3);assert.equal([...entries.keys()].filter(name=>name.startsWith('captioned/')).length,3);assert.ok(entries.has('contact-sheet.png'));
  const recipe=JSON.parse(entries.get('recipe.json')!.toString());assert.deepEqual(recipe.export,{size:'original',originalResolution:true});assert.equal(recipe.results.length,3);
  for(let i=0;i<assets.length;i++){const suffix=`${String(i+1).padStart(2,'0')}-fixture-${i}.png`,original=entries.get('originals/'+suffix)!,rendered=entries.get('captioned/'+suffix)!;assert.ok(original.equals(await f.images.load(assets[i].id)));const meta=await sharp(rendered).metadata();assert.equal(meta.width,assets[i].width);assert.equal(meta.height,assets[i].height);assert.equal(recipe.results[i].width,assets[i].width);assert.equal(recipe.results[i].height,assets[i].height);if(i>0)assert.ok(rendered.equals(original),'native and disabled lettering stay byte-identical');}
  assert.equal((await f.call('/api/projects/import','POST',recipe)).status,201);
  const plain=zipEntries((await f.call(`/api/projects/${f.project.id}/export`)).data);assert.ok(![...plain.keys()].some(name=>name.startsWith('captioned/')||name.startsWith('resized/')));
  const small=zipEntries((await f.call(`/api/projects/${f.project.id}/export?size=512&captions=1`)).data);assert.equal([...small.keys()].filter(name=>name.startsWith('resized/')).length,3);assert.deepEqual(JSON.parse(small.get('recipe.json')!.toString()).export,{size:512,originalResolution:false});for(const [name,data]of small)if(name.startsWith('resized/')||name.startsWith('captioned/'))assert.equal((await sharp(data).metadata()).width,512);
  assert.equal((await f.call(`/api/projects/${f.project.id}/export?size=bad`)).status,400);
 }finally{await f.close();}
});
