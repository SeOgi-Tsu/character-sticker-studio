import { ArrowRight, Check, ImagePlus, Sparkles, WandSparkles } from 'lucide-react';
import type { Asset, Catalog, Character, Job, Project } from '../shared/types';
import { Field, Status, UploadArea } from './Common';

export default function CharacterView({ project, assets, jobs, catalog, onChange, onUpload, onGenerate, onNiji, busy, uploading, anchorMode = false }: {
  project: Project; assets: Asset[]; jobs: Job[]; catalog: Catalog;
  onChange: (value: Partial<Project>) => void;
  onUpload: (file: File, target: 'reference' | 'anchor') => void;
  onGenerate: (kind: 'character' | 'anchor') => void;
  onNiji: () => void; busy: boolean; uploading: boolean; anchorMode?: boolean;
}) {
  const character = project.character;
  const customOutfit = character.outfitMode === 'custom';
  const patch = (value: Partial<Character>) => onChange({ character: { ...character, ...value } });
  const reference = assets.find(a => a.id === character.referenceAssetId);
  const anchor = assets.find(a => a.id === character.anchorAssetId);
  const related = jobs.filter(j => j.projectId === project.id && j.kind === (anchorMode ? 'anchor' : 'character'));
  return <div className="character-view">
    <div className="section-heading"><div><span className="eyebrow">{anchorMode ? '02 / LITTLE ALTER EGO' : '01 / MEET YOUR CHARACTER'}</span><h1>{anchorMode ? <>小小一只，<em>可爱加倍。</em></> : <>每个表情，<em>从角色开始。</em></>}</h1><p>{anchorMode ? '先选一个喜欢的画风，制作整套表情共用的 Q 版母版。' : '描述一个新朋友，或直接带上你已经喜爱的角色。'}</p></div><span className="section-doodle"><Sparkles size={45} strokeWidth={1.2} /></span></div>
    <div className="character-columns">
      <section className="paper-panel character-form">
        <div className="panel-heading"><span className="eyebrow">{anchorMode ? 'STYLE DIRECTION' : 'CHARACTER PROFILE'}</span><span className="tiny-label">可随时修改</span></div>
        {anchorMode ? <>
          <h2>选一个可爱方向</h2>
          <div className="anchor-style-list">{catalog.styles.map((style, index) => <button key={style.id} className={project.styleId === style.id ? 'active' : ''} onClick={() => onChange({ styleId: style.id })}><span className="style-number">0{index + 1}</span><span><strong>{style.name}</strong><small>{style.description}</small></span>{project.styleId === style.id && <Check size={18} />}</button>)}</div>
          <div className="info-note"><ImagePlus size={19} /><span>{customOutfit ? '服装按「角色设定」中的换装文字生成。母版统一脸型、线条和比例，选定后用于整套表情。' : '原始角色图决定服装结构，母版统一脸型、线条和比例。领口、开衫开合与服装层次沿用原图。'}</span></div>
          <button className="button primary full" disabled={busy || !reference} onClick={() => onGenerate('anchor')}><WandSparkles size={17} />生成一张 Q 版母版</button>
          {!reference && <p className="field-hint">请先到「角色设定」上传或选定角色参考图。</p>}
        </> : <>
          <Field label="角色名字"><input value={character.name} maxLength={80} onChange={e => patch({ name: e.target.value })} placeholder="想怎么称呼她 / 他？" /></Field>
          <Field label="一句话设定 / 脚本摘录" hint="提取最重要的角色信息；生成前可再编辑。"><textarea rows={3} value={character.description} onChange={e => patch({ description: e.target.value })} placeholder="例如：住在云朵里的小魔女，有一点嘴硬，很喜欢贴贴。" /></Field>
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
          <div className="split-actions"><button className="button primary" disabled={busy || !character.name.trim()} onClick={() => onGenerate('character')}><WandSparkles size={16} />云端生成角色图</button><button className="button secondary" onClick={onNiji}>Niji 7 工坊 <ArrowRight size={16} /></button></div>
        </>}
      </section>
      <section className="paper-panel reference-panel"><div className="panel-heading"><span className="eyebrow">{anchorMode ? 'CHIBI ANCHOR' : 'CHARACTER REFERENCE'}</span><span className="pill">{(anchorMode ? anchor : reference) ? '已选定' : '等待参考图'}</span></div><UploadArea asset={anchorMode ? anchor : reference} onUpload={file => onUpload(file, anchorMode ? 'anchor' : 'reference')} busy={uploading} label={anchorMode ? '导入现成的 Q 版母版' : '上传你的角色立绘'} />
        <p className="reference-caption">{anchorMode ? customOutfit ? '母版用于统一 Q 版画风与换装形象，动作与构图由每张表情决定。' : '母版用于统一 Q 版画风；服装以原始角色图为准，动作与构图由每张表情决定。' : '支持直接上传立绘、三视图或 Niji 生成的角色图。'}<br />仅导入你有权使用的素材。</p>
        {(anchorMode ? anchor : reference) && <div className="asset-detail"><span>{(anchorMode ? anchor : reference)?.width} × {(anchorMode ? anchor : reference)?.height}</span><span>{(anchorMode ? anchor : reference)?.hasAlpha ? '含 Alpha 通道' : '实色背景'}</span><a href={(anchorMode ? anchor : reference)?.url} target="_blank" rel="noreferrer">查看原图</a></div>}
      </section>
    </div>
    {related.length > 0 && <section className="candidate-section"><div className="section-subheading"><h2>{anchorMode ? '你的母版候选' : '角色图候选'}</h2><span>{related.length} 张记录 · 选中后用于下一步</span></div><div className="candidate-grid">{related.map(job => <article className={`candidate-card ${(anchorMode ? character.anchorAssetId : character.referenceAssetId) === job.asset?.id ? 'chosen' : ''}`} key={job.id}><div className="candidate-image">{job.asset ? <img src={job.asset.url} alt={job.name} /> : <div className="candidate-placeholder"><ImagePlus size={32} /><Status status={job.status} /></div>}</div><div className="candidate-bottom"><Status status={job.status} />{job.asset && <button className="button small secondary" onClick={() => patch(anchorMode ? { anchorAssetId: job.asset!.id } : { referenceAssetId: job.asset!.id })}>{(anchorMode ? character.anchorAssetId : character.referenceAssetId) === job.asset.id ? <><Check size={14} />已选定</> : '使用这张'}</button>}</div>{job.error && <p className="job-error">{job.error}</p>}</article>)}</div></section>}
  </div>;
}
