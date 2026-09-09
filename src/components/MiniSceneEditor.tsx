import { ChevronDown, Sparkles } from 'lucide-react';
import type { MiniScene } from '../shared/types';
import { Field } from './Common';

const emptyScene: MiniScene = { enabled: false, setup: '', reveal: '', prop: '' };

export default function MiniSceneEditor({ value, onChange }: {
  value?: MiniScene; onChange: (value: MiniScene) => void;
}) {
  const scene = value ?? emptyScene;
  const hasContent = [scene.setup, scene.reveal, scene.prop].some(text => text.trim());
  const summary = scene.enabled
    ? scene.reveal.trim() || scene.setup.trim() || scene.prop.trim() || '写下一件小事，让画面自己讲笑点。'
    : hasContent ? '内容已保留，开启后用于下一次生成。' : '可选：加一件小事、一点露馅的小细节。';
  const patch = (next: Partial<MiniScene>) => onChange({ ...scene, ...next });

  return <details className={`mini-scene-editor ${scene.enabled ? 'is-enabled' : ''}`}>
    <summary><span className="mini-scene-summary"><strong><Sparkles size={13} />一张图的小剧场</strong><small>{summary}</small></span><span className="mini-scene-state">{scene.enabled ? hasContent ? '已启用' : '待填写' : '未启用'}</span><ChevronDown size={14} /></summary>
    <div className="mini-scene-fields">
      <label className="check-label mini-scene-switch"><input type="checkbox" aria-label="启用这张的小剧场" checked={scene.enabled} onChange={e => patch({ enabled: e.target.checked })} /><span>启用这张的小剧场</span></label>
      <p className="field-hint">用一个瞬间讲清楚笑点：角色在逞强，画面里的小细节却悄悄露馅。仍是一张图，是否加字单独选择。</p>
      <Field label="发生了什么" hint="一句就好，交代这张图里的小处境。"><textarea aria-label="发生了什么" rows={2} maxLength={240} value={scene.setup} onChange={e => patch({ setup: e.target.value })} placeholder="明明很想要最后一块点心，却抱着手装作不在意。" /></Field>
      <Field label="露馅的小细节" hint="把反差画出来，不用写成字幕或第二格。"><textarea aria-label="露馅的小细节" rows={2} maxLength={240} value={scene.reveal} onChange={e => patch({ reveal: e.target.value })} placeholder="脸朝另一边，眼睛和悄悄伸出的手却都盯着点心。" /></Field>
      <Field label="关键道具" hint="一个主道具或一小组同类物品；可留空。"><input aria-label="关键道具" maxLength={160} value={scene.prop} onChange={e => patch({ prop: e.target.value })} placeholder="一小碟金色心形点心" /></Field>
      <p className="field-hint mini-scene-status" aria-live="polite">{!scene.enabled ? '目前未启用。填写的内容会保留，开启后才影响生成。' : !hasContent ? '至少填写一项才会加入小剧场方向，留空不会自动补剧情。' : '已启用，下次生成时生效。服装、镜头与文字模式继续沿用各自设置。'}</p>
    </div>
  </details>;
}
