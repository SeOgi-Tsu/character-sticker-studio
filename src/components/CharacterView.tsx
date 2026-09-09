import { useRef } from 'react';
import { ArrowRight, Check, Clock3, Eye, History, ImagePlus, LoaderCircle, Sparkles, Upload, WandSparkles } from 'lucide-react';
import type { Asset, Catalog, Character, Job, Project } from '../shared/types';
import type { StartMode } from '../lib/onboarding';
import { Field, Status, UploadArea } from './Common';
import './CharacterWorkflow.css';

export default function CharacterView({ project, assets, jobs, catalog, onChange, onUpload, onGenerate, onNiji, busy, uploading, anchorMode = false, entryMode, onNext, onHistory, onPreview }: {
  project: Project; assets: Asset[]; jobs: Job[]; catalog: Catalog;
  onChange: (value: Partial<Project>) => void;
  onUpload: (file: File, target: 'reference' | 'anchor') => void;
  onGenerate: (kind: 'character' | 'anchor') => void;
  onNiji: () => void; busy: boolean; uploading: boolean; anchorMode?: boolean;
  entryMode?: StartMode; onNext?: () => void; onHistory?: () => void; onPreview?: (job: Job) => void;
}) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const candidateSection = useRef<HTMLElement>(null);
  const character = project.character;
  const customOutfit = character.outfitMode === 'custom';
  const patch = (value: Partial<Character>) => onChange({ character: { ...character, ...value } });
  const reference = assets.find(a => a.id === character.referenceAssetId);
  const anchor = assets.find(a => a.id === character.anchorAssetId);
  const kind = anchorMode ? 'anchor' : 'character';
  const selected = anchorMode ? anchor : reference;
  const related = jobs.filter(j => j.projectId === project.id && j.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.updatedAt.localeCompare(a.updatedAt));
  const active = related.filter(job => job.status === 'queued' || job.status === 'running');
  const hasCandidates = related.some(job => job.status === 'succeeded' && job.asset);
  const hasPriorImage = hasCandidates || Boolean(selected);
  const generationDisabled = busy || uploading || active.length > 0 || (anchorMode ? !reference : !character.name.trim());
  const generationLabel = anchorMode ? (hasPriorImage ? '再生成一张母版' : '生成一张 Q 版母版') : (hasPriorImage ? '再生成一张角色图' : '云端生成角色图');
  const statusNote = active.length > 0
    ? `${active.length} 张${anchorMode ? '母版' : '角色图'}正在${active.some(job => job.status === 'running') ? '生成' : '排队'}，完成后会出现在候选中。`
    : hasPriorImage ? '可以继续生成，每张都会保留为候选。选中喜欢的一张再前往下一步。' : '生成后先查看候选，再选一张作为后续绘图的参考。';
  const entryHint = anchorMode
    ? reference ? '原角色已经就位。先选画风，再生成或导入母版；满意后继续制作表情。' : '已有母版可以直接导入。需要生成时，先在角色设定中选定参考图，再回来选择画风。'
    : entryMode === 'existing'
      ? '先上传你的立绘、三视图或角色参考图。补充少量外貌说明后，就能继续制作 Q 版母版。'
      : entryMode === 'scratch'
        ? '从名字和一句话设定开始。可用已配置的云端 API 出图，也可到 Niji 7 官方生成后导入。'
        : '已有角色可直接上传；也可以编辑设定后生成角色图，再从候选中选定一张。';
  const generationButton = <button className={`button ${(selected && onNext) || (!anchorMode && entryMode === 'existing') ? 'secondary' : 'primary'}`} disabled={generationDisabled} onClick={() => { if (!generationDisabled) onGenerate(kind); }}>{active.length > 0 ? <LoaderCircle size={16} className="spin" /> : <WandSparkles size={16} />}{active.length > 0 ? (anchorMode ? '母版正在生成' : '角色图正在生成') : generationLabel}</button>;
  return <div className={`character-view character-workflow ${!anchorMode && entryMode === 'scratch' ? 'entry-scratch' : ''}`}>
    <div className="section-heading"><div><span className="eyebrow">{anchorMode ? '02 / LITTLE ALTER EGO' : '01 / MEET YOUR CHARACTER'}</span><h1>{anchorMode ? <>小小一只，<em>可爱加倍。</em></> : <>每个表情，<em>从角色开始。</em></>}</h1><p>{anchorMode ? '先选一个喜欢的画风，制作整套表情共用的 Q 版母版。' : '描述一个新朋友，或直接带上你已经喜爱的角色。'}</p></div><span className="section-doodle"><Sparkles size={45} strokeWidth={1.2} /></span></div>
    <section className="character-workflow-bar" aria-label={anchorMode ? '母版制作步骤' : '角色图制作步骤'}>
      <div className="workflow-entry"><span className="workflow-step" aria-hidden="true">{anchorMode ? '02' : '01'}</span><div><strong>{selected ? (anchorMode ? '母版已选定，可以制作表情了' : '角色参考已选定，可以制作母版了') : (anchorMode ? '把原角色变成小小一只' : entryMode === 'existing' ? '把你的角色带进来' : '先给角色一个清楚的样子')}</strong><p>{entryHint}</p></div></div>
      <div className="workflow-actions">
        {selected && onNext ? <button className="button primary" disabled={busy || uploading} onClick={onNext}>{anchorMode ? '下一步：制作表情' : '下一步：制作 Q 版母版'}<ArrowRight size={16} /></button> : !anchorMode && entryMode === 'existing' && !selected ? <button className="button primary" disabled={busy || uploading} onClick={() => uploadInput.current?.click()}><Upload size={16} />上传角色图</button> : null}
        {generationButton}
        {onHistory && <button className="text-button workflow-history" disabled={busy || uploading} onClick={onHistory}><History size={14} />生成记录</button>}
      </div>
      <div className="workflow-status-row"><p className={active.length > 0 ? 'workflow-progress' : ''} role="status" aria-live="polite">{active.length > 0 ? <LoaderCircle size={13} className="spin" /> : <span className="workflow-status-dot" />}<span>{statusNote}</span></p>{related.length > 0 && <button className="text-button" onClick={() => candidateSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>查看 {related.length} 张候选 ↓</button>}</div>
      {anchorMode && !reference && <p className="workflow-required">先在「角色设定」上传或选定一张角色参考图，再生成母版；已有母版也可直接导入。</p>}
      {!anchorMode && !character.name.trim() && <p className="workflow-required">先填一个角色名字，再使用云端生成。</p>}
    </section>
    <input ref={uploadInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { if (e.target.files?.[0] && !busy && !uploading) onUpload(e.target.files[0], kind === 'anchor' ? 'anchor' : 'reference'); e.target.value = ''; }} />
    <div className="character-columns">
      <section className="paper-panel character-form">
        <div className="panel-heading"><span className="eyebrow">{anchorMode ? 'STYLE DIRECTION' : 'CHARACTER PROFILE'}</span><span className="tiny-label">可随时修改</span></div>
        {anchorMode ? <>
          <h2>选一个可爱方向</h2>
          <div className="anchor-style-list">{catalog.styles.map((style, index) => <button key={style.id} className={project.styleId === style.id ? 'active' : ''} onClick={() => onChange({ styleId: style.id })}><span className="style-number">0{index + 1}</span><span><strong>{style.name}</strong><small>{style.description}</small></span>{project.styleId === style.id && <Check size={18} />}</button>)}</div>
          <div className="info-note"><ImagePlus size={19} /><span>{customOutfit ? '服装按「角色设定」中的换装文字生成。母版统一脸型、线条和比例，选定后用于整套表情。' : '原始角色图决定服装结构，母版统一脸型、线条和比例。领口、开衫开合与服装层次沿用原图。'}</span></div>
        </> : <>
          <Field label="角色名字"><input value={character.name} maxLength={80} onChange={e => patch({ name: e.target.value })} placeholder="想怎么称呼她 / 他？" /></Field>
          <Field label="一句话设定 / 脚本摘录" hint="提取最重要的角色信息；生成前可再编辑。"><textarea rows={3} value={character.description} onChange={e => patch({ description: e.target.value })} placeholder="例如：住在云朵里的小魔女，有一点嘴硬，很喜欢贴贴。" /></Field>
          <div className="workflow-niji-note"><span>想用 Niji 画三视图？</span><button className="text-button" disabled={busy || uploading} onClick={onNiji}>Niji 7 工坊 <ArrowRight size={14} /></button><small>生成提示词 → 到官方平台出图 → 导入本工坊。</small></div>
          <Field label="绝对不能变的外貌特征"><textarea rows={3} value={character.identity} onChange={e => patch({ identity: e.target.value })} placeholder="发色、发型、眼睛、标志饰件……" /></Field>
          <Field label="服装依据" hint={customOutfit ? '按下方文字主动换装；外貌特征继续沿用角色参考图。' : '原始角色图决定服装结构，Q 版母版只定脸型与画风；保留领口和开衫开合。没有原图时使用文字设定。'}><select value={character.outfitMode ?? 'reference'} onChange={e => patch({ outfitMode: e.target.value as Character['outfitMode'] })}><option value="reference">沿用原图服装（默认）</option><option value="custom">按文字换装</option></select></Field>
          <Field label={customOutfit ? '换装描述与配件' : '服饰与配件'}><textarea rows={2} value={character.outfit} onChange={e => patch({ outfit: e.target.value })} placeholder={customOutfit ? '描述想更换的衣服、领口、穿法与配件' : '补充原图中的领口、开衫穿法与标志配件'} /></Field>
          <Field label="性格与语气"><textarea rows={2} value={character.personality} onChange={e => patch({ personality: e.target.value })} placeholder="软乎乎 / 嘴硬心软 / 一本正经地搞怪" /></Field>
          <section className="persona-panel" aria-label="角色表情人格">
            <div className="panel-heading"><span className="eyebrow">HER OWN LITTLE HUMOR</span><Sparkles size={16} /></div>
            <h3>让笑点，也像她本人</h3>
            <p>写下她怎么逗人、想赢什么，以及嘴硬被识破时的小反应。</p>
            {(catalog.personas || []).length > 0 && <div className="persona-presets" role="group" aria-label="表情人格预设">{catalog.personas.map(persona => <button type="button" key={persona.id} className={character.memePersona === persona.brief ? 'active' : ''} aria-pressed={character.memePersona === persona.brief} title={persona.description} onClick={() => patch({ memePersona: persona.brief })}>{persona.name}<small>{persona.description}</small></button>)}</div>}
            <Field label="表情人格简要" hint="预设会填入下方文字，可继续改写；只影响表演与笑点，服装仍按上面的设定。"><textarea aria-label="表情人格简要" rows={5} maxLength={1200} value={character.memePersona || ''} onChange={e => patch({ memePersona: e.target.value })} placeholder="例如：爱逗人、好胜又嘴硬的成年角色。得意时先歪头挑眉；一被夸奖就慌张转开视线，却悄悄靠近。台词短，偶尔用很小声的补充暴露心软。" /></Field>
            <div className="persona-counter">{(character.memePersona || '').length} / 1200 · 下次生成时生效</div>
            <div className="signature-motifs"><Field label="专属小道具与符号（可选）" hint="只用于表情里的小道具和呼应元素，不改变原服装；留空不额外添加。"><textarea aria-label="专属小道具与符号" rows={3} maxLength={400} value={character.signatureMotifs || ''} onChange={e => patch({ signatureMotifs: e.target.value })} placeholder="例如：让道具呼应原有的黑蝴蝶结与金色心形饰件；偶尔用金心点心、心形抱枕。" /></Field><div className="persona-counter">{(character.signatureMotifs || '').length} / 400 · 可留空</div></div>
          </section>
        </>}
      </section>
      <section className="paper-panel reference-panel"><div className="panel-heading"><span className="eyebrow">{anchorMode ? 'CHIBI ANCHOR' : 'CHARACTER REFERENCE'}</span><span className="pill">{selected ? '已选定' : '等待参考图'}</span></div><UploadArea asset={selected} onUpload={file => onUpload(file, anchorMode ? 'anchor' : 'reference')} busy={uploading || busy} label={anchorMode ? '导入现成的 Q 版母版' : '上传你的角色立绘'} />
        <p className="reference-caption">{anchorMode ? customOutfit ? '母版用于统一 Q 版画风与换装形象，动作与构图由每张表情决定。' : '母版用于统一 Q 版画风；服装以原始角色图为准，动作与构图由每张表情决定。' : '支持直接上传立绘、三视图或 Niji 生成的角色图。'}<br />仅导入你有权使用的素材。</p>
        {(anchorMode ? anchor : reference) && <div className="asset-detail"><span>{(anchorMode ? anchor : reference)?.width} × {(anchorMode ? anchor : reference)?.height}</span><span>{(anchorMode ? anchor : reference)?.hasAlpha ? '含 Alpha 通道' : '实色背景'}</span><a href={(anchorMode ? anchor : reference)?.url} target="_blank" rel="noreferrer">查看原图</a></div>}
      </section>
    </div>
    <section className="candidate-section workflow-candidates" ref={candidateSection} aria-label={anchorMode ? '母版候选' : '角色图候选'}><div className="section-subheading"><div><h2>{anchorMode ? '你的母版候选' : '角色图候选'}</h2><p>最新的放在前面，之前的选择也都留着。</p></div><span>{related.length} 张记录 · 点击预览后选用</span></div>
      {related.length > 0 ? <div className="candidate-grid">{related.map(job => {
        const chosen = Boolean(job.asset && selected?.id === job.asset.id);
        const completed = job.status === 'succeeded' && job.asset;
        const date = new Date(job.createdAt);
        const createdLabel = Number.isNaN(date.getTime()) ? '记录时间未知' : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        return <article className={`candidate-card ${chosen ? 'chosen' : ''}`} key={job.id}>
          <div className="candidate-image">{job.asset ? <>{onPreview ? <button className="candidate-preview-button" onClick={() => onPreview(job)} aria-label={`预览 ${job.name}`}><img src={job.asset.url} alt={job.name} loading="lazy" /><span><Eye size={14} />预览</span></button> : <a className="candidate-preview-button" href={job.asset.url} target="_blank" rel="noreferrer" aria-label={`预览 ${job.name}`}><img src={job.asset.url} alt={job.name} loading="lazy" /><span><Eye size={14} />预览</span></a>}{chosen && <span className="candidate-selected-badge"><Check size={12} />当前选用</span>}</> : <div className="candidate-placeholder"><ImagePlus size={32} /><span>{job.status === 'queued' ? '等待生成' : job.status === 'running' ? '正在绘制这一张' : '这张还没有图片'}</span></div>}</div>
          <div className="workflow-candidate-details"><strong title={job.name}>{job.name}</strong><time dateTime={job.createdAt} title={Number.isNaN(date.getTime()) ? undefined : date.toLocaleString('zh-CN')}><Clock3 size={11} />{createdLabel}</time></div>
          <div className="candidate-bottom"><Status status={job.status} />{completed && <button className="button small secondary" disabled={chosen || busy || uploading} onClick={() => patch(anchorMode ? { anchorAssetId: job.asset!.id } : { referenceAssetId: job.asset!.id })}>{chosen ? <><Check size={14} />已选定</> : '使用这张'}</button>}</div>{job.error && <p className="job-error">{job.error}</p>}
        </article>;
      })}</div> : <div className="workflow-empty-candidates"><ImagePlus size={22} /><p>第一张{anchorMode ? '母版' : '角色图'}会出现在这里。<br /><span>上传或生成都可以，之后还能继续添加。</span></p></div>}
    </section>
  </div>;
}
