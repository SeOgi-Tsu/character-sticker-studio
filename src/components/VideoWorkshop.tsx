import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, Clapperboard, Copy, Download, FileJson, ImagePlus, Layers3, LoaderCircle, Plus, RotateCcw, Save, Settings2, Sparkles, Trash2, Upload, X } from 'lucide-react';
import type { Asset, Project } from '../shared/types';
import { archetypes, backgrounds, videoStyles, motionTemplates, beatTimeline, currentVideoPrompt, firstFramePrompt, frameReady, frameSignature, firstFrameConflicts, promptSignature, promptIssues, portableTemplates, rewriteTask, h3Source, type MotionTemplate, type VideoCard, type VideoWorkspace } from '../shared/video';
import { api, download, errorMessage, post, readImage } from '../lib/api';
import { Field, Modal } from './Common';
import './VideoWorkshop.css';
import ReactionResearch from './ReactionResearch';
import { reactionReferences } from '../shared/reaction-research';

interface Props { project:Project; assets:Asset[]; onAsset:(asset:Asset)=>void; onMasterChange:(value:{projectId:string;assetId?:string})=>void; notify:(text:string,type?:'success'|'error')=>void; saveBeforeLeave:MutableRefObject<(()=>Promise<void>)|null>; }
function saveText(name:string,content:string,type='text/plain') {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export default function VideoWorkshop({project,assets,onAsset,onMasterChange,notify,saveBeforeLeave}:Props) {
  const [workspace,setWorkspace]=useState<VideoWorkspace|null>(null);
  const [library,setLibrary]=useState<MotionTemplate[]>([]);
  const [loadError,setLoadError]=useState('');
  const [saveState,setSaveState]=useState<'saved'|'dirty'|'saving'|'error'>('saved');
  const [busy,setBusy]=useState(false);
  const [filter,setFilter]=useState('全部');
  const [showArchive,setShowArchive]=useState(false);
  const [tab,setTab]=useState<'video'|'frame'>('video');
  const [modal,setModal]=useState<'library'|'settings'|'master'|'sources'|'frames'|null>(null);
  const [assetSearch,setAssetSearch]=useState('');
  const [textSettings,setTextSettings]=useState({baseUrl:'https://api.openai.com/v1',model:'',apiKey:'',hasApiKey:false});
  const latest=useRef<VideoWorkspace|null>(null), change=useRef(0), saved=useRef(0), serverRevision=useRef(0);
  const promise=useRef<Promise<void>|null>(null), operation=useRef<Promise<void>|null>(null), alive=useRef(true);
  const frameInput=useRef<HTMLInputElement>(null),masterInput=useRef<HTMLInputElement>(null),importInput=useRef<HTMLInputElement>(null);
  const flushRef=useRef<()=>Promise<void>>(async()=>{});
  const projectRef=useRef(project);projectRef.current=project;
  async function load() {
    try {const data=await api<{workspace:VideoWorkspace;templates:MotionTemplate[];frameAssets?:Asset[]}>(`/api/projects/${project.id}/video`);if(!alive.current)return;for(const asset of data.frameAssets??[])onAsset(asset);latest.current=data.workspace;serverRevision.current=data.workspace.revision;setWorkspace(data.workspace);setShowArchive(Boolean(data.workspace.cards.find(c=>c.id===data.workspace.activeId)?.archived));setLibrary(data.templates);setLoadError('');}
    catch(error){if(alive.current)setLoadError(errorMessage(error));}
  }
  useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[project.id]);
  useEffect(()=>{if(workspace)onMasterChange({projectId:project.id,assetId:workspace.masterAssetId});},[workspace?.masterAssetId,project.id,onMasterChange]);
  async function flush() {
    if(promise.current){await promise.current;return flush();}
    const task=(async()=>{
      while(latest.current && saved.current!==change.current){
        const snapshot={...latest.current,revision:serverRevision.current},version=change.current;
        setSaveState('saving');
        const next=await api<VideoWorkspace>(`/api/projects/${project.id}/video`,{method:'PUT',body:JSON.stringify(snapshot)});
        serverRevision.current=next.revision;saved.current=version;latest.current={...latest.current!,revision:next.revision};
        if(alive.current){setWorkspace(latest.current);setSaveState(saved.current===change.current?'saved':'dirty');}
      }
    })();
    promise.current=task;
    try{await task;}catch(error){if(alive.current)setSaveState('error');throw error;}finally{promise.current=null;}
  }
  flushRef.current=flush;
  useEffect(()=>{const save=async()=>{if(operation.current)await operation.current;await flushRef.current();};saveBeforeLeave.current=save;return()=>{if(saveBeforeLeave.current===save)saveBeforeLeave.current=null;};},[saveBeforeLeave]);
  useEffect(()=>{if(saveState!=='dirty')return;const timer=setTimeout(()=>void flushRef.current().catch(error=>notify(errorMessage(error),'error')),650);return()=>clearTimeout(timer);},[workspace,saveState]);
  useEffect(()=>{function beforeUnload(event:BeforeUnloadEvent){if(change.current!==saved.current||operation.current){event.preventDefault();event.returnValue='';}}window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);},[]);
  function update(value:Partial<VideoWorkspace>) {const next={...latest.current!,...value};latest.current=next;change.current++;setWorkspace(next);setSaveState('dirty');}
  function cardUpdate(value:Partial<VideoCard>,cardId=latest.current!.activeId){update({cards:latest.current!.cards.map(c=>c.id===cardId?{...c,...value}:c)});}
  function templateUpdate(value:Partial<MotionTemplate>){const current=latest.current!.cards.find(c=>c.id===latest.current!.activeId)!;cardUpdate({template:{...current.template,...value}});}
  function removeCard(){const next=latest.current!.cards.filter(c=>c.id!==latest.current!.activeId);if(!next.length)return;const active=next.find(c=>Boolean(c.archived)===showArchive)??next[0];update({cards:next,activeId:active.id});setShowArchive(Boolean(active.archived));}
  async function run(task:()=>Promise<void>){if(operation.current)return;setBusy(true);const p=task();operation.current=p;try{await p;}catch(error){notify(errorMessage(error),'error');}finally{operation.current=null;if(alive.current)setBusy(false);}}
  async function copy(content:string){await navigator.clipboard.writeText(content);notify('已复制，可以粘贴到生成平台。');}
  async function upload(file:File,role:'frame'|'master'){
    const snapshot=latest.current!,target=snapshot.cards.find(c=>c.id===snapshot.activeId)!,binding=frameSignature(projectRef.current.character,snapshot,target);
    const asset=await post<Asset>('/api/assets',{filename:file.name,dataUrl:await readImage(file),provenance:`用户上传 · 动态表情${role==='frame'?'首帧':'角色母版'} · ${project.character.name}`});onAsset(asset);
    if(role==='master')update({masterAssetId:asset.id});else {
      const current=latest.current!,currentCard=current.cards.find(c=>c.id===target.id);
      if(!currentCard||frameSignature(projectRef.current.character,current,currentCard)!==binding)throw new Error('上传期间角色或场景已变化，图片已保存在素材库，请确认起势后重新绑定。');
      const checked=await post<{frameAssets:Asset[]}>(`/api/projects/${project.id}/video/check-frame`,{workspace:current,cardId:target.id,assetId:asset.id});
      for(const item of checked.frameAssets)onAsset(item);
      cardUpdate({frame:{assetId:asset.id,signature:binding}},target.id);
    }
    await flush();notify(role==='frame'?'独立首帧已绑定到当前剧情。':'视频角色母版已保存。');
  }
  async function saveTemplate(){const card=latest.current!.cards.find(c=>c.id===latest.current!.activeId)!;const t=await post<MotionTemplate>('/api/video/templates',card.template);setLibrary(old=>[...old,t]);notify('动作已存入通用模板库，其他角色也可以使用。');}
  async function installTheatre(){await flush();const beforeCount=latest.current!.cards.length;const next=await post<VideoWorkspace>(`/api/projects/${project.id}/video/theatre-pack`,{revision:serverRevision.current});latest.current=next;serverRevision.current=next.revision;saved.current=change.current;setWorkspace(next);setSaveState('saved');setFilter('全部');setShowArchive(false);notify(`已补充 ${next.cards.length-beforeCount} 个小剧场，已有配方、图片和编辑内容已保留。`);}
  function addTemplate(template:MotionTemplate){if(latest.current!.cards.length>=60){notify('一个工作区最多 60 张配方。','error');return;}const id=crypto.randomUUID();update({cards:[...latest.current!.cards,{id,template:structuredClone(template),duration:6,mode:'I2VA',included:true}],activeId:id});setFilter('全部');setShowArchive(false);setModal(null);}
  async function importTemplates(file:File){if(file.size>2*1024*1024)throw new Error('模板文件需小于 2 MB。');const next=await post<MotionTemplate[]>('/api/video/templates/import',JSON.parse(await file.text()));setLibrary(old=>[...old,...next]);setModal('library');notify(`已导入 ${next.length} 个通用模板。`);}
  async function openSettings(){const next=await api<typeof textSettings>('/api/video/text-settings');setTextSettings({...next,apiKey:''});setModal('settings');}
  async function rewrite(){const w=latest.current!,card=w.cards.find(c=>c.id===w.activeId)!,signature=promptSignature(projectRef.current.character,w,card);const {prompt}=await post<{prompt:string}>(`/api/projects/${project.id}/video/rewrite`,{workspace:w,cardId:card.id});cardUpdate({edited:{text:prompt,signature,source:'ai'}},card.id);await flush();notify('AI 改写已通过字段与引用检查，请复核动作内容。');}
  async function exportPack(){
    await flush();const path=`/api/projects/${project.id}/video/export`;
    await api(`${path}?check=1`);
    // Let the browser stream a real attachment URL instead of buffering a large ZIP in a blob URL.
    const link=document.createElement('a');link.href=path;link.download=`${project.character.name}-H3动态表情.zip`;document.body.appendChild(link);link.click();link.remove();
    notify('配方检查通过，已发起素材包下载。');
  }

  if(loadError)return <div className="video-workshop"><p className="error-banner">{loadError}</p><button className="button secondary" onClick={()=>void load()}>重新加载</button></div>;
  if(!workspace)return <div className="video-loading"><LoaderCircle className="spin"/> 正在打开动态配方…</div>;
  const card=workspace.cards.find(c=>c.id===workspace.activeId)!,t=card.template;
  const master=assets.find(a=>a.id===workspace.masterAssetId),frame=assets.find(a=>a.id===card.frame?.assetId);
  const ready=frameReady(project.character,workspace,card),prompt=currentVideoPrompt(project.character,workspace,card),issues=promptIssues(prompt,card.mode);
  const editedCurrent=card.edited?.signature===promptSignature(project.character,workspace,card);
  const available=workspace.cards.filter(c=>Boolean(c.archived)===showArchive);
  const shown=available.filter(c=>filter==='全部'||c.template.category===filter);
  const timeline=beatTimeline(card),archivedCount=workspace.cards.filter(c=>c.archived).length;
  const frameScope={...workspace,cards:workspace.cards.map(c=>c.archived&&(showArchive||c.included)?{...c,archived:false}:c)};
  const conflicts=firstFrameConflicts(project.character,frameScope,assets);
  const conflictByCard=new Map(conflicts.flatMap(conflict=>conflict.cardIds.map(id=>[id,conflict] as const)));
  const sharedWith=(id:string)=>{const conflict=conflictByCard.get(id);return conflict?conflict.names.filter((_,i)=>conflict.cardIds[i]!==id).join('、'):'';};
  const selected=workspace.cards.filter(c=>c.included),complete=selected.filter(c=>c.mode==='I2VA'?frameReady(project.character,workspace,c)&&!conflictByCard.has(c.id):Boolean(master));
  const selectedConflict=selected.some(c=>conflictByCard.has(c.id));
  const categories=['全部',...new Set(available.map(c=>c.template.category))];
  const existingTemplateIds=new Set(workspace.cards.map(c=>c.template.id));
  const missingTheatre=motionTemplates.filter(template=>!existingTemplateIds.has(template.id));
  const missingTheatreSummary=missingTheatre.slice(0,3).map(template=>template.name).join('；')+(missingTheatre.length>3?`，等 ${missingTheatre.length} 条。`:'。');
  return <div className="video-workshop">
    <header className="video-heading"><div><span className="eyebrow">A LITTLE THEATRE, A LOT OF PERSONALITY</span><h1>让她，<em>演一出。</em></h1><p>敢招惹、会破防、偷偷心软。每段都有一件事发生，也有一秒露出真性格。</p></div><div className="video-edition"><Clapperboard size={27} strokeWidth={1.4}/><span>CHARACTER THEATRE</span><strong>VOL. 07</strong><button onClick={()=>setModal('sources')}>参考研究 · {reactionReferences.length} 例 <ArrowUpRight size={12}/></button></div></header>
    {missingTheatre.length>0&&<div className="video-theatre-upgrade"><div><strong>还有 {missingTheatre.length} 个小剧场可以加入</strong><p>待加入：{missingTheatreSummary}</p></div><button className="button primary" disabled={busy} onClick={()=>void run(installTheatre)}>补充 {missingTheatre.length} 个小剧场</button></div>}
    <section className="video-profile" aria-label="动态角色与画风">
      <button className="video-master" onClick={()=>setModal('master')}><span>{master?<img src={master.url} alt="动态角色母版"/>:<ImagePlus size={23}/>}</span><div><small>本工作区角色母版</small><strong>{project.character.name || '选择角色'} <Settings2 size={13}/></strong></div></button>
      <Field label="角色类型"><select value={workspace.archetype} onChange={e=>{const type=archetypes.find(t=>t.id===e.target.value)!;update({archetype:type.id,style:type.style});}}>{archetypes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="角色画风"><select value={workspace.style} onChange={e=>update({style:e.target.value as VideoWorkspace['style']})}>{videoStyles.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="场景质感"><select value={workspace.background} onChange={e=>update({background:e.target.value as VideoWorkspace['background']})}>{backgrounds.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    </section>
    <div className="video-workbar"><p><i/>{archetypes.find(t=>t.id===workspace.archetype)!.note} <span>· 换角色或场景后，重新配首帧</span></p><div><span className={`video-save ${saveState}`} role="status">{saveState==='saved'?<Check size={12}/>:<Save size={12}/>}{{saved:'动态配方已保存',dirty:'等待保存',saving:'正在保存',error:'保存失败'}[saveState]}</span><button onClick={()=>void run(flush)} disabled={busy||saveState==='saved'}>保存</button>{saveState==='error'&&<button onClick={()=>saveText('video-workspace-draft.json',JSON.stringify(workspace,null,2),'application/json')}>备份草稿</button>}</div></div>
    <p className="video-reference-note"><strong>一图一剧情</strong><small>每条 I2VA 小剧场使用自己的独立起势图，取消勾选不会释放首帧。角色母版和 Ref2VA 身份参考可以复用；这是本工作区的制作规则。</small></p>
    <div className="video-overview-entry"><button className="button secondary small" onClick={()=>setModal('frames')}><ImagePlus size={14}/>首帧总览 · 逐条核对</button><span>看构图、起势和道具是否各有用途</span></div>
    {conflicts.length>0&&<p className="video-warning" role="status">有 {conflictByCard.size} 条剧情共用了首帧。历史草稿仍可保存，请逐张替换；涉及这些剧情的素材包暂不可导出。</p>}
    <div className="video-layout">
      <section className="video-library-panel" aria-label="动态配方列表"><div className="video-section-title"><span><Layers3 size={16}/> {showArchive?'旧版轻动作':'小剧场选集'} <small>{available.length}</small></span><button className="icon-button" aria-label="打开通用模板库" onClick={()=>setModal('library')}><Plus size={17}/></button></div><div className="video-filters">{categories.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}</div>
        <div className="video-recipe-list">{shown.map((c,index)=>{const asset=assets.find(a=>a.id===c.frame?.assetId);const valid=frameReady(project.character,workspace,c);const shared=sharedWith(c.id);return <article className={`video-recipe ${c.id===card.id?'active':''}`} key={c.id}><button className="video-recipe-open" onClick={()=>update({activeId:c.id})}><span className="video-recipe-thumb">{asset?<img src={asset.url} alt="" loading="lazy" className={valid?'':'outdated'}/>:<span>{c.template.emoji}</span>}</span><span className="video-recipe-text"><small>{String(index+1).padStart(2,'0')} / {c.template.category}</small><strong>{c.template.name}</strong><span>{c.duration}s · {c.mode==='Ref2VA'?(master?'参考图已配':'待配母版'):(shared?'首帧重复':valid?'独立首帧已配':asset?'首帧需更新':'待配首帧')}</span>{shared&&<small title={`与「${shared}」共用首帧`}>与「{shared}」共图</small>}</span></button><label className="video-include"><input type="checkbox" aria-label={`打包 ${c.template.name}`} checked={c.included} onChange={e=>cardUpdate({included:e.target.checked},c.id)}/></label></article>;})}</div>
        <button className="video-add" onClick={()=>setModal('library')}><Plus size={15}/> 从模板库添加</button>
        <div className="video-selection"><button onClick={()=>update({cards:workspace.cards.map(c=>({...c,included:Boolean(c.archived)===showArchive}))})}>选择本页</button><button onClick={()=>update({cards:workspace.cards.map(c=>({...c,included:false}))})}>清空选择</button><button onClick={()=>update({cards:workspace.cards.map(c=>({...c,included:Boolean(c.archived)===showArchive&&(c.mode==='I2VA'?frameReady(project.character,workspace,c)&&!conflictByCard.has(c.id):Boolean(master))}))})}>只选配图合格</button></div>
        {archivedCount>0&&<button className="video-archive-toggle" onClick={()=>{const next=!showArchive;setShowArchive(next);setFilter('全部');const first=workspace.cards.find(c=>Boolean(c.archived)===next);if(first)update({activeId:first.id});}}>{showArchive?'返回角色小剧场':`旧版轻动作 · ${archivedCount} 条`}</button>}
      </section>
      <section className="video-card-detail" aria-label="当前动态配方">
        <div className="video-scene-top"><div><span className="eyebrow">{t.category} / SCENE & PERFORMANCE</span><h2>{t.name}</h2><p>{t.hook}</p></div><button className="icon-button" aria-label="收藏当前动作模板" title="收藏到通用模板库" onClick={()=>void run(saveTemplate)} disabled={busy}><Save size={18}/></button></div>
        <div className="video-scene-preview">
          {frame?<img src={frame.url} alt={`${t.name}的首帧${ready?'':'（旧设定）'}`}/>:<div className="video-empty-scene"><Clapperboard size={38} strokeWidth={1}/><strong>让这个动作，发生在一个场景里。</strong><p>复制首帧提示词，搭配角色母版生成图片，<br/>再把生成的图放到这里。</p><button className="button secondary" onClick={()=>setTab('frame')}><Sparkles size={14}/> 查看首帧提示词</button></div>}
          <span className="video-frame-label">{frame?(sharedWith(card.id)?'首帧重复 · 需替换':ready?'首帧已绑定':'旧首帧 · 需更新'):'首帧待制作'} / 1:1</span><span className="video-caption-preview">{t.caption}</span>
        </div>
        <div className="video-image-actions"><button className="button secondary small" disabled={busy} onClick={()=>frameInput.current?.click()}><Upload size={14}/>{frame?'替换首帧':'上传首帧'}</button>{frame&&<button className="button quiet small" onClick={()=>void run(()=>download(frame.url,`${t.name}-首帧.png`))}><ArrowDownToLine size={14}/> 下载原图</button>}<span>文案为后期建议，不写入生成图</span></div>
        {frame&&!ready&&<p className="video-warning">角色、画风或场景已变化。请重新制作首帧；旧图仅供对照，暂不可打包。</p>}
        {sharedWith(card.id)&&<p className="video-warning" role="status">当前首帧与「{sharedWith(card.id)}」共用。请为这条剧情重新画独立起势图；换文件名或重复上传同一张图不会解除冲突。</p>}
        {t.theatre&&<div className="video-story"><div><span>她的心思</span><p>{t.theatre.motive}</p></div><div><span>这场怎么发生</span><p>{t.theatre.trigger}</p></div><div className="video-story-payoff"><span>最后露馅</span><p>{t.theatre.payoff}</p></div></div>}
        <div className="video-beats" style={{gridTemplateColumns:`repeat(${timeline.length},minmax(0,1fr))`}}>{timeline.map((beat,i)=><div key={i}><span>{beat.start.toFixed(2)}—{beat.end.toFixed(2)}s</span><i/><p>{beat.label}</p></div>)}</div>
        {t.theatre&&<p className="video-gif-cut">建议保留 {(t.theatre.gif[0]*card.duration).toFixed(1)}—{(t.theatre.gif[1]*card.duration).toFixed(1)} 秒的剧情段 · 根据实际成片微调，保留最后的反差。</p>}
        <p className="video-check"><Check size={14}/>{t.check}</p>
        <details className="video-edit"><summary>编辑场景与分段剧情</summary><div className="video-edit-fields"><Field label="名称"><input value={t.name} maxLength={100} onChange={e=>templateUpdate({name:e.target.value})}/></Field><Field label="接话文案"><input value={t.caption} maxLength={100} onChange={e=>templateUpdate({caption:e.target.value})}/></Field><Field label="这个梗的反差"><input value={t.hook} onChange={e=>templateUpdate({hook:e.target.value})}/></Field><Field label="场景（英文）"><textarea rows={3} value={t.scene} onChange={e=>templateUpdate({scene:e.target.value})}/></Field><Field label="首帧姿势（英文）"><textarea rows={3} value={t.pose} onChange={e=>templateUpdate({pose:e.target.value})}/></Field>{t.beats.map((beat,i)=><Field key={i} label={`${timeline[i].label} / ${timeline[i].start.toFixed(2)}—${timeline[i].end.toFixed(2)}s（英文）`}><textarea rows={3} value={beat} onChange={e=>templateUpdate({beats:t.beats.map((b,n)=>n===i?e.target.value:b) as MotionTemplate['beats']})}/></Field>)}<Field label="声音（英文）"><textarea rows={2} value={t.sound} onChange={e=>templateUpdate({sound:e.target.value})}/></Field><Field label="收尾方式"><select disabled={Boolean(t.theatre)} value={String(t.loop)} onChange={e=>templateUpdate({loop:e.target.value==='true'})}><option value="true">回到起势，便于循环裁切</option><option value="false">停在最后反应上</option></select></Field><button className="button quiet" disabled={workspace.cards.length===1} onClick={removeCard}><Trash2 size={14}/> 从本工作区移除这张配方</button></div></details>
      </section>
      <aside className="video-prompt-panel" aria-label="提示词编辑器"><div className="video-prompt-title"><span>生成配方</span><span className="video-h3-badge">H3</span></div><div className="video-prompt-tabs"><button className={tab==='video'?'active':''} onClick={()=>setTab('video')}>视频提示词</button><button className={tab==='frame'?'active':''} onClick={()=>setTab('frame')}>首帧生图</button></div>
        <div className="video-mode-row"><Field label="输入模式"><select value={card.mode} onChange={e=>cardUpdate({mode:e.target.value as VideoCard['mode']})}><option value="I2VA">I2VA · 从首帧开始</option><option value="Ref2VA">Ref2VA · 角色参考</option></select></Field><Field label="时长"><select value={card.duration} onChange={e=>cardUpdate({duration:Number(e.target.value) as VideoCard['duration']})}>{[4,6,8].map(d=><option key={d} value={d}>{d} 秒</option>)}</select></Field></div>
        <div className="video-reference-note"><span>上传顺序</span><strong>Picture 1 → {tab==='frame'?'角色母版':card.mode==='I2VA'?'当前场景首帧':'角色母版'}</strong><small>{tab==='frame'?'生成单张起势图，再绑定到左侧。':card.mode==='I2VA'?'首帧确定角色、构图和场景。':'母版只约束角色，场景由提示词描述。'}</small></div>
        <div className="video-prompt-meta"><span>{tab==='frame'?'首帧图像描述':editedCurrent?(card.edited!.source==='ai'?'AI 已改写 · 结构已检查':'手动编辑稿'):'官方 Skill 格式 · 本地草稿'}</span>{tab==='video'&&editedCurrent&&<button title="恢复模板生成稿" onClick={()=>cardUpdate({edited:undefined})}><RotateCcw size={12}/>恢复</button>}</div>
        <textarea className="video-prompt-text" aria-label={tab==='video'?'H3 视频提示词':'首帧生图提示词'} spellCheck={false} value={tab==='video'?prompt:firstFramePrompt(project.character,workspace,card)} readOnly={tab==='frame'} onChange={e=>cardUpdate({edited:{text:e.target.value,signature:promptSignature(project.character,workspace,card),source:'manual'}})}/>
        {tab==='video'&&issues.length>0&&<p className="video-warning" role="status">{issues[0]}</p>}
        {card.edited&&!editedCurrent&&<p className="video-warning">设定已改动，当前展示重建后的草稿。<button onClick={()=>saveText('previous-prompt.txt',card.edited!.text)}>下载上次编辑稿</button></p>}
        <button className="button primary full video-copy" disabled={busy} onClick={()=>void run(()=>copy(tab==='video'?prompt:firstFramePrompt(project.character,workspace,card)))}><Copy size={16}/>复制{tab==='video'?'完整 H3 提示词':'首帧生图提示词'}</button>
        <div className="video-secondary-actions"><button onClick={()=>saveText(`${t.name}-${tab}.txt`,tab==='video'?prompt:firstFramePrompt(project.character,workspace,card))}><Download size={13}/>下载 TXT</button><a href="https://hailuoai.com/" target="_blank" rel="noreferrer">打开海螺 <ArrowUpRight size={13}/></a></div>
        <details className="video-ai"><summary><Sparkles size={13}/>可选：让文字 AI 整理英文与动作</summary><p>发送本配方与角色文字设定到你配置的接口，不发送图片。可能产生文字模型费用。返回内容会检查字段与引用，仍需核对动作。</p><button className="button secondary small" disabled={busy} onClick={()=>void run(rewrite)}>{busy?<LoaderCircle size={13} className="spin"/>:<Sparkles size={13}/>}发送草稿并改写</button><button className="text-button" disabled={busy} onClick={()=>void run(openSettings)}>配置文字接口</button><button className="text-button" onClick={()=>void run(()=>copy(rewriteTask(project.character,workspace,card)))}>复制给其他 AI 的改写任务</button></details>
        <p className="video-format-note"><a href={h3Source} target="_blank" rel="noreferrer">MiniMax H3 格式依据 ↗</a><br/>此处准备素材和提示词，视频由你在官方平台生成。时长与模式以平台实际选项为准。</p>
      </aside>
    </div>
    <footer className="video-export-bar"><div><span className="video-export-number">{String(selected.length).padStart(2,'0')}</span><span><strong>张配方，准备带走</strong><small>{complete.length} 张配图合格 · {selectedConflict?'所选剧情首帧重复，请先替换':'ZIP 内含图片、完整提示词与可复用模板'}</small></span></div><button className="button secondary" onClick={()=>{saveText('reusable-motion-templates.json',JSON.stringify(portableTemplates(selected.map(c=>c.template)),null,2),'application/json');}}><FileJson size={16}/>只导出模板</button><button className="button primary" disabled={busy||!selected.length||complete.length!==selected.length} onClick={()=>void run(exportPack)}><Download size={16}/>打包图片与提示词</button></footer>
    <input hidden type="file" accept="image/png,image/jpeg,image/webp" ref={frameInput} onChange={e=>{const file=e.target.files?.[0];if(file)void run(()=>upload(file,'frame'));e.target.value='';}}/>
    <input hidden type="file" accept="image/png,image/jpeg,image/webp" ref={masterInput} onChange={e=>{const file=e.target.files?.[0];if(file)void run(()=>upload(file,'master'));e.target.value='';}}/>
    <input hidden type="file" accept="application/json,.json" ref={importInput} onChange={e=>{const file=e.target.files?.[0];if(file)void run(()=>importTemplates(file));e.target.value='';}}/>
    {modal==='library'&&<Modal title="好动作，可以换个角色再来一次。" subtitle="保存场景、角色动机、分段剧情与反差收尾；换角色后重新配图。" wide onClose={()=>setModal(null)}><div className="video-modal-actions"><button className="button secondary" onClick={()=>importInput.current?.click()}><Upload size={14}/>导入模板 JSON</button><button className="button secondary" onClick={()=>void run(()=>download('/api/video/templates/export','saved-motion-templates.json'))}><Download size={14}/>导出我的收藏</button><button className="button secondary" disabled={busy} onClick={()=>void run(saveTemplate)}><Save size={14}/>收藏当前动作</button></div><div className="video-template-grid">{[...library,...motionTemplates].map(item=><article key={item.id}><span>{item.emoji}</span><small>{library.some(t=>t.id===item.id)?'我的收藏':item.category}</small><h3>{item.name}</h3><p>{item.hook}</p><button className="button secondary small" onClick={()=>addTemplate(item)}><Plus size={13}/>用于当前角色</button>{library.some(t=>t.id===item.id)&&<button className="icon-button" aria-label={`删除收藏 ${item.name}`} onClick={()=>void run(async()=>{await api(`/api/video/templates/${item.id}`,{method:'DELETE'});setLibrary(old=>old.filter(t=>t.id!==item.id));})}><X size={13}/></button>}</article>)}</div></Modal>}
    {modal==='master'&&<Modal title="动态表情的角色母版" subtitle="选已确认造型的单人图。此处更换不会覆盖静态表情工坊的母版。" wide onClose={()=>setModal(null)}><div className="video-modal-actions"><button className="button primary" disabled={busy} onClick={()=>masterInput.current?.click()}><Upload size={15}/>上传新母版</button>{master&&<button className="button secondary" onClick={()=>void run(()=>download(master.url,`${project.character.name}-母版.png`))}><Download size={15}/>下载当前母版</button>}<input aria-label="搜索已有素材" placeholder="搜索已有素材文件名" value={assetSearch} onChange={e=>setAssetSearch(e.target.value)}/></div><div className="video-asset-grid">{assets.filter(a=>a.filename.toLowerCase().includes(assetSearch.toLowerCase())).slice().reverse().slice(0,100).map(a=><button key={a.id} className={a.id===master?.id?'active':''} onClick={()=>{update({masterAssetId:a.id});setModal(null);}}><img src={a.url} alt={a.filename} loading="lazy"/><span>{a.filename}</span></button>)}</div><p>最多展示 100 张匹配素材。使用上方搜索定位文件。</p></Modal>}
    {modal==='settings'&&<Modal title="可选的文字改写接口" subtitle="OpenAI 兼容 Chat Completions 接口；与工坊的生图接口分别保存。" onClose={()=>setModal(null)}><form className="simple-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const saved=await api<typeof textSettings>('/api/video/text-settings',{method:'PUT',body:JSON.stringify(textSettings)});setTextSettings({...saved,apiKey:''});setModal(null);notify('文字接口已保存。');});}}><Field label="API Base URL"><input required value={textSettings.baseUrl} onChange={e=>setTextSettings({...textSettings,baseUrl:e.target.value})} placeholder="https://example.com/v1"/></Field><Field label="文字模型名称"><input required value={textSettings.model} onChange={e=>setTextSettings({...textSettings,model:e.target.value})}/></Field><Field label={textSettings.hasApiKey?'API Key（已保存，留空保留）':'API Key'}><input type="password" autoComplete="off" value={textSettings.apiKey} onChange={e=>setTextSettings({...textSettings,apiKey:e.target.value})}/></Field><p>保存不会调用模型。只有点击“发送草稿并改写”才发送文字请求；密钥不会进入模板或 ZIP。</p><button className="button primary" disabled={busy}>保存接口</button></form></Modal>}
    {modal==='sources'&&<ReactionResearch onClose={()=>setModal(null)} />}
    {modal==='frames'&&<Modal title="一条剧情，一张自己的首帧。" subtitle="每张图对应下方唯一剧情；点击卡片回到该条配方。" wide onClose={()=>setModal(null)}><div className="video-frame-overview">{workspace.cards.filter(c=>!c.archived).map((c,i)=>{const asset=assets.find(a=>a.id===c.frame?.assetId),valid=frameReady(project.character,workspace,c),shared=sharedWith(c.id);return <button key={c.id} onClick={()=>{update({activeId:c.id});setShowArchive(false);setModal(null);}}><span className="video-overview-number">{String(i+1).padStart(2,'0')}</span>{asset?<img src={asset.url} alt={`${c.template.name}专属首帧`}/>:<div className="video-overview-empty"><ImagePlus size={25}/></div>}<strong>{c.template.name}</strong><small>{shared?'首帧重复，需替换':valid?'独立首帧已配':'需要制作专属首帧'}</small></button>;})}</div></Modal>}
  </div>;
}
