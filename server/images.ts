import sharp, { type Metadata, type OverlayOptions } from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Asset, Caption } from '../src/shared/types.ts';
import { captionStyles, resolveCaptionMode } from '../src/shared/typography.ts';
import type { Store } from './store.ts';

export const escapeXml=(text:string)=>text.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export function exportName(value:string) {return value.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/^\.+/,'').slice(0,70)||'sticker';}
const transparent={r:0,g:0,b:0,alpha:0};
const fontDirectory=fileURLToPath(new URL('../public/fonts/',import.meta.url));
export interface RenderOptions { embeddedText?:boolean; }
function expandAlpha(source:Buffer,width:number,height:number,radius:number){
 // A circular maximum filter keeps antialiasing and grows white alpha outward.
 // Sharp 0.35's dilate treats black as foreground, so it cannot consume this mask directly.
 const result=Buffer.alloc(source.length),offsets:{x:number;y:number}[]=[];
 for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++)if(x*x+y*y<=radius*radius)offsets.push({x,y});
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const value=source[y*width+x];if(!value)continue;for(const offset of offsets){const xx=x+offset.x,yy=y+offset.y;if(xx<0||xx>=width||yy<0||yy>=height)continue;const index=yy*width+xx;if(value>result[index])result[index]=value;}}
 return result;
}

/** Pango loads each bundled font explicitly. SVG font-family alone cannot load a TTF. */
async function captionLayer(caption:Caption,size:number){
 const style=captionStyles.find(s=>s.id===caption.styleId)||captionStyles[0];
 const side=caption.position==='left'||caption.position==='right';
 const text=Array.from(caption.text.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'')).slice(0,48).join('');
 const fontSize=Math.max(12,Math.min(Number(caption.fontSize)||52,120))*size/512;
 const maxWidth=Math.round(size*(side?.32:.86)),maxHeight=Math.round(size*(side?.76:.43));
 const stroke=Math.max(1,Math.round(fontSize*(style.id==='handwritten'?.055:style.id==='brush'?.065:style.id==='bubble'?.02:.105)));
 const padding=Math.max(5,Math.ceil(fontSize*.22))+stroke;
 const color=/^#[\da-f]{6}$/i.test(caption.color)?caption.color:'#ffffff';
 const outline=/^#[\da-f]{6}$/i.test(caption.stroke)?caption.stroke:'#382537';
 const glyph=await sharp({text:{text:`<span foreground="${color}">${escapeXml(text)}</span>`,font:`${style.id==='classic'?'sans-serif Bold':style.fontFamily} ${fontSize}`,fontfile:style.fontFile?join(fontDirectory,style.fontFile):undefined,width:Math.max(10,maxWidth-padding*2),wrap:'word-char',align:'centre',spacing:Math.round(fontSize*.08),rgba:true,dpi:72}}).extend({top:padding,bottom:padding,left:padding,right:padding,background:transparent}).png().toBuffer();
 const meta=await sharp(glyph).metadata(),width=meta.width!,height=meta.height!;
 const alpha=expandAlpha(await sharp(glyph).extractChannel('alpha').raw().toBuffer(),width,height,stroke);
 const coloredMask=async(fill:string)=>sharp({create:{width,height,channels:3,background:fill}}).joinChannel(alpha,{raw:{width,height,channels:1}}).png().toBuffer();
 const layers:OverlayOptions[]=[];
 if(style.id==='bubble'){
  const border=Math.max(1.5,size*.005),radius=Math.min(height*.3,size*.055),tail=Math.min(size*.025,padding*.8);
  layers.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="${border}" y="${border}" width="${width-border*2}" height="${height-tail-border*2}" rx="${radius}" fill="#fffaf0" stroke="#563544" stroke-width="${border}"/><path d="M ${width*.65} ${height-tail-border} l ${tail} ${tail} l ${tail*.3} -${tail}" fill="#fffaf0" stroke="#563544" stroke-width="${border}" stroke-linejoin="round"/></svg>`)});
 }
 if(style.id==='comic'){
  const offset=Math.max(2,Math.round(fontSize*.07));
  const shadow=await sharp(await coloredMask('#f18bb3')).extract({left:0,top:0,width:width-offset,height:height-offset}).png().toBuffer();
  layers.push({input:shadow,left:offset,top:offset});
 }
 if(style.id!=='bubble')layers.push({input:await coloredMask(outline)});
 layers.push({input:glyph});
 const composed=await sharp({create:{width,height,channels:4,background:transparent}}).composite(layers).png().toBuffer();
 const rotation=Math.max(-20,Math.min(20,Number(caption.rotation)||0));
 const rotated=rotation?await sharp(composed).rotate(rotation,{background:transparent}).png().toBuffer():composed;
 return sharp(rotated).resize(maxWidth,maxHeight,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
}
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
 async render(asset:Asset,size:number,caption?:Caption,options:RenderOptions={}) {
  const input=await this.load(asset.id);
  const base=await sharp(input).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  if(options.embeddedText||!caption||resolveCaptionMode(caption)!=='overlay'||!caption.text.trim())return base;
  // Preserve the appearance of already-saved classic single-line captions.
  if((caption.styleId===undefined||caption.styleId==='classic')&&!caption.rotation&&!/[\r\n]/.test(caption.text)&&!['left','right'].includes(caption.position)){
  const text=Array.from(caption.text).slice(0,48).join('');
  const count=Array.from(text).reduce((sum,ch)=>sum+(ch.charCodeAt(0)>255?1:0.58),0);
  const fontSize=Math.max(12,Math.min(caption.fontSize*size/512,size*.84/Math.max(1,count),size*.16));
  const y=caption.position==='top'?fontSize+size*.045:size-size*.065;
  const svg=`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="${y}" text-anchor="middle" font-family="Noto Sans CJK SC,Microsoft YaHei,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="${caption.color}" stroke="${caption.stroke}" stroke-width="${Math.max(2,fontSize*.14)}" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text></svg>`;
  return sharp(base).composite([{input:Buffer.from(svg)}]).png().toBuffer();
  }
  const layer=await captionLayer(caption,size),meta=await sharp(layer).metadata(),margin=Math.round(size*.035);
  const left=caption.position==='left'?margin:caption.position==='right'?size-meta.width!-margin:Math.round((size-meta.width!)/2);
  const top=caption.position==='top'?margin:caption.position==='bottom'?size-meta.height!-margin:Math.round((size-meta.height!)/2);
  return sharp(base).composite([{input:layer,left:Math.max(0,left),top:Math.max(0,top)}]).png().toBuffer();
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
