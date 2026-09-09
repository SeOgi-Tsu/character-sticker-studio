import { useState } from 'react';
import { ArrowDownToLine, ChevronDown, ChevronUp, Eye, Heart, RotateCcw, Sparkles, Type, WandSparkles } from 'lucide-react';
import type { Caption, Job, Reaction } from '../shared/types';
import { Field, Status } from './Common';

export function defaultCaption(reaction: Reaction): Caption { return { text: reaction.caption, enabled: true, color: '#ffffff', stroke: '#382537', position: 'bottom', fontSize: 52 }; }

export default function StickerInspector({ reaction, caption, job, onReaction, onCaption, onGenerate, onRetry, onDownload, onPreview, busy, dirty, revision }: {
  reaction?: Reaction; caption?: Caption; job?: Job;
  onReaction: (value: Partial<Reaction>) => void; onCaption: (value: Caption) => void;
  onGenerate: () => void; onRetry: (job: Job) => void; onDownload: (job: Job) => void;
  onPreview: (job: Job) => void; busy: boolean; dirty: boolean; revision: string;
}) {
  const [dark, setDark] = useState(false);
  const [previewSize, setPreviewSize] = useState(160);
  const [showPrompt, setShowPrompt] = useState(false);
  if (!reaction) return <aside className="inspector empty-inspector"><Sparkles size={28} /><h3>给表情一点个性</h3><p>点开任意卡片，修改动作和文字。</p></aside>;
  const text = caption ?? defaultCaption(reaction);
  return <aside id="sticker-inspector" className="inspector"><div className="inspector-header"><span className="eyebrow">A LITTLE MORE YOU</span><span className="tiny-label">单张编辑</span></div>
    <div className="inspector-title"><h2>{reaction.name}</h2><span className="reaction-category">{reaction.category}</span></div>
    <div className={`chat-preview ${dark ? 'dark' : ''}`}><span className="preview-label">CHAT PREVIEW / {previewSize}px</span><div className="chat-bubble">{job?.asset ? <button className="mini-preview" style={{ width: previewSize, height: previewSize }} onClick={() => onPreview(job)} aria-label="放大查看表情"><img src={!dirty ? `/api/jobs/${job.id}/render?size=512&caption=1&v=${encodeURIComponent(revision)}` : job.asset.url} alt={reaction.name} />{dirty && text.enabled && <span className={`local-caption ${text.position}`} style={{ color: text.color, WebkitTextStroke: `${Math.max(1, text.fontSize / 35)}px ${text.stroke}`, fontSize: text.fontSize * previewSize / 512 }}>{text.text}</span>}</button> : <div className="pre-generation-preview" style={{ width: previewSize, minHeight: previewSize }}><Heart size={27} strokeWidth={1.5} /><strong>{text.text || reaction.name}</strong><small>动作方案 · 尚未生成</small></div>}</div><div className="preview-controls"><div className="segmented small"><button className={previewSize === 96 ? 'active' : ''} onClick={() => setPreviewSize(96)}>96px</button><button className={previewSize === 160 ? 'active' : ''} onClick={() => setPreviewSize(160)}>160px</button></div><button className={`background-dot ${dark ? 'selected' : ''}`} aria-label={dark ? '切换浅色背景' : '切换深色背景'} onClick={() => setDark(!dark)} /></div></div>
    {job && <div className="inspector-job-state"><Status status={job.status} />{job.asset && <span>{job.asset.hasAlpha ? '含 Alpha' : '实色背景'}</span>}</div>}
    {dirty && job?.asset && <p className="field-hint preview-save-hint">文字为编辑预览，保存后更新实际排字。</p>}
    <Field label="表情名称"><input value={reaction.name} maxLength={80} onChange={e => onReaction({ name: e.target.value })} /></Field>
    <Field label="动作与情绪" hint="一个清楚的主动作，小图也能一眼看懂。"><textarea rows={4} value={reaction.action} onChange={e => onReaction({ action: e.target.value })} /></Field>
    <div className="caption-heading"><span><Type size={15} />表情文字</span><label className="toggle"><input type="checkbox" aria-label="启用表情文字" checked={text.enabled} onChange={e => onCaption({ ...text, enabled: e.target.checked })} /><span /></label></div>
    <input className="caption-input" aria-label="表情文案" value={text.text} maxLength={48} placeholder="也可以不加字" onChange={e => onCaption({ ...text, text: e.target.value })} disabled={!text.enabled} />
    {text.enabled && <div className="caption-settings"><div className="form-row"><Field label="字色"><input type="color" aria-label="文字颜色" value={text.color} onChange={e => onCaption({ ...text, color: e.target.value })} /></Field><Field label="描边"><input type="color" aria-label="描边颜色" value={text.stroke} onChange={e => onCaption({ ...text, stroke: e.target.value })} /></Field><Field label="位置"><select aria-label="文字位置" value={text.position} onChange={e => onCaption({ ...text, position: e.target.value as Caption['position'] })}><option value="bottom">底部</option><option value="top">顶部</option></select></Field></div><Field label={`字号 · ${text.fontSize}px`}><input type="range" min={20} max={96} value={text.fontSize} onChange={e => onCaption({ ...text, fontSize: Number(e.target.value) })} /></Field></div>}
    <button className="button secondary full inspector-generate" disabled={busy} onClick={onGenerate}><WandSparkles size={16} />{job?.asset ? '按当前方案再画一张' : '先生成这一张'}</button>
    {job?.asset && <div className="split-actions"><button className="button small quiet" onClick={() => onPreview(job)}><Eye size={14} />大图</button><button className="button small quiet" onClick={() => onDownload(job)}><ArrowDownToLine size={14} />PNG</button></div>}
    {job && ['failed', 'unknown', 'cancelled'].includes(job.status) && <button className="button small quiet full" disabled={busy} onClick={() => onRetry(job)}><RotateCcw size={14} />使用原任务配方重试</button>}
    {job?.error && <p className="job-error">{job.error}</p>}
    {job && <div className="prompt-disclosure"><button onClick={() => setShowPrompt(!showPrompt)}>查看实际生成提示词 {showPrompt ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>{showPrompt && <pre>{job.prompt}</pre>}</div>}
  </aside>;
}
