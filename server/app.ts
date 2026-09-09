import express, { type Request, type Response, type NextFunction } from 'express';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import archiver from 'archiver';
import { catalog } from '../src/shared/catalog.ts';
import { buildAnchorPrompt, buildCharacterPrompt, buildStickerPrompt } from '../src/shared/prompts.ts';
import { captionStyles, defaultCaptionFor, resolveCaptionMode } from '../src/shared/typography.ts';
import type { Asset, Caption, Character, Job, Project, ProviderSettings, Reaction } from '../src/shared/types.ts';
import { Store } from './store.ts';
import { Images, exportName } from './images.ts';
import { CloudImageProvider, normalizeBaseUrl, ProviderError, validateRunningHubSettings, type ImageProvider } from './provider.ts';

class HttpError extends Error {constructor(readonly status:number,message:string){super(message);}}
const fail=(message:string,status=400):never=>{throw new HttpError(status,message);};
const now=()=>new Date().toISOString();
const object=(value:unknown):Record<string,any>=>{if(!value||typeof value!=='object'||Array.isArray(value))fail('请求格式无效。');return value as Record<string,any>;};
function text(value:unknown,fallback='',max=4000){if(value===undefined)return fallback;if(typeof value!=='string'||value.length>max)fail(`文字格式无效或超过 ${max} 字。`);return value as string;}
function idText(value:unknown){const id=text(value,'',100);if(!/^[a-zA-Z0-9_-]+$/.test(id))fail('编号格式无效。');return id;}
function requestId(value:unknown){return idText(value);}
function stringArray(value:unknown,max=200){if(!Array.isArray(value)||value.length>max||value.some(v=>typeof v!=='string'||v.length>100))fail('选项列表格式无效。');return [...new Set(value as string[])];}
function safeSettings(config:ProviderSettings):ProviderSettings{const {apiKey,...safe}=config;return {...safe,hasApiKey:Boolean(apiKey)};}
const defaults:ProviderSettings={provider:'openai',baseUrl:'https://api.openai.com/v1',model:'gpt-image-2',size:'1024x1024',concurrency:2};
interface StoredJob { job:Job; settings?:ProviderSettings; referenceId?:string; secondaryReferenceId?:string; captionText?:string; }
interface Dedup { signature:string; ids:string[]; }
export interface AppOptions {dataDir?:string;frontendDir?:string;token?:string;allowedOrigins?:string[];allowedHosts?:string[];autoStart?:boolean;provider?:ImageProvider;}

/** Defaults follow the distributable package, even when launched from another directory. */
export function resolveAppPaths(options: Pick<AppOptions, 'dataDir' | 'frontendDir'> = {}, environment: NodeJS.ProcessEnv = process.env) {
 const packageRoot = fileURLToPath(new URL('../', import.meta.url));
 return {
  dataDir: resolve(options.dataDir || environment.STUDIO_DATA_DIR || environment.DATA_DIR || join(packageRoot, 'data')),
  frontendDir: resolve(options.frontendDir || join(packageRoot, 'dist')),
 };
}

