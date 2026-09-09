import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'public','fonts');
await mkdir(target,{recursive:true});
const fonts=[['zcoolkuaile','ZCOOLKuaiLe-Regular.ttf','ZCOOL KuaiLe'],['longcang','LongCang-Regular.ttf','Long Cang'],['zhimangxing','ZhiMangXing-Regular.ttf','Zhi Mang Xing']];
const manifest=[];
for(const [directory,filename,family] of fonts){
 const response=await fetch(`https://api.github.com/repos/google/fonts/commits?path=ofl/${directory}&per_page=1`,{headers:{'User-Agent':'Character-Sticker-Studio-font-bundler'},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Font revision lookup failed: ${response.status}`);
 const commits=await response.json(); const revision=commits[0]?.sha;
 if(!/^[a-f0-9]{40}$/.test(revision||''))throw new Error('Invalid font revision');
 const base=`https://raw.githubusercontent.com/google/fonts/${revision}/ofl/${directory}`;
 const [fontResponse,licenseResponse]=await Promise.all([fetch(`${base}/${filename}`,{signal:AbortSignal.timeout(20000)}),fetch(`${base}/OFL.txt`,{signal:AbortSignal.timeout(20000)})]);
 if(!fontResponse.ok||!licenseResponse.ok)throw new Error(`Font download failed for ${family}`);
 const bytes=Buffer.from(await fontResponse.arrayBuffer());const license=await licenseResponse.text();
 if(bytes.length<10000||bytes.length>20000000||!license.includes('SIL OPEN FONT LICENSE'))throw new Error('Font or license failed validation');
 await writeFile(path.join(target,filename),bytes);
 await writeFile(path.join(target,`${directory}-OFL.txt`),license);
 manifest.push({family,filename,revision,source:`${base}/${filename}`,license:`${base}/OFL.txt`,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
 console.log(`${family}: ${bytes.length} bytes`);
}
await writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
