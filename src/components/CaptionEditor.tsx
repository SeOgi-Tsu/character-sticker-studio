import { Type } from 'lucide-react';
import type { Caption, CaptionStyle, Job, TextMode } from '../shared/types';
import { captionStyleDefaults, captionStyles as sharedStyles, resolveCaptionMode } from '../shared/typography';
import { Field } from './Common';

const textModes: { id: TextMode; label: string; hint: string; symbol: string }[] = [
  { id: 'none', label: '无字', hint: '让动作自己说话', symbol: '♡' },
  { id: 'overlay', label: '后期排字', hint: '字样可以随时改', symbol: '字' },
  { id: 'generated', label: '随图生成', hint: '文字一起画进图里', symbol: '✦' },
];

export default function CaptionEditor({ caption, styles = sharedStyles, job, onChange }: {
  caption: Caption; styles?: CaptionStyle[]; job?: Job; onChange: (value: Caption) => void;
}) {
  const mode = resolveCaptionMode(caption);
  const availableStyles = styles.length ? styles : sharedStyles;
  const lettering = availableStyles.find(item => item.id === (caption.styleId || 'classic')) || sharedStyles[0];
  const embedded = Boolean(job?.asset && job.textMode === 'generated');
  const hint = embedded
    ? `当前原图已经带字${job?.generatedText ? `「${job.generatedText}」` : ''}。更改、移除文字或切换排字方式，都需要按当前方案再画一张；预览不会重复叠字。`
    : mode === 'generated'
      ? `${job?.asset ? '先显示干净原图，' : ''}文字会在下次生图时画入，生成后请检查字是否正确。`
      : mode === 'none'
        ? '这一张用动作传递情绪。文案会保留，随时可以切回排字。'
        : '保留干净原图，字色、字样与位置可分别调整。';
  const patch = (value: Partial<Caption>) => onChange({ ...caption, ...value });
  return <section className="caption-editor" aria-label="本张表情文字设置">
    <div className="caption-heading"><span><Type size={15} />这张，要怎么说？</span><span className="tiny-label">仅修改本张</span></div>
    <fieldset className="text-mode-field"><legend className="sr-only">文字生成方式</legend><div className="text-mode-options">{textModes.map(item => <label key={item.id} title={item.hint}><input type="radio" name="caption-mode" value={item.id} checked={mode === item.id} onChange={() => patch({ mode: item.id, enabled: item.id !== 'none' })} /><span><i aria-hidden="true">{item.symbol}</i><strong>{item.label}</strong></span></label>)}</div></fieldset>
    <p className={`field-hint text-mode-hint ${embedded || mode === 'generated' ? 'native-text-hint' : ''}`} aria-live="polite">{hint}</p>
    {mode !== 'none' && <>
      <Field label={mode === 'generated' ? '画进图里的准确文案' : '表情文案'} hint="短一点更有趣，可换行。推荐 2–8 个字。"><textarea className="caption-input" aria-label="表情文案" rows={2} value={caption.text} maxLength={48} placeholder="就这？ / 顺手而已" onChange={e => patch({ text: e.target.value })} /></Field>
      <fieldset className="caption-style-field"><legend className="field-label">{mode === 'generated' ? '文字的画法' : '字样与字体'}</legend><div className="caption-style-options">{availableStyles.map(item => <label key={item.id} title={`${item.description} · ${item.fontFamily}`}><input type="radio" name="caption-style" value={item.id} checked={lettering.id === item.id} onChange={() => patch(captionStyleDefaults(item.id))} /><span><b className={`style-letter-sample caption-${item.id}`} style={{ fontFamily: item.fontFamily }}>哼！</b><small>{item.name}</small></span></label>)}</div><p className="field-hint caption-font-name">{lettering.fontFamily} · {lettering.description}</p></fieldset>
      <div className="caption-settings">
        <div className="form-row"><Field label="字色"><input type="color" aria-label="文字颜色" value={caption.color} onChange={e => patch({ color: e.target.value })} /></Field><Field label="描边"><input type="color" aria-label="描边颜色" value={caption.stroke} onChange={e => patch({ stroke: e.target.value })} /></Field><Field label="位置"><select aria-label="文字位置" value={caption.position} onChange={e => patch({ position: e.target.value as Caption['position'] })}><option value="bottom">底部</option><option value="top">顶部</option><option value="left">左侧</option><option value="right">右侧</option></select></Field></div>
        <Field label={mode === 'generated' ? `字的视觉大小 · 约 ${Math.round(caption.fontSize / 512 * 100)}% 画面` : `字号 · ${caption.fontSize}px`}><input aria-label={mode === 'generated' ? '字的视觉大小' : '文字字号'} type="range" min={20} max={96} value={caption.fontSize} onChange={e => patch({ fontSize: Number(e.target.value) })} /></Field>
        <Field label={`倾斜 · ${caption.rotation || 0}°`}><input aria-label="文字倾斜角度" type="range" min={-20} max={20} step={1} value={caption.rotation || 0} onChange={e => patch({ rotation: Number(e.target.value) })} /></Field>
      </div>
      {mode === 'generated' && <p className="field-hint">以上是下次生图的文字方向，实际笔触和布局由模型绘制。</p>}
    </>}
  </section>;
}