export function createApp(options:AppOptions={}) {
 const paths=resolveAppPaths(options);
 const store=new Store(paths.dataDir);
 const images=new Images(store);const provider=options.provider||new CloudImageProvider();const app=express();
 const token=options.token??process.env.STUDIO_TOKEN??'';
 const origins=new Set(options.allowedOrigins||['http://127.0.0.1:4317','http://localhost:4317','http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:5178','http://localhost:5178']);
 const hosts=new Set(['127.0.0.1','localhost','[::1]',...(options.allowedHosts||[])]);
 const cookieValue=createHash('sha256').update(`sticker-studio-session:${token}`).digest('hex');
 const matches=(a:string,b:string)=>{const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);};
 app.disable('x-powered-by');
 app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  let hostname:string;try{hostname=new URL(`http://${req.headers.host||''}`).hostname;}catch{return next(new HttpError(403,'Host 无效。'));}
  if(!hosts.has(hostname))return next(new HttpError(403,'此 Host 未获允许。请配置 STUDIO_ALLOWED_HOSTS。'));
  const origin=req.get('origin');
  if(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`&&!origins.has(origin))return next(new HttpError(403,'此网页来源未获允许。请从工坊页面操作。'));
  if(req.get('sec-fetch-site')==='cross-site')return next(new HttpError(403,'已拒绝跨站请求。'));
  next();
 });
 app.use(express.json({limit:'22mb'}));
 app.post('/api/login',(req,res)=>{if(token&&!matches(text(req.body?.token,'',1000),token))return res.status(401).json({error:'访问口令不正确。'});res.cookie('studio_session',cookieValue,{httpOnly:true,sameSite:'strict',secure:req.secure,maxAge:7*24*60*60*1000,path:'/'});res.json({ok:true});});
 app.use((req,res,next)=>{
  if(!req.path.startsWith('/api/')&&!req.path.startsWith('/assets-local/'))return next();
  res.setHeader('Cache-Control','no-store');
  if(!token)return next();
  const bearer=req.get('authorization')?.replace(/^Bearer /,'')||'';
  const cookie=req.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('studio_session='))?.slice(15)||'';
  if(!matches(bearer,token)&&!matches(cookie,cookieValue))return res.status(401).json({error:'需要访问口令，请先登录。'});next();
 });
 const settings=()=>store.get<ProviderSettings>('settings','provider')||defaults;
 const getProject=(id:string)=>store.get<Project>('projects',id)||fail('项目不存在。',404);
 const getStoredJob=(id:string)=>store.get<StoredJob>('jobs',id)||fail('任务不存在。',404);
 const getJobs=()=>store.all<StoredJob>('jobs').map(record=>record.job);
 const getReaction=(project:Project,id:string):Reaction=>{const reaction=[...catalog.reactions,...project.customReactions].find(r=>r.id===id);if(!reaction)fail('表情选项不存在，请刷新后重试。');return {...reaction!,...project.overrides[id],id};};
 function validateCharacter(input:unknown,stripAssets=false):Character{
  const c=object(input);const outfitMode=c.outfitMode===undefined?'reference':c.outfitMode;
  if(!['reference','custom'].includes(outfitMode))fail('服装依据需要选择沿用原图服装或按文字换装。');
  const result:Character={name:text(c.name,'新角色',100),description:text(c.description),identity:text(c.identity),outfit:text(c.outfit),personality:text(c.personality),outfitMode};
  if(c.memePersona!==undefined)result.memePersona=text(c.memePersona,'',1200);
  if(c.signatureMotifs!==undefined)result.signatureMotifs=text(c.signatureMotifs,'',400);
  if(!stripAssets)for(const field of ['referenceAssetId','anchorAssetId'] as const){if(c[field]){const id=idText(c[field]);if(!store.get<Asset>('assets',id))fail('找不到角色参考图，请重新上传。');result[field]=id;}}
  return result;
 }
 function validateReaction(value:unknown,partial=false):Reaction|Partial<Reaction>{
  const r=object(value),result:Record<string,unknown>={};
  for(const field of ['name','caption','category','action','emoji']) {
   if(!partial||r[field]!==undefined)result[field]=text(r[field],'',field==='action'?3000:100);
  }
  if(r.compositionId!==undefined){
   if(!catalog.compositions.some(c=>c.id===r.compositionId))fail('构图不存在，请选择已有构图。');
   result.compositionId=r.compositionId;
  }
  if(r.interactionId!==undefined){
   if(!catalog.interactions.some(item=>item.id===r.interactionId))fail('互动方式不存在，请选择已有方式。');
   result.interactionId=r.interactionId;
  }
  if(r.intensity!==undefined){
   if(typeof r.intensity!=='number'||!Number.isInteger(r.intensity)||r.intensity<1||r.intensity>3)fail('张力强度需要选择 1、2 或 3。');
   result.intensity=r.intensity;
  }
  if(r.intent!==undefined)result.intent=text(r.intent,'',160);
  if(r.textMode!==undefined){if(!['none','overlay','generated'].includes(r.textMode))fail('文字方式无效。');result.textMode=r.textMode;}
  if(r.captionStyleId!==undefined){if(!captionStyles.some(s=>s.id===r.captionStyleId))fail('文字风格不存在。');result.captionStyleId=r.captionStyleId;}
  if(r.miniScene!==undefined){
   const scene=object(r.miniScene);
   if(typeof scene.enabled!=='boolean')fail('小剧场开关需要为布尔值。');
   if(['setup','reveal','prop'].some(field=>typeof scene[field]!=='string'))fail('小剧场的情境、反差和道具需要填写文字，可留空。');
   result.miniScene={enabled:scene.enabled,setup:text(scene.setup,'',240),reveal:text(scene.reveal,'',240),prop:text(scene.prop,'',160)};
  }
  if(!partial){result.id=idText(r.id);result.tags=r.tags?stringArray(r.tags,20):[];}
  return result;
 }
 function captionText(value:unknown){const result=text(value,'',96);if(Array.from(result).length>48)fail('表情文字最多 48 字（含换行）。');return result;}
 function validateCaption(input:unknown):Caption{
  const c=object(input),color=text(c.color,'#ffffff',7),stroke=text(c.stroke,'#3b2332',7);
  if(!/^#[0-9a-fA-F]{6}$/.test(color)||!/^#[0-9a-fA-F]{6}$/.test(stroke))fail('文字颜色需要六位十六进制色值。');
  const fontSize=Number(c.fontSize??52);if(!Number.isFinite(fontSize)||fontSize<12||fontSize>120)fail('字号范围为 12–120。');
  if(c.enabled!==undefined&&typeof c.enabled!=='boolean')fail('文字开关需要为布尔值。');
  if(c.mode!==undefined&&!['none','overlay','generated'].includes(c.mode))fail('文字方式无效。');
  if(c.styleId!==undefined&&!captionStyles.some(style=>style.id===c.styleId))fail('文字风格不存在。');
  if(c.position!==undefined&&!['top','bottom','left','right'].includes(c.position))fail('文字位置需要选择上、下、左或右。');
  if(c.rotation!==undefined&&(typeof c.rotation!=='number'||!Number.isFinite(c.rotation)||c.rotation< -20||c.rotation>20))fail('文字旋转范围为 -20° 到 20°。');
  return {text:captionText(c.text),enabled:c.enabled!==false,color,stroke,position:c.position??'bottom',fontSize,...(c.mode!==undefined?{mode:c.mode}:{}),...(c.styleId!==undefined?{styleId:c.styleId}:{}),...(c.rotation!==undefined?{rotation:c.rotation}:{})};
 }
 function validateProject(input:unknown,prior?:Project,stripAssets=false):Project{
  const p=object(input);const base=prior||newProject();
  const styleId=text(p.styleId,base.styleId,100);if(!catalog.styles.some(s=>s.id===styleId))fail('风格不存在。');
  const customInput=p.customReactions??base.customReactions;if(!Array.isArray(customInput)||customInput.length>64)fail('自定义表情最多 64 个。');
  const customReactions=(customInput as unknown[]).map(r=>validateReaction(r) as Reaction);const known=new Set(catalog.reactions.map(r=>r.id));for(const reaction of customReactions){if(known.has(reaction.id))fail('自定义表情编号重复。');known.add(reaction.id);}
  const selectedIds=p.selectedIds===undefined?base.selectedIds:stringArray(p.selectedIds);if(selectedIds.some(id=>!known.has(id)))fail('选中的表情不存在。');
  const overrides:Project['overrides']=Object.create(null);for(const [id,value] of Object.entries(object(p.overrides??base.overrides))){if(!known.has(id))continue;overrides[id]=validateReaction(value,true);}
  const captions:Project['captions']=Object.create(null);for(const [id,value] of Object.entries(object(p.captions??base.captions))){if(!known.has(id))continue;captions[id]=validateCaption(value);}
  return {...base,name:text(p.name,base.name,100),character:p.character===undefined?base.character:validateCharacter(p.character,stripAssets),styleId,selectedIds,customReactions,overrides,captions,updatedAt:now()};
 }
 function newProject():Project{const date=now();return {id:randomUUID(),name:'Margaret 的表情工坊',character:{name:'Margaret',description:'可爱、亲近、有一点小傲娇的虚拟角色',identity:'浅金色双马尾，红色眼睛，黑色蝴蝶结，金色心形饰件',outfit:'保留参考图中的服装剪影、配色和饰件',outfitMode:'reference',personality:'软萌、活泼，情绪表达鲜明'},styleId:catalog.styles[0].id,selectedIds:catalog.packs[0]?.reactionIds||catalog.reactions.slice(0,24).map(r=>r.id),customReactions:[],overrides:{},captions:{},createdAt:date,updatedAt:date};}
 if(store.all('projects').length===0){const initial=newProject();store.put('projects',initial.id,initial);}
 for(const record of store.all<StoredJob>('jobs'))if(record.job.status==='running'||(record.job.status==='unknown'&&record.job.provider==='runninghub'&&record.job.remoteTaskId)){
  const recoverable=record.job.provider==='runninghub'&&Boolean(record.job.remoteTaskId);
  record.job.status=recoverable?'queued':'unknown';record.job.error=recoverable?'应用重启，将仅恢复远程任务查询。':'应用在生成过程中停止。提交结果不明，请先核对服务商记录，再决定是否重试。';record.job.updatedAt=now();store.put('jobs',record.job.id,record);
 }
 let started=options.autoStart!==false,closing=false;const active=new Map<string,AbortController>();const operations=new Set<Promise<void>>();
 function updateJob(record:StoredJob,patch:Partial<Job>){record.job={...record.job,...patch,updatedAt:now()};store.put('jobs',record.job.id,record);return record.job;}
 async function run(record:StoredJob,controller:AbortController){
  try{
   if(!record.settings?.apiKey)throw new ProviderError('队列中的接口配置不完整，请重新配置后手动重试。');
   const reference=record.referenceId&&!record.job.remoteTaskId?await images.load(record.referenceId):undefined;
   const secondaryReference=record.secondaryReferenceId&&!record.job.remoteTaskId&&!(record.settings.provider==='runninghub'&&!record.settings.runninghub?.styleReferenceNode)?await images.load(record.secondaryReferenceId):undefined;
   if(controller.signal.aborted)return;
   const result=await provider.generate({settings:record.settings,prompt:record.job.prompt,reference,secondaryReference,signal:controller.signal,remoteTaskId:record.job.remoteTaskId,onRemoteTaskId:id=>{
    // Cancellation and persistence may race with the submit response: keep the latest status.
    record.job=getStoredJob(record.job.id).job;
    updateJob(record,{remoteTaskId:id});
   }});
   if(controller.signal.aborted)return;
   const asset=await images.save(result,`${record.job.name}.png`,`${record.job.provider} / ${record.job.model}`);
   if(controller.signal.aborted)return;
   updateJob(record,{status:'succeeded',asset,error:undefined});
  }catch(error){
   if(!controller.signal.aborted){const uncertain=error instanceof ProviderError?error.uncertain:true;updateJob(record,{status:uncertain?'unknown':'failed',error:error instanceof ProviderError?error.message:'图片处理未完成，服务商可能已生成图片。请核对服务商记录后重试。'});}
  }finally{active.delete(record.job.id);if(!closing)setImmediate(pump);}
 }
 function pump(){if(!started||closing)return;const concurrency=settings().concurrency;for(const record of store.all<StoredJob>('jobs')){if(active.size>=concurrency)break;if(record.job.status!=='queued')continue;const controller=new AbortController();active.set(record.job.id,controller);updateJob(record,{status:'running',error:undefined});const operation=run(record,controller);operations.add(operation);void operation.finally(()=>operations.delete(operation));}}
 function readyConfig(){const config=settings();if(!config.apiKey||!config.model||!config.baseUrl)fail('请先在接口设置中保存 API 地址、密钥和图片模型。');return structuredClone(config);}
 function requireReferenceMapping(config:ProviderSettings,referenceId?:string){if(config.provider==='runninghub'&&referenceId&&!config.runninghub?.referenceNode)fail('RunningHub 生成角色母版或表情需要先配置参考图节点。');}
 function deduplicate(key:string,signature:string):Job[]|undefined{const prior=store.get<Dedup>('requests',key);if(!prior)return;if(prior.signature!==signature)fail('此请求编号已用于另一项操作，请刷新后重新提交。',409);return prior.ids.map(id=>getStoredJob(id).job);}
 function saveBatch(key:string,signature:string,records:StoredJob[]){store.transaction(()=>{for(const record of records)store.put('jobs',record.job.id,record);store.put('requests',key,{signature,ids:records.map(r=>r.job.id)});});setImmediate(pump);return records.map(r=>r.job);}
 function portable(project:Project){const {referenceAssetId,anchorAssetId,...character}=project.character;const {id,createdAt,updatedAt,...rest}=project;return {version:1,project:{...rest,character},references:[referenceAssetId&&{role:'reference',filename:store.get<Asset>('assets',referenceAssetId)?.filename},anchorAssetId&&{role:'anchor',filename:store.get<Asset>('assets',anchorAssetId)?.filename}].filter(Boolean)};}
 function captionFor(job:Job):Caption|undefined{if(!job.reactionId)return;const p=getProject(job.projectId);if(p.captions[job.reactionId])return p.captions[job.reactionId];const reaction=[...catalog.reactions,...p.customReactions].find(r=>r.id===job.reactionId);if(reaction)return defaultCaptionFor(getReaction(p,job.reactionId));return {text:getStoredJob(job.id).captionText||job.name,enabled:true,color:'#ffffff',stroke:'#382537',position:'bottom',fontSize:52};}
 function renderSize(value:unknown){const size=Number(value||512);if(![128,256,512,1024].includes(size))fail('导出尺寸支持 128、256、512 或 1024。');return size;}

 app.get('/api/health',(_req,res)=>res.json({ok:true}));
 app.get('/api/bootstrap',(_req,res)=>res.json({projects:store.all('projects'),catalog,settings:safeSettings(settings()),assets:store.all('assets'),jobs:getJobs()}));
 app.get('/api/settings',(_req,res)=>res.json(safeSettings(settings())));
 app.put('/api/settings',(req,res)=>{
  const body=object(req.body),old=settings();const providerName=body.provider??old.provider;if(!['openai','gemini','runninghub'].includes(providerName))fail('仅支持 OpenAI 兼容、Gemini 原生或 RunningHub 接口。');
  let baseUrl='';try{baseUrl=normalizeBaseUrl(text(body.baseUrl,old.baseUrl,2000));}catch(error){fail((error as Error).message);}
  let runninghub:ProviderSettings['runninghub'];
  if(providerName==='runninghub'){
   if(new URL(baseUrl).pathname!=='/')fail('RunningHub 地址仅填写站点，例如 https://www.runninghub.ai，不附加接口路径。');
   try{runninghub=validateRunningHubSettings(body.runninghub??old.runninghub);}catch(error){fail((error as Error).message);}
  }
  const model=runninghub?`${runninghub.kind}:${runninghub.resourceId}`:text(body.model,old.model,150).trim();if(!model||/[\r\n]/.test(model))fail('请输入有效的图片模型名称。');
  const size=text(body.size,old.size,20);if(providerName!=='runninghub'&&!(providerName==='gemini'?['1K','2K','4K','1024x1024','1536x1024','1024x1536','auto']:['256x256','512x512','1024x1024','1536x1024','1024x1536','1792x1024','1024x1792','auto']).includes(size))fail('不支持此图片尺寸。');
  const concurrency=Number(body.concurrency??old.concurrency);if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)fail('并发数范围为 1–4。');
  const changed=providerName!==old.provider||baseUrl!==old.baseUrl;const supplied=text(body.apiKey,'',4096).trim();if(/[\r\n]/.test(supplied))fail('API 密钥不能换行。');
  const config:ProviderSettings={provider:providerName,baseUrl:baseUrl!,model,size,concurrency,...(runninghub?{runninghub}:{}),apiKey:body.clearApiKey?'':supplied||(!changed?old.apiKey:'')};store.put('settings','provider',config);res.json(safeSettings(config));setImmediate(pump);
 });
 app.post('/api/projects',(req,res)=>{const project=validateProject(req.body||{});store.put('projects',project.id,project);res.status(201).json(project);});
 app.post('/api/projects/import',(req,res)=>{const body=object(req.body);if(body.version!==1)fail('不支持此配方版本。');const project=validateProject(body.project,undefined,true);store.put('projects',project.id,project);res.status(201).json(project);});
 app.put('/api/projects/:id',(req,res)=>{const project=validateProject(req.body,getProject(String(req.params.id)));store.put('projects',project.id,project);res.json(project);});
 app.get('/api/projects/:id/recipe',(req,res)=>res.json(portable(getProject(String(req.params.id)))));
 app.post('/api/assets',async(req,res)=>{const body=object(req.body);const dataUrl=text(body.dataUrl,'',22*1024*1024);const match=/^data:image\/(png|jpeg|jpg|webp|avif|gif);base64,([A-Za-z0-9+/\r\n]+={0,2})$/.exec(dataUrl);if(!match)fail('请上传有效的图片文件。');const buffer=Buffer.from(match![2],'base64');if(buffer.length>15*1024*1024)fail('上传图片上限为 15 MB。',413);try{res.status(201).json(await images.save(buffer,text(body.filename,'reference.png',255),text(body.provenance,'用户上传',1000)));}catch(error){fail((error as Error).message);}});
 app.get('/assets-local/:filename',(req,res)=>{const filename=String(req.params.filename);const id=filename.endsWith('.png')?filename.slice(0,-4):'';if(!store.get<Asset>('assets',id))fail('图片不存在。',404);res.type('png').sendFile(images.path(id));});
 app.get('/api/jobs',(req,res)=>res.json(getJobs().filter(j=>!req.query.projectId||j.projectId===req.query.projectId)));
 app.get('/api/jobs/:id',(req,res)=>res.json(getStoredJob(String(req.params.id)).job));
 app.post('/api/jobs',(req,res)=>{
  const body=object(req.body),key=requestId(body.requestId),projectId=idText(body.projectId),kind=body.kind;if(!['sticker','anchor','character'].includes(kind))fail('任务类型无效。');
  const reactionIds=kind==='sticker'?stringArray(body.reactionIds??getProject(projectId).selectedIds):[];
  const signature=JSON.stringify({projectId,kind,reactionIds});const previous=deduplicate(key,signature);if(previous)return res.json({jobs:previous});
  const project=getProject(projectId),config=readyConfig();const style=catalog.styles.find(s=>s.id===project.styleId)!;
  const character=project.character;
  const originalFirst=kind==='sticker'&&character.outfitMode!=='custom'&&Boolean(character.referenceAssetId);
  const referenceId=kind==='sticker'?(originalFirst?character.referenceAssetId:character.anchorAssetId||character.referenceAssetId):character.referenceAssetId;
  const secondaryReferenceId=originalFirst&&character.anchorAssetId!==referenceId?character.anchorAssetId:undefined;
  if(kind!=='character'&&!referenceId)fail('请先上传角色参考图，或导入并选定角色立绘。');
  for(const id of [referenceId,secondaryReferenceId])if(id&&!store.get<Asset>('assets',id))fail('参考图不存在，请重新上传。');
  requireReferenceMapping(config,referenceId);
  if(kind==='sticker'&&!reactionIds.length)fail('请先选择至少一个表情。');
  const records:StoredJob[]=(kind==='sticker'?reactionIds:[undefined]).map(reactionId=>{
   const reaction=reactionId?getReaction(project,reactionId):undefined;
   const caption=reaction?validateCaption(project.captions[reaction.id]||defaultCaptionFor(reaction)):undefined;
   const textMode=kind==='sticker'?resolveCaptionMode(caption):'none';
   if(textMode==='generated'&&!caption?.text.trim())fail('生图带字需要填写文字；想要无字图片请选择不加字。');
   const prompt=kind==='sticker'?buildStickerPrompt(project.character,reaction!,style,caption):kind==='anchor'?buildAnchorPrompt(project.character,style):buildCharacterPrompt(project.character);
   const date=now();return {job:{id:randomUUID(),projectId,kind,reactionId,name:reaction?.name||(kind==='anchor'?'Q 版母版':'角色参考图'),prompt,status:'queued',createdAt:date,updatedAt:date,model:config.model,provider:config.provider,textMode,...(textMode==='generated'?{generatedText:caption!.text}:{})},settings:structuredClone(config),referenceId,secondaryReferenceId,captionText:caption?.text};
  });res.status(201).json({jobs:saveBatch(key,signature,records)});
 });
 app.post('/api/jobs/import',(req,res)=>{
  const body=object(req.body);const project=getProject(idText(body.projectId)),asset=store.get<Asset>('assets',idText(body.assetId));if(!asset)fail('导入图片不存在。');const kind=body.kind;if(!['sticker','anchor','character'].includes(kind))fail('导入类型无效。');
  const textMode=body.textMode??(kind==='sticker'?'overlay':'none');if(!['none','overlay','generated'].includes(textMode))fail('导入图片的文字方式无效。');
  if(body.generatedText!==undefined&&textMode!=='generated')fail('只有生图带字图片可以记录已嵌入的文字。');
  const generatedText=textMode==='generated'?captionText(body.generatedText):undefined;
  const reactionId=kind==='sticker'?idText(body.reactionId):undefined;const reaction=reactionId?getReaction(project,reactionId):undefined;const date=now();
  const job:Job={id:randomUUID(),projectId:project.id,kind,reactionId,name:text(body.name,reaction?.name||'外部导入',100),prompt:text(body.provenance,'外部导入图片',20000),status:'succeeded',asset,createdAt:date,updatedAt:date,model:'imported',provider:'imported',textMode,...(generatedText!==undefined?{generatedText}:{})};store.put('jobs',job.id,{job,captionText:reaction?.caption});res.status(201).json(job);
 });
 app.post('/api/jobs/:id/cancel',(req,res)=>{const record=getStoredJob(String(req.params.id));if(record.job.status==='queued')updateJob(record,record.job.remoteTaskId?{status:'unknown',error:'已停止本地查询；远程任务可能仍在生成或计费。'}:{status:'cancelled',error:'已取消，未提交给图片服务。'});else if(record.job.status==='running'){active.get(record.job.id)?.abort();updateJob(record,{status:'unknown',error:'已停止本地等待；服务商可能仍在生成或计费，请先核对记录。'});}res.json(record.job);});
 app.post('/api/jobs/:id/resume',(req,res)=>{
  const record=getStoredJob(String(req.params.id));
  if(record.job.provider!=='runninghub'||!record.job.remoteTaskId)fail('只有已记录 RunningHub 任务 ID 的任务可以恢复查询。',409);
  if(!['unknown','failed'].includes(record.job.status)||active.has(record.job.id))fail('任务正在处理或已完成，无需恢复查询。',409);
  if(!record.settings?.apiKey)fail('此任务保存的接口凭据不完整，无法恢复查询。');
  res.json(updateJob(record,{status:'queued',error:undefined}));setImmediate(pump);
 });
 app.post('/api/jobs/:id/retry',(req,res)=>{const old=getStoredJob(String(req.params.id)),key=requestId(req.body?.requestId),signature=JSON.stringify({retry:old.job.id});const prior=deduplicate(key,signature);if(prior)return res.json(prior[0]);if(['queued','running'].includes(old.job.status))fail('此任务仍在队列中。',409);if(old.job.provider==='imported')fail('外部导入图片不能通过接口重试。');if(old.job.provider==='runninghub'&&old.job.remoteTaskId&&old.job.status!=='succeeded')fail('已记录 RunningHub 任务 ID，请使用恢复查询；确需重新生成时，从表情选项新建任务。',409);const config=readyConfig();requireReferenceMapping(config,old.referenceId);const date=now();const record:StoredJob={...old,settings:config,job:{...old.job,id:randomUUID(),status:'queued',asset:undefined,error:undefined,remoteTaskId:undefined,provider:config.provider,model:config.model,createdAt:date,updatedAt:date}};res.status(201).json(saveBatch(key,signature,[record])[0]);});
 app.get('/api/jobs/:id/render',async(req,res)=>{const {job}=getStoredJob(String(req.params.id));if(job.status!=='succeeded'||!job.asset)fail('任务尚无可下载的图片。',409);const buffer=await images.render(job.asset!,renderSize(req.query.size),req.query.caption==='0'?undefined:captionFor(job),{embeddedText:job.textMode==='generated'});res.type('png').setHeader('Content-Disposition',`inline; filename="${job.id}.png"`);res.send(buffer);});
 app.get('/api/projects/:id/export',async(req,res)=>{
  const project=getProject(String(req.params.id)),size=renderSize(req.query.size);const latest=new Map<string,Job>();for(const job of getJobs())if(job.projectId===project.id&&job.kind==='sticker'&&job.status==='succeeded'&&job.asset&&job.reactionId)latest.set(job.reactionId,job);
  const jobs=[...latest.values()];if(!jobs.length)fail('还没有成功生成的表情图。请先生成或导入表情。',409);
  const rendered:Buffer[]=[],entries:{name:string;data:Buffer}[]=[];
  for (const [index, job] of jobs.entries()) {
   const name = `${String(index + 1).padStart(2, '0')}-${exportName(job.name)}`;
   entries.push({ name: `originals/${name}.png`, data: await images.load(job.asset!.id) });
   const resized = await images.render(job.asset!, size);
   entries.push({ name: `resized/${name}.png`, data: resized });
   const preview = req.query.captions === '1' ? await images.render(job.asset!, size, captionFor(job),{embeddedText:job.textMode==='generated'}) : resized;
   rendered.push(preview);
   if (req.query.captions === '1') entries.push({ name: `captioned/${name}.png`, data: preview });
  }
  const contact=await images.contactSheet(rendered,jobs.map(j=>j.name));
  res.type('zip').setHeader('Content-Disposition',`attachment; filename="sticker-pack.zip"; filename*=UTF-8''${encodeURIComponent(exportName(project.name))}.zip`);
  const archive=archiver('zip',{zlib:{level:6}});archive.on('error',error=>{if(!res.headersSent)res.status(500).json({error:'压缩包导出失败，请重试。'});else res.destroy(error);});res.on('close',()=>{if(!res.writableEnded)archive.abort();});archive.pipe(res);
  for(const entry of entries)archive.append(entry.data,{name:entry.name});archive.append(JSON.stringify({...portable(project),results:jobs.map(({name,reactionId,prompt,provider,model,asset,textMode,generatedText})=>({name,reactionId,prompt,provider,model,filename:asset?.filename,hasAlpha:asset?.hasAlpha,textMode:textMode??'overlay',...(generatedText!==undefined?{generatedText}:{})}))},null,2),{name:'recipe.json'});archive.append(contact,{name:'contact-sheet.png'});await archive.finalize();
 });
 app.use('/api',(_req,_res,next)=>next(new HttpError(404,'接口不存在。')));
 const dist=paths.frontendDir;if(existsSync(join(dist,'index.html'))){app.use(express.static(dist));app.get('/{*path}',(_req,res)=>res.sendFile(join(dist,'index.html')));}
 app.use((error:any,_req:Request,res:Response,_next:NextFunction)=>{if(res.headersSent)return;const status=error instanceof HttpError?error.status:error.type==='entity.too.large'?413:error instanceof SyntaxError?400:500;res.status(status).json({error:error instanceof HttpError?error.message:status===413?'上传文件太大。':status===400?'JSON 请求格式无效。':'操作失败，请重试或检查服务端日志。'});if(status===500)console.error('[studio]',error?.name||'Error');});
 if(started)setImmediate(pump);
 return {app,store,start(){started=true;setImmediate(pump);},async close(){closing=true;for(const [id,controller]of active){controller.abort();const record=getStoredJob(id);updateJob(record,{status:'unknown',error:'应用在生成过程中停止。请核对服务商记录后手动重试。'});}await Promise.allSettled(operations);store.close();}};
}
