import type { Express } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import archiver from 'archiver';
import type { Store } from './store.ts';
import { Images, exportName } from './images.ts';
import type { StoredJob } from './app.ts';
import type { Asset, Job, Project, ProviderSettings } from '../src/shared/types.ts';
import type { VideoWorkspace } from '../src/shared/video.ts';
import { defaultLoopWorkspace, loopDefaultSettings, type LoopWorkspace } from '../src/shared/loop.ts';

type Helpers={fail:(message:string,status?:number)=>never;getProject:(id:string)=>Project;saveBatch:(key:string,signature:string,records:StoredJob[])=>Job[];deduplicate:(key:string,signature:string)=>Job[]|undefined};
export function registerLoopRoutes(app:Express,store:Store,images:Images,{fail,getProject,saveBatch,deduplicate}:Helpers){
 const object=(v:any)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('需要 JSON 对象。');return v;};
 const text=(v:unknown,max=100)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail('文字字段为空或过长。');return v as string;};
 const id=(v:unknown)=>{const s=text(v);if(!/^[a-zA-Z0-9_-]+$/.test(s))fail('编号无效。');return s;};
 const seed=(v:unknown)=>{const s=text(v,20);if(!/^\d+$/.test(s)||BigInt(s)>18446744073709551615n)fail('种子需要 0–18446744073709551615 的整数字符串。');return s;};
 const reference=(v:unknown)=>{if(v===undefined)return;const value=id(v),asset=store.get<Asset>('assets',value);if(!asset||asset.format==='gif')fail('请选择静态角色母版。');return value;};
 const config=():ProviderSettings=>store.get('settings','loop')||structuredClone(loopDefaultSettings);
 const safe=()=>{const {apiKey,...rest}=config();return {...rest,hasApiKey:Boolean(apiKey)};};
 const workspace=(p:Project):LoopWorkspace=>store.get('loop-workspaces',p.id)||{...defaultLoopWorkspace(),masterAssetId:store.get<VideoWorkspace>('video-workspaces',p.id)?.masterAssetId||p.character.anchorAssetId||p.character.referenceAssetId};
 app.get('/api/loop/settings',(_req,res)=>res.json(safe()));
 app.put('/api/loop/settings',(req,res)=>{
  const b=object(req.body),old=config(),baseUrl=b.baseUrl??old.baseUrl;
  if(!['https://www.runninghub.ai','https://www.runninghub.cn'].includes(baseUrl))fail('请选择 RunningHub 官方站点。');
  if(b.apiKey!==undefined&&typeof b.apiKey!=='string')fail('密钥需要文字。');const supplied=b.apiKey===undefined?'':b.apiKey.trim();if(supplied.length>4096||/[\r\n]/.test(supplied))fail('密钥格式无效。');
  const next={...structuredClone(loopDefaultSettings),baseUrl,apiKey:b.clearApiKey?'':supplied||(baseUrl===old.baseUrl?old.apiKey:'')};
  store.put('settings','loop',next);res.json(safe());
 });
 app.get('/api/projects/:id/loop',(req,res)=>{const p=getProject(String(req.params.id));res.json(workspace(p));});
 app.put('/api/projects/:id/loop',(req,res)=>{
  const p=getProject(String(req.params.id)),old=workspace(p),b=object(req.body);
  if(b.version!==1||b.revision!==old.revision)fail('循环配方已在其他页面更改，请刷新后再保存。',409);
  if(!Array.isArray(b.recipes)||b.recipes.length<1||b.recipes.length>30)fail('支持 1–30 条循环配方。');
  const recipes=b.recipes.map((r:any)=>{object(r);if(typeof r.selected!=='boolean')fail('选择状态无效。');return {id:id(r.id),name:text(r.name),prompt:text(r.prompt,12000),seed:seed(r.seed),selected:r.selected};});
  if(new Set(recipes.map((r:any)=>r.id)).size!==recipes.length)fail('循环配方编号重复。');
  const next:LoopWorkspace={version:1,revision:old.revision+1,masterAssetId:reference(b.masterAssetId),recipes};store.put('loop-workspaces',p.id,next);res.json(next);
 });
 app.post('/api/projects/:id/loop/jobs',(req,res)=>{
  const p=getProject(String(req.params.id)),b=object(req.body),key=id(b.requestId);
  if(!Array.isArray(b.recipeIds)||!b.recipeIds.length||b.recipeIds.length>30)fail('请选择要生成的动作。');
  const recipeIds=b.recipeIds.map(id);if(new Set(recipeIds).size!==recipeIds.length)fail('动作编号重复。');
  if(!Number.isInteger(b.revision))fail('缺少配方修订号。');
  const signature=JSON.stringify({projectId:p.id,kind:'loop',revision:b.revision,recipeIds});
  const prior=deduplicate(key,signature);if(prior)return res.json({jobs:prior});
  const w=workspace(p);if(w.revision!==b.revision)fail('配方已更新，请刷新后生成。',409);
  const referenceId=reference(w.masterAssetId);if(!referenceId)fail('先上传或选择角色母版。');
  const settings=config();if(!settings.apiKey)fail('先配置循环 GIF 的 RunningHub 会员连接。');
  const recipes=recipeIds.map((rid:string)=>w.recipes.find(r=>r.id===rid)||fail('动作不存在。'));
  const records:StoredJob[]=recipes.map((r:any)=>{
   const snapshot=structuredClone(settings);snapshot.runninghub!.extraNodes=[{nodeId:'10',fieldName:'noise_seed',fieldValue:seed(r.seed)}];
   const date=new Date().toISOString();return {job:{id:randomUUID(),projectId:p.id,kind:'loop',reactionId:r.id,name:r.name,prompt:r.prompt,seed:r.seed,status:'queued',createdAt:date,updatedAt:date,provider:'runninghub',model:snapshot.model,textMode:'none'},settings:snapshot,referenceId};
  });res.status(201).json({jobs:saveBatch(key,signature,records)});
 });
 app.post('/api/projects/:id/loop/import',async(req,res)=>{
  const p=getProject(String(req.params.id)),b=object(req.body),name=text(b.name),key=id(b.requestId),rid=id(b.recipeId);
  const dataUrl=text(b.dataUrl,21*1024*1024),match=/^data:image\/gif;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);if(!match)fail('请选择 GIF 文件。');
  const bytes=Buffer.from(match![1],'base64');if(bytes.length>15*1024*1024)fail('导入 GIF 上限 15 MB。');
  const signature=JSON.stringify({projectId:p.id,kind:'loop-import',rid,name,hash:createHash('sha256').update(bytes).digest('hex')}),prior=deduplicate(key,signature);if(prior)return res.json(prior[0]);
  const prompt=typeof b.prompt==='string'?b.prompt.slice(0,12000):'外部生成 GIF，原始动画保留';
  let asset:Asset;try{asset=await images.saveGif(bytes,name+'.gif','用户导入循环 GIF');}catch(e){fail((e as Error).message);}
  // Recheck after asynchronous decoding: concurrent retries of the same request must not duplicate jobs.
  const duplicate=deduplicate(key,signature);if(duplicate)return res.json(duplicate[0]);
  const date=new Date().toISOString();const job:Job={id:randomUUID(),projectId:p.id,kind:'loop',reactionId:rid,name,prompt,status:'succeeded',asset:asset!,createdAt:date,updatedAt:date,provider:'imported',model:'GIF',textMode:'none'};
  res.status(201).json(saveBatch(key,signature,[{job}])[0]);
 });
 app.get('/api/projects/:id/loop/export',async(req,res)=>{
  const p=getProject(String(req.params.id)),latest=new Map<string,Job>();
  const size=req.query.size===undefined||req.query.size==='original'?'original':req.query.size==='256'?256:fail('GIF 整包支持 original 或 256。');
  for(const {job} of store.all<StoredJob>('jobs'))if(job.projectId===p.id&&job.kind==='loop'&&job.status==='succeeded'&&job.asset?.format==='gif')latest.set(job.reactionId||job.id,job);
  const jobs=[...latest.values()];if(!jobs.length)fail('还没有完成的 GIF。',409);
  res.type('zip').attachment('loop-gifs.zip');const archive=archiver('zip',{zlib:{level:1}});archive.on('error',()=>res.destroy());res.on('close',()=>{if(!res.writableEnded)archive.abort();});archive.pipe(res);
  try{for(const [i,j] of jobs.entries()){const name=`${String(i+1).padStart(2,'0')}-${exportName(j.name)}`;if(size==='original')archive.file(images.path(j.asset!.id),{name:name+'.gif'});else archive.append(await images.renderGif(j.asset!,size),{name:name+'.gif'});archive.append(j.prompt,{name:name+'-prompt.txt'});}
  archive.append(JSON.stringify({version:1,size,results:jobs.map(j=>({name:j.name,seed:j.seed,remoteTaskId:j.remoteTaskId,frames:j.asset!.frames,durationMs:j.asset!.durationMs,loop:j.asset!.loop}))},null,2),{name:'manifest.json'});await archive.finalize();}catch{archive.abort();res.destroy();}
 });
}
