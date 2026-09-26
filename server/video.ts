import type { Express } from 'express';
import { randomUUID } from 'node:crypto';
import archiver from 'archiver';
import type { Store } from './store.ts';
import { Images, exportName } from './images.ts';
import { normalizeBaseUrl } from './provider.ts';
import type { Asset, Project } from '../src/shared/types.ts';
import { reactionReferences, researchDate } from '../src/shared/reaction-research.ts';
import { archetypes, backgrounds, videoStyles, defaultVideoWorkspace, installTheatrePack, currentVideoPrompt, firstFramePrompt, frameReady, frameSignature, firstFrameConflicts, firstFrameConflictPairs, firstFrameConflictMessage, portableTemplates, promptIssues, rewriteTask, h3Rules, h3Source, type MotionTemplate, type VideoCard, type VideoWorkspace } from '../src/shared/video.ts';

type Fail = (message:string,status?:number)=>never;
interface TextSettings { baseUrl:string; model:string; apiKey?:string; hasApiKey?:boolean; }
/** Lazily migrate only relevant assets; bounded decoding avoids loading many large images at once. */
export async function assetsForVideoFrames(images:Images,...workspaces:VideoWorkspace[]) {
  const ids=new Set(workspaces.flatMap(w=>w.cards.filter(c=>!c.archived&&c.mode==='I2VA'&&c.frame).map(c=>c.frame!.assetId)));
  const assets:Asset[]=[];for(const id of ids)assets.push(await images.withContentHash(id));return assets;
}
export function registerVideoRoutes(app:Express,store:Store,images:Images,fail:Fail) {
  const object=(v:any)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('配方应为 JSON 对象。');return v;};
  const text=(v:unknown,max=4000)=>{if(typeof v!=='string'||v.length>max)fail(`文字字段无效或超过 ${max} 字。`);return v as string;};
  const id=(v:unknown)=>{const s=text(v,100);if(!/^[a-zA-Z0-9_-]+$/.test(s))fail('配方 ID 无效。');return s;};
  const choice=<T extends string>(v:unknown,values:T[]):T=>{if(!values.includes(v as T))fail('配方选项无效。');return v as T;};
  const assetId=(v:unknown)=>{if(v===undefined)return;const value=id(v);if(!store.get('assets',value))fail('绑定图片不存在，请重新上传。');return value;};
  const requiredAsset=(v:unknown)=>{const value=assetId(v);if(!value)fail('首帧绑定需要有效的图片 ID。');return value!;};
  const project=(v:string)=>{const p=store.get<Project>('projects',v);if(!p)fail('角色项目不存在。',404);return p!;};
  const workspace=(p:Project)=>store.get<VideoWorkspace>('video-workspaces',p.id)||defaultVideoWorkspace(p);
  function template(value:unknown):MotionTemplate {
    const b=object(value);if(!Array.isArray(b.beats)||b.beats.length<3||b.beats.length>5||typeof b.loop!=='boolean')fail('动作模板需要 3–5 个节拍以及结尾类型。');
    let theatre:MotionTemplate['theatre'];
    if(b.theatre){const t=object(b.theatre);
      if(t.edition!==2||!Array.isArray(t.labels)||t.labels.length!==b.beats.length||!Array.isArray(t.ends)||t.ends.length!==b.beats.length)fail('小剧场标签和节拍数量需要一致。');
      if(t.ends.some((n:unknown,i:number)=>typeof n!=='number'||!Number.isFinite(n)||n<=0||n>1||(i>0&&n<=t.ends[i-1]))||t.ends.at(-1)!==1)fail('节拍结束比例必须递增，最后一段为 1。');
      if(!Array.isArray(t.gif)||t.gif.length!==2||t.gif.some((n:unknown)=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)||t.gif[0]>=t.gif[1])fail('GIF 截取比例无效。');
      theatre={edition:2,motive:text(t.motive,1000),trigger:text(t.trigger,1000),payoff:text(t.payoff,1000),labels:t.labels.map((v:unknown)=>text(v,100)),ends:[...t.ends],camera:text(t.camera,2000),secondaryActor:text(t.secondaryActor,2000),actionStyle:text(t.actionStyle,2000),framing:text(t.framing,2000),gif:[t.gif[0],t.gif[1]]};
    }else if(b.beats.length!==3)fail('旧版模板需要三个节拍；更多节拍须提供小剧场时间分配。');
    return {id:id(b.id),name:text(b.name,100),category:text(b.category,30),emoji:text(b.emoji,16),caption:text(b.caption,100),hook:text(b.hook,500),scene:text(b.scene,3000),pose:text(b.pose,3000),beats:b.beats.map((v:unknown)=>text(v,4000)),sound:text(b.sound,1500),check:text(b.check,1000),loop:b.loop,...(theatre?{theatre}:{})};
  }
  function validate(value:unknown):VideoWorkspace {
    const b=object(value);if(b.version!==1||!Number.isInteger(b.revision)||b.revision<0)fail('视频工作区版本或修订号无效。');
    if(!Array.isArray(b.cards)||!b.cards.length||b.cards.length>60)fail('一个工作区支持 1–60 张动态配方。');
    const cards:VideoCard[]=b.cards.map((v:unknown)=>{const c=object(v);if(![4,6,8].includes(c.duration)||typeof c.included!=='boolean')fail('时长应为 4、6 或 8 秒。');return {id:id(c.id),template:template(c.template),duration:c.duration,mode:choice(c.mode,['I2VA','Ref2VA']),included:c.included,...(c.archived===true?{archived:true}:{}),...(c.frame?{frame:{assetId:requiredAsset(object(c.frame).assetId),signature:text(c.frame.signature,80)}}:{}),...(c.edited?{edited:{text:text(object(c.edited).text,40000),signature:text(c.edited.signature,80),source:choice(c.edited.source,['manual','ai'])}}:{})};});
    if(new Set(cards.map(c=>c.id)).size!==cards.length)fail('动态配方 ID 重复。');
    const activeId=id(b.activeId);if(!cards.some(c=>c.id===activeId))fail('当前配方不存在。');
    return {version:1,revision:b.revision,archetype:choice(b.archetype,archetypes.map(t=>t.id)),style:choice(b.style,videoStyles.map(s=>s.id)),background:choice(b.background,backgrounds.map(s=>s.id)),masterAssetId:assetId(b.masterAssetId),activeId,cards};
  }
  app.get('/api/projects/:id/video',async(req,res)=>{const p=project(String(req.params.id)),w=workspace(p),frameAssets=await assetsForVideoFrames(images,w);res.json({workspace:w,templates:store.all<MotionTemplate>('video-templates'),frameAssets,frameConflicts:firstFrameConflicts(p.character,w,frameAssets)});});
  app.put('/api/projects/:id/video',async(req,res)=>{
    const p=project(String(req.params.id)),old=workspace(p),next=validate(req.body);
    if(old.revision!==next.revision)fail('动态配方已在其他页面更改。请先导出当前草稿，再重新加载工作区。',409);
    const assets=await assetsForVideoFrames(images,old,next),oldPairs=firstFrameConflictPairs(firstFrameConflicts(p.character,old,assets));
    const conflicts=firstFrameConflicts(p.character,next,assets);
    for(const conflict of conflicts)if([...firstFrameConflictPairs([conflict])].some(pair=>!oldPairs.has(pair)))fail(firstFrameConflictMessage(conflict),409);
    // Hashing legacy files is asynchronous: recheck before committing to avoid lost edits.
    if(workspace(p).revision!==next.revision)fail('动态配方已在其他页面更改，请重新加载工作区。',409);
    next.revision++;store.put('video-workspaces',p.id,next);res.json(next);
  });
  app.post('/api/projects/:id/video/check-frame',async(req,res)=>{
    const p=project(String(req.params.id)),b=object(req.body),w=validate(b.workspace),target=w.cards.find(c=>c.id===b.cardId);
    if(!target)fail('待配图的剧情不存在。');const candidate=requiredAsset(b.assetId);
    target!.frame={assetId:candidate,signature:frameSignature(p.character,w,target!)};
    const frameAssets=await assetsForVideoFrames(images,w),conflict=firstFrameConflicts(p.character,w,frameAssets).find(c=>c.cardIds.includes(target!.id));
    if(conflict)fail(firstFrameConflictMessage(conflict),409);
    res.json({ok:true,frameAssets});
  });
  app.post('/api/projects/:id/video/theatre-pack',(req,res)=>{
    const p=project(String(req.params.id)),old=workspace(p);if(req.body?.revision!==old.revision)fail('工作区已更新，请刷新后再加入小剧场。',409);
    let next:VideoWorkspace;try{next=installTheatrePack(old);}catch(error){fail((error as Error).message);}
    if(next === old){res.json(old);return;}next!.revision=old.revision+1;
    store.transaction(()=>{store.put('video-workspace-backups',`${p.id}-${randomUUID()}`,{projectId:p.id,savedAt:new Date().toISOString(),workspace:old});store.put('video-workspaces',p.id,next);});res.json(next!);
  });
  app.post('/api/video/templates',(req,res)=>{const t=template({...object(req.body),id:randomUUID()});store.put('video-templates',t.id,t);res.status(201).json(t);});
  app.get('/api/video/templates/export',(_req,res)=>res.attachment('motion-templates.json').json(portableTemplates(store.all<MotionTemplate>('video-templates'))));
  app.post('/api/video/templates/import',(req,res)=>{const b=object(req.body);if(b.format!=='h3-motion-templates'||b.version!==1||!Array.isArray(b.templates)||b.templates.length>60)fail('不支持的模板文件；单次最多导入 60 个。');const imported=b.templates.map((v:unknown)=>template({...object(v),id:randomUUID()}));store.transaction(()=>{for(const t of imported)store.put('video-templates',t.id,t);});res.status(201).json(imported);});
  app.delete('/api/video/templates/:id',(req,res)=>{store.db.prepare('DELETE FROM records WHERE kind = ? AND id = ?').run('video-templates',id(req.params.id));res.json({ok:true});});

  const config=():TextSettings=>store.get('settings','video-text')||{baseUrl:'https://api.openai.com/v1',model:''};
  const safe=(c:TextSettings)=>({baseUrl:c.baseUrl,model:c.model,hasApiKey:Boolean(c.apiKey)});
  app.get('/api/video/text-settings',(_req,res)=>res.json(safe(config())));
  app.put('/api/video/text-settings',(req,res)=>{const b=object(req.body),old=config();let baseUrl:string;try{baseUrl=normalizeBaseUrl(text(b.baseUrl,2000));}catch{fail('文字接口需要 HTTPS，或本机 HTTP 地址；不含查询参数。');}const key=text(b.apiKey??'',4096).trim(),model=text(b.model,150).trim();if(/[\r\n]/.test(key+model)||!model)fail('请填写有效模型名称和单行密钥。');const next={baseUrl:baseUrl!,model,apiKey:b.clearApiKey?'':key||(baseUrl === old.baseUrl?old.apiKey:'')};store.put('settings','video-text',next);res.json(safe(next));});
  app.post('/api/projects/:id/video/rewrite',async(req,res)=>{
    const p=project(String(req.params.id)),b=object(req.body),w=validate(b.workspace),card=w.cards.find(c=>c.id===b.cardId);if(!card)fail('待改写的配方不存在。');
    const c=config();if(!c.model||!c.apiKey)fail('请先配置可选的文字接口。');
    let response:Response;try{response=await fetch(`${c.baseUrl}/chat/completions`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(90000),headers:{'content-type':'application/json',authorization:`Bearer ${c.apiKey}`},body:JSON.stringify({model:c.model,messages:[{role:'system',content:h3Rules},{role:'user',content:rewriteTask(p.character,w,card!)}],max_tokens:2500})});}catch{fail('文字接口未完成响应；未自动重试，请检查服务商记录后再试。',502);}
    if(!response!.ok){await response!.body?.cancel();fail(`文字接口返回 HTTP ${response!.status}，请检查地址、模型与密钥。`,502);}
    const reader=response!.body?.getReader();if(!reader)fail('文字接口返回空响应。',502);let count=0;const parts:Uint8Array[]=[];
    try{while(true){const next=await reader!.read();if(next.done)break;count+=next.value.length;if(count>1024*1024)fail('文字接口返回内容过大。',502);parts.push(next.value);}}finally{await reader!.cancel().catch(()=>{});}
    let data:any;try{data=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{fail('文字接口未返回有效 JSON。',502);}
    const raw=data?.choices?.[0]?.message?.content;if(typeof raw!=='string'||raw.length>40000)fail('文字接口未返回有效提示词。',502);
    const prompt=raw.trim().replace(/^```(?:text|plaintext)?\s*\n/,'').replace(/\n```$/,'');const issues=promptIssues(prompt,card!.mode);if(issues.length)fail(`AI 返回格式未通过检查：${issues.join(' ')}`,422);res.json({prompt});
  });
  app.get('/api/projects/:id/video/export',async(req,res)=>{
    const p=project(String(req.params.id)),w=workspace(p),cards=w.cards.filter(c=>c.included);if(!cards.length)fail('先勾选要打包的配方。');
    const exportScope={...w,cards:w.cards.map(c=>c.included?{...c,archived:false}:c)};
    const selectedIds=new Set(cards.map(c=>c.id)),conflicts=firstFrameConflicts(p.character,exportScope,await assetsForVideoFrames(images,exportScope));
    const conflict=conflicts.find(c=>c.cardIds.some(id=>selectedIds.has(id)));
    if(conflict)fail(firstFrameConflictMessage(conflict),409);
    for(const c of cards){if(c.mode==='I2VA'&&!frameReady(p.character,w,c))fail(`「${c.template.name}」需要匹配当前设定的首帧。`);if(c.mode==='Ref2VA'&&!w.masterAssetId)fail('参考生视频需要绑定角色母版。');const issues=promptIssues(currentVideoPrompt(p.character,w,c),c.mode);if(issues.length)fail(`「${c.template.name}」提示词需修正：${issues[0]}`);}
    if(req.query.check==='1'){res.json({ok:true,count:cards.length});return;}
    const entries:{name:string;data:string|Buffer}[]=[];const manifest:any[]=[];
    for(const [index,c] of cards.entries()){
      const directory=`${String(index+1).padStart(2,'0')}-${exportName(c.template.name)}`;
      const pictureId=c.mode==='I2VA'?c.frame!.assetId:w.masterAssetId!;
      const picture=store.get<Asset>('assets',pictureId);if(!picture)fail('配方引用的图片已丢失。',409);
      entries.push({name:`${directory}/Picture-1.png`,data:await images.load(pictureId)},{name:`${directory}/H3-prompt.txt`,data:currentVideoPrompt(p.character,w,c)},{name:`${directory}/first-frame-prompt.txt`,data:firstFramePrompt(p.character,w,c)});
      manifest.push({name:c.template.name,mode:c.mode,durationSeconds:c.duration,aspect:'1:1',image:`${directory}/Picture-1.png`,prompt:`${directory}/H3-prompt.txt`,captionSuggestion:c.template.caption,loop:c.template.loop,...(c.template.theatre?{story:{motive:c.template.theatre.motive,trigger:c.template.theatre.trigger,payoff:c.template.theatre.payoff},suggestedGifSeconds:c.template.theatre.gif.map(n=>Number((n*c.duration).toFixed(2))),trimNote:'提示词中的目标时间；请根据实际成片的起势、爆点和收尾微调。'}:{})});
    }
    entries.push({name:'manifest.json',data:JSON.stringify({version:1,character:p.character.name,recipes:manifest},null,2)},{name:'reusable-templates.json',data:JSON.stringify(portableTemplates(cards.map(c=>c.template)),null,2)},{name:'使用说明.txt',data:`每个文件夹一张上传图片与一条完整 H3 提示词。按 manifest.json 的模式、时长与比例生成。I2VA 的 Picture-1 是首帧；Ref2VA 的 Picture-1 是身份参考。本工作区实行一图一剧情：不同有效 I2VA 剧情使用独立首帧，角色母版与 Ref2VA 身份参考可复用。这是制作规则，不是模型技术限制。生成视频后再裁切最清晰的动作并转换 GIF。首尾接近是提示目标，不保证模型无缝循环。文案建议供后期叠字，不写进视频。\n格式依据：${h3Source}\n通用动作模板不携带当前角色图片；替换角色后需重新制作首帧。`});
    entries.push({name:'research-reference-index.json',data:JSON.stringify({checkedAt:researchDate,scope:'公开参考研究；不代表 QQ 实时转发榜；未包含第三方原始媒体。',references:reactionReferences},null,2)});
    res.type('zip').setHeader('Content-Disposition','attachment; filename="h3-reaction-pack.zip"');const archive=archiver('zip',{zlib:{level:6}});archive.on('error',error=>{if(!res.headersSent)res.status(500).json({error:'打包失败，请重试。'});else res.destroy(error);});res.on('close',()=>{if(!res.writableEnded)archive.abort();});archive.pipe(res);for(const entry of entries)archive.append(entry.data,{name:entry.name});await archive.finalize();
  });
}
