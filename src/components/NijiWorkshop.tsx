import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Copy, ExternalLink, ImagePlus, Layers3, Sparkles } from 'lucide-react';
import type { Project } from '../shared/types';
import { buildNijiPrompt } from '../shared/prompts';
import { Field, UploadArea } from './Common';

export default function NijiWorkshop({ project, onUpload, uploading, onError }: { project: Project; onUpload: (file: File, target: 'reference' | 'anchor') => void; uploading: boolean; onError: (message: string) => void }) {
  const [layout, setLayout] = useState<'single' | 'turnaround' | 'detail'>('detail');
  const [stylize, setStylize] = useState(160);
  const [raw, setRaw] = useState(false);
  const [styleReference, setStyleReference] = useState('');
  const [custom, setCustom] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const generated = useMemo(() => {
    try { return { prompt: buildNijiPrompt(project.character, { layout, stylize, raw, styleReference }), error: '' }; }
    catch (error) { return { prompt: '', error: error instanceof Error ? error.message : '请检查风格参考格式' }; }
  }, [project.character, layout, stylize, raw, styleReference]);
  const prompt = custom ?? generated.prompt;
  function modify(callback: () => void) { callback(); setCustom(null); }
  async function copy() { try { await navigator.clipboard.writeText(prompt); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch { onError('无法访问剪贴板，请选中提示词后手动复制。'); } }
  return <div className="niji-view"><div className="section-heading"><div><span className="eyebrow">NIJI 7 / CHARACTER DESIGN WORKSHOP</span><h1>想象，<em>有了模样。</em></h1><p>把简单设定变成角色立绘、三视图与大头细节的完整提示词。</p></div><span className="section-doodle"><Layers3 size={45} strokeWidth={1.2} /></span></div>
    <div className="niji-columns"><section className="paper-panel"><span className="eyebrow">01 / COMPOSE YOUR SHEET</span><h2>角色设定图</h2><p className="subtle">使用「{project.character.name || '未命名角色'}」的外貌、服饰和性格信息。</p>
      <div className="layout-options">{([{ id: 'single', name: '单人立绘', desc: '完整造型 · 纵向构图', icon: ImagePlus }, { id: 'turnaround', name: '角色三视图', desc: '正面 / 侧面 / 背面', icon: Layers3 }, { id: 'detail', name: '三视图 + 大头细节', desc: '视角统一 · 服饰与饰件', icon: Sparkles }] as const).map(item => <button className={layout === item.id ? 'active' : ''} key={item.id} onClick={() => modify(() => setLayout(item.id))}><item.icon size={22} /><span><strong>{item.name}</strong><small>{item.desc}</small></span>{layout === item.id && <Check size={17} />}</button>)}</div>
      <Field label={`风格化程度 · ${stylize}`} hint="低值更贴近文字，高值让模型发挥更多审美。"><input type="range" min={0} max={1000} step={10} value={stylize} onChange={e => modify(() => setStylize(Number(e.target.value)))} /></Field>
      <Field label="风格参考（可选）" hint="填入你有权使用的公开图片 URL 或有效的 Style Reference 代码。"><input value={styleReference} placeholder="https://… 或风格代码" onChange={e => modify(() => setStyleReference(e.target.value))} aria-invalid={!!generated.error} />{generated.error && <span className="field-hint" role="status">{generated.error}</span>}</Field>
      <label className="check-label"><input type="checkbox" checked={raw} onChange={e => modify(() => setRaw(e.target.checked))} /><span>启用 Raw <small>更直接地遵循描述</small></span></label>
    </section><section className="paper-panel prompt-panel"><div className="panel-heading"><span className="eyebrow">02 / YOUR DIRECTOR'S NOTE</span><span className="pill">NIJI 7</span></div><h2>你的角色提示词</h2><textarea className="prompt-text" aria-label="可编辑的 Niji 提示词" value={prompt} onChange={e => setCustom(e.target.value)} spellCheck={false} placeholder={generated.error ? '补全风格参考后，提示词会出现在这里。' : ''} /><div className="prompt-tools"><button className="text-button" onClick={() => setCustom(null)} disabled={custom === null}>恢复模板</button><span>{prompt.length} characters</span></div><div className="split-actions"><button className="button primary" onClick={copy} disabled={!!generated.error || !prompt.trim()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? '已复制' : '复制提示词'}</button><a className="button secondary" href="https://www.midjourney.com/imagine" target="_blank" rel="noreferrer">前往官方生成 <ArrowUpRight size={16} /></a></div><p className="field-hint">参数修改会重新生成模板。自定义英文正文请在参数确定后编辑。</p></section></div>
    <section className="niji-import paper-panel"><div><span className="eyebrow">03 / BRING YOUR CHARACTER HOME</span><h2>让新角色来到工坊</h2><p>在官方平台生成并下载图片，然后导入为角色参考图。<br />接下来制作 Q 版母版，就能开始整套表情。</p><a className="text-link" href="https://nijijourney.com/blog/niji-7-prompting" target="_blank" rel="noreferrer">Niji 7 提示词指南 <ExternalLink size={13} /></a></div><UploadArea compact label="导入 Niji 角色图" onUpload={file => onUpload(file, 'reference')} busy={uploading} /></section><p className="honesty-note">Niji 在官方平台手动生成；此处提供提示词与结果回导，不自动调用 Midjourney 服务。</p>
  </div>;
}
