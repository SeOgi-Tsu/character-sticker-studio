import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { Store } from '../server/store.ts';
import { Images } from '../server/images.ts';
import { captionStyles } from '../src/shared/typography.ts';
import type { Caption } from '../src/shared/types.ts';

const caption:Caption={enabled:true,mode:'overlay',text:'才没有呢！',color:'#fff080',stroke:'#382537',position:'bottom',fontSize:58};
async function fixture(){const dir=await mkdtemp(join(tmpdir(),'sticker-text-')),store=new Store(dir),images=new Images(store);const asset=await images.save(await sharp({create:{width:512,height:512,channels:4,background:'#a8dddb'}}).png().toBuffer(),'fixture');return {images,asset,async close(){store.close();await rm(dir,{recursive:true,force:true});}};}
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');

test('none, generated and embedded native lettering never receive a second caption',async()=>{
 const f=await fixture();try{const base=await f.images.render(f.asset,512);
  assert.ok((await f.images.render(f.asset,512,{...caption,mode:'none'})).equals(base));
  assert.ok((await f.images.render(f.asset,512,{...caption,mode:'generated'})).equals(base));
  assert.ok((await f.images.render(f.asset,512,caption,{embeddedText:true})).equals(base));
  assert.ok(!(await f.images.render(f.asset,512,caption)).equals(base));
 }finally{await f.close();}
});
test('all six styles produce distinct actual glyph rendering using bundled font files',async()=>{
 const f=await fixture();try{const hashes=new Set<string>(),seen=new Map<string,string>();
  for(const style of captionStyles){if(style.fontFile)assert.ok((await stat(new URL('../public/fonts/'+style.fontFile,import.meta.url))).size>10000);const digest=hash(await f.images.render(f.asset,512,{...caption,styleId:style.id}));assert.ok(!seen.has(digest),`${style.id} must differ from ${seen.get(digest)}`);seen.set(digest,style.id);hashes.add(digest);}
  assert.equal(hashes.size,6);
  // Different Chinese glyphs must not collapse into an identical missing-font box.
  for(const styleId of ['round','handwritten','brush'] as const){const one=await f.images.render(f.asset,512,{...caption,styleId,text:'我'});const two=await f.images.render(f.asset,512,{...caption,styleId,text:'你'});assert.notEqual(hash(one),hash(two),`${styleId} must have Chinese glyphs`);}
 }finally{await f.close();}
});
test('markup is escaped, Unicode line breaks wrap, all placements and bounded rotation fit exports',async()=>{
 const f=await fixture();try{const hashes=new Set<string>();
  for(const position of ['top','bottom','left','right'] as const){const data=await f.images.render(f.asset,256,{...caption,styleId:'handwritten',text:'你 < 我 & 好\n才没有！',position,rotation:20});const meta=await sharp(data).metadata();assert.equal(meta.width,256);assert.equal(meta.height,256);hashes.add(hash(data));}assert.equal(hashes.size,4);
  assert.equal((await sharp(await f.images.render(f.asset,128,{...caption,styleId:'bubble',text:'你好'.repeat(24),rotation:-20})).metadata()).width,128);
 }finally{await f.close();}
});
