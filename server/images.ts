import sharp, { type Metadata, type OverlayOptions } from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Asset, Caption } from '../src/shared/types.ts';
import type { Store } from './store.ts';

export const escapeXml=(text:string)=>text.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export function exportName(value:string) {return value.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/^\.+/,'').slice(0,70)||'sticker';}
export class Images {
 readonly directory:string;
 constructor(readonly store:Store){this.directory=join(store.dataDir,'assets');mkdirSync(this.directory,{recursive:true,mode:0o700});}
 path(id:string){if(!/^[\da-f-]{36}$/.test(id))throw new Error('图片编号无效。');return join(this.directory,`${id}.png`);}
 async load(id:string){if(!this.store.get<Asset>('assets',id))throw new Error('找不到参考图，请重新上传。');return readFile(this.path(id));}
 async save(buffer:Buffer,filename:string,provenance?:string):Promise<Asset>{
  if(buffer.length>40*1024*1024)throw new Error('图片太大，请使用 40 MB 以内的图片。');
  let data:Buffer,meta:Metadata;
  try{meta=await sharp(buffer,{limitInputPixels:40_000_000,animated:false}).metadata();if(!['png','jpeg','webp','avif','gif'].includes(meta.format||''))throw new Error('format');data=await sharp(buffer,{limitInputPixels:40_000_000,animated:false}).rotate().png().toBuffer();meta=await sharp(data).metadata();}catch{throw new Error('图片无法读取，请上传 PNG、JPEG、WebP、AVIF 或 GIF 静态首帧。');}
  const id=randomUUID();await writeFile(this.path(id),data,{mode:0o600});
  const asset:Asset={id,url:`/assets-local/${id}.png`,filename:exportName(filename),width:meta.width!,height:meta.height!,hasAlpha:meta.hasAlpha===true,...(provenance?{provenance}: {})};
  this.store.put('assets',id,asset);return asset;
 }
 async render(asset:Asset,size:number,caption?:Caption) {
  const input=await this.load(asset.id);
  const base=await sharp(input).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  if(!caption?.enabled||!caption.text.trim())return base;
  const text=Array.from(caption.text).slice(0,48).join('');
  const count=Array.from(text).reduce((sum,ch)=>sum+(ch.charCodeAt(0)>255?1:0.58),0);
  const fontSize=Math.max(12,Math.min(caption.fontSize*size/512,size*.84/Math.max(1,count),size*.16));
  const y=caption.position==='top'?fontSize+size*.045:size-size*.065;
  const svg=`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="${y}" text-anchor="middle" font-family="Noto Sans CJK SC,Microsoft YaHei,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="${caption.color}" stroke="${caption.stroke}" stroke-width="${Math.max(2,fontSize*.14)}" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text></svg>`;
  return sharp(base).composite([{input:Buffer.from(svg)}]).png().toBuffer();
 }
 async contactSheet(buffers:Buffer[],names:string[]) {
  const columns=Math.min(4,buffers.length);const rows=Math.ceil(buffers.length/columns);const tile=256;const height=292;
  const composites:OverlayOptions[]=[];
  for(let i=0;i<buffers.length;i++){
   const left=(i%columns)*tile,top=Math.floor(i/columns)*height;
   composites.push({input:await sharp(buffers[i]).resize(224,224,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),left:left+16,top:top+12});
   composites.push({input:Buffer.from(`<svg width="256" height="40" xmlns="http://www.w3.org/2000/svg"><text x="128" y="25" text-anchor="middle" font-family="Noto Sans CJK SC,Microsoft YaHei,sans-serif" font-size="18" fill="#4e3e47">${escapeXml(names[i].slice(0,16))}</text></svg>`),left,top:top+242});
  }
  return sharp({create:{width:columns*tile,height:rows*height,channels:4,background:'#fff8fb'}}).composite(composites).png().toBuffer();
 }
}
