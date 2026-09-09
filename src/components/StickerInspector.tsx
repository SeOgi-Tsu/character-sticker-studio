import { useState } from 'react';
import { ArrowDownToLine, ChevronDown, ChevronUp, Eye, Heart, RotateCcw, Sparkles, WandSparkles } from 'lucide-react';
import type { Caption, CaptionStyle, Composition, Interaction, Intensity, Job, Reaction } from '../shared/types';
import { captionStyles as sharedCaptionStyles, defaultCaptionFor, resolveCaptionMode } from '../shared/typography';
import { canResumeJob } from '../lib/jobs';
import { Field, Status } from './Common';
import CaptionEditor from './CaptionEditor';

const intensityOptions: { value: Intensity; label: string; description: string }[] = [
  { value: 1, label: '轻轻的', description: '动作克制，留一点安静和害羞。' },
  { value: 2, label: '心动一下', description: '情绪鲜明，接触和动作一眼能懂。' },
  { value: 3, label: '可爱犯规', description: '夸张透视与表演，把可爱或笑点推到最前面。' },
];

export default function StickerInspector({ reaction, compositions, interactions = [], captionStyles = sharedCaptionStyles, caption, job, onReaction, onCaption, onGenerate, onRetry, onResume, onDownload, onPreview, busy, dirty, revision }: {
  reaction?: Reaction; compositions: Composition[]; interactions?: Interaction[]; captionStyles?: CaptionStyle[]; caption?: Caption; job?: Job;
  onReaction: (value: Partial<Reaction>) => void; onCaption: (value: Caption) => void;
  onGenerate: () => void; onRetry: (job: Job) => void; onResume: (job: Job) => void; onDownload: (job: Job) => void;
  onPreview: (job: Job) => void; busy: boolean; dirty: boolean; revision: string;
}) {
  const [dark, setDark] = useState(false);
  const [previewSize, setPreviewSize] = useState(160);
  const [showPrompt, setShowPrompt] = useState(false);
  if (!reaction) return <aside className="inspector empty-inspector"><Sparkles size={28} /><h3>给表情一点个性</h3><p>点开任意卡片，修改动作和文字。</p></aside>;
  const text = caption ?? defaultCaptionFor(reaction);
  const mode = resolveCaptionMode(text);
  const embedded = job?.textMode === 'generated';
  const localOverlay = dirty && mode === 'overlay' && !embedded;
  const lettering = (captionStyles.length ? captionStyles : sharedCaptionStyles).find(item => item.id === (text.styleId || 'classic')) || sharedCaptionStyles[0];
  const interaction = interactions.find(item => item.id === (reaction.interactionId || 'observe'));
  const intensity = reaction.intensity || 2;
  return <aside id="sticker-inspector" className="inspector"><div className="inspector-header"><span className="eyebrow">A LITTLE MORE YOU</span><span className="tiny-label">单张编辑</span></div>
    <div className="inspector-title"><h2>{reaction.name}</h2><span className="reaction-category">{reaction.category}</span></div>
    <div className={`chat-preview ${dark ? 'dark' : ''}`}><span className="preview-label">CHAT PREVIEW / {previewSize}px</span><div className="chat-bubble">{job?.asset ? <button className="mini-preview" style={{ width: previewSize, height: previewSize }} onClick={() => onPreview(job)} aria-label="放大查看表情"><img src={!dirty && !embedded ? `/api/jobs/${job.id}/render?size=512&caption=1&v=${encodeURIComponent(revision)}` : job.asset.url} alt={reaction.name} />{localOverlay && text.text && <span className={`local-caption ${text.position} caption-${text.styleId || 'classic'}`} style={{ color: text.color, fontFamily: lettering.fontFamily, WebkitTextStroke: `${Math.max(.45, text.fontSize / 45 * previewSize / 160)}px ${text.stroke}`, fontSize: text.fontSize * previewSize / 512, transform: `rotate(${text.rotation || 0}deg)` }}>{text.text}</span>}</button> : <div className="pre-generation-preview" style={{ width: previewSize, minHeight: previewSize }}><Heart size={27} strokeWidth={1.5} /><strong>{mode === 'none' ? reaction.name : text.text || reaction.name}</strong><small>动作方案 · 尚未生成</small></div>}</div><div className="preview-controls"><div className="segmented small"><button className={previewSize === 96 ? 'active' : ''} onClick={() => setPreviewSize(96)}>96px</button><button className={previewSize === 160 ? 'active' : ''} onClick={() => setPreviewSize(160)}>160px</button></div><button className={`background-dot ${dark ? 'selected' : ''}`} aria-label={dark ? '切换浅色背景' : '切换深色背景'} onClick={() => setDark(!dark)} /></div></div>
    {job && <div className="inspector-job-state"><Status status={job.status} />{job.asset && <span>{embedded ? '文字已在原图中' : job.asset.hasAlpha ? '含 Alpha' : '实色背景'}</span>}</div>}
    {localOverlay && job?.asset && <p className="field-hint preview-save-hint">这是排字草稿预览，保存后查看准确成品。</p>}
    <CaptionEditor caption={text} styles={captionStyles} job={job} onChange={onCaption} />
    <details className="performance-disclosure"><summary>镜头、互动与动作 <ChevronDown size={14} /></summary>
    <Field label="表情名称"><input value={reaction.name} maxLength={80} onChange={e => onReaction({ name: e.target.value })} /></Field>
    <Field label="镜头构图" hint={compositions.find(item => item.id === (reaction.compositionId || 'halfbody'))?.description || '旧配方默认半身，可自由切换。'}><select value={reaction.compositionId || 'halfbody'} onChange={e => onReaction({ compositionId: e.target.value as Reaction['compositionId'] })}>{compositions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    {interactions.length > 0 && <div className="interaction-editor">
      <Field label="怎么和你互动" hint={interaction?.description || '选择角色与看图人的互动关系。'}><select value={reaction.interactionId || 'observe'} onChange={e => onReaction({ interactionId: e.target.value as Reaction['interactionId'] })}>{interactions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <fieldset className="intensity-field"><legend className="field-label">表演张力</legend><div className="intensity-options">{intensityOptions.map(item => <label key={item.value} title={item.description}><input type="radio" name="reaction-intensity" value={item.value} checked={intensity === item.value} onChange={() => onReaction({ intensity: item.value })} /><span><i aria-hidden="true">{item.value === 1 ? '·' : item.value === 2 ? '✦' : '✷'}</i>{item.label}</span></label>)}</div><p className="field-hint">{intensityOptions.find(item => item.value === intensity)?.description}</p></fieldset>
      <Field label="希望对方看完…"><input value={reaction.intent || ''} maxLength={160} onChange={e => onReaction({ intent: e.target.value })} placeholder="想抱住、想摸摸，还是笑出声？" /></Field>
    </div>}
    <p className="field-hint generation-edit-hint">镜头、互动与动作在下次生成时生效。{job?.asset ? '当前成品仍是原图。' : '先选一种想传给对方的感受。'}</p>
    <Field label="动作与情绪" hint="一个清楚的主动作，小图也能一眼看懂。"><textarea rows={4} value={reaction.action} onChange={e => onReaction({ action: e.target.value })} /></Field>
    </details>
    <button className="button secondary full inspector-generate" disabled={busy || (mode === 'generated' && !text.text.trim())} onClick={onGenerate}><WandSparkles size={16} />{job?.asset ? '按当前方案再画一张' : '先生成这一张'}</button>
    {mode === 'generated' && !text.text.trim() && <p className="field-hint">填写文案后再生成，或选择「无字」。</p>}
    {job?.asset && <div className="split-actions"><button className="button small quiet" onClick={() => onPreview(job)}><Eye size={14} />大图</button><button className="button small quiet" onClick={() => onDownload(job)}><ArrowDownToLine size={14} />PNG</button></div>}
    {job && canResumeJob(job) ? <button className="button small quiet full" disabled={busy} onClick={() => onResume(job)}><RotateCcw size={14} />继续查询原任务</button> : job && ['failed', 'unknown', 'cancelled'].includes(job.status) && <button className="button small quiet full" disabled={busy} onClick={() => onRetry(job)}><RotateCcw size={14} />使用原任务配方重试</button>}
    {job?.remoteTaskId && <p className="remote-task-id">RunningHub 任务 <code>{job.remoteTaskId}</code>{canResumeJob(job) && <span>继续查询不会重新提交绘图。</span>}</p>}
    {job?.error && <p className="job-error">{job.error}</p>}
    {job && <div className="prompt-disclosure"><button onClick={() => setShowPrompt(!showPrompt)}>查看实际生成提示词 {showPrompt ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>{showPrompt && <pre>{job.prompt}</pre>}</div>}
  </aside>;
}
