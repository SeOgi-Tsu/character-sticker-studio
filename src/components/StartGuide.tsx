import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Heart, ImagePlus, Layers3, LoaderCircle, PenLine, RotateCcw, Sparkles } from 'lucide-react';
import type { StartGuideInput } from '../lib/onboarding';
import { Field, Modal } from './Common';
import './StartGuide.css';

const routes = [
  { mode: 'existing' as const, icon: ImagePlus, title: '我有角色图', detail: '带上立绘或三视图，让熟悉的角色变成表情。', next: '创建项目，去上传' },
  { mode: 'scratch' as const, icon: PenLine, title: '从零描述角色', detail: '从一句设定开始，画出喜欢的角色，再做表情。', next: '创建项目，写设定' },
];

export default function StartGuide({ currentProjectName, busy, error, onStart, onClose }: {
  currentProjectName?: string;
  busy: boolean;
  error?: string;
  onStart: (input: StartGuideInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'route' | 'character'>('route');
  const [mode, setMode] = useState<StartGuideInput['mode']>('existing');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitLock = useRef(false);
  const pending = busy || submitting;
  const route = routes.find(item => item.mode === mode)!;

  function closeGuide() {
    if (!pending && !submitLock.current) onClose();
  }
  function chooseRoute(next: StartGuideInput['mode']) {
    if (pending) return;
    setMode(next); setStep('character'); setFailed(false);
  }
  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submitLock.current || !name.trim()) return;
    submitLock.current = true; setSubmitting(true); setFailed(false);
    try {
      const success = await onStart({ mode, name: name.trim(), description: description.trim() });
      if (success) onClose();
      else setFailed(true);
    } catch {
      // The parent reports the actual error. Retain the form for a safe retry.
      setFailed(true);
    } finally {
      submitLock.current = false; setSubmitting(false);
    }
  }

  return <Modal title={step === 'route' ? '让你的角色，住进表情里。' : '先认识一下这位新朋友。'} subtitle={step === 'route' ? '选一个起点，接下来的每一步都可以慢慢挑。' : mode === 'existing' ? '先建一个角色项目，下一步带上你的参考图。' : '先写一点灵感，下一步再把角色设定补完整。'} onClose={closeGuide}>
    <div className={`start-guide ${pending ? 'is-busy' : ''}`} aria-busy={pending}>
      <ol className="start-guide-progress" aria-label="初次使用引导进度"><li className={step === 'route' ? 'active' : 'complete'} aria-current={step === 'route' ? 'step' : undefined}><span>{step === 'character' ? <Check size={12} /> : '1'}</span>选择起点</li><li className={step === 'character' ? 'active' : ''} aria-current={step === 'character' ? 'step' : undefined}><span>2</span>认识角色</li></ol>

      {step === 'route' ? <div className="start-guide-routes">{routes.map((item, index) => <button type="button" key={item.mode} className={`start-guide-route route-${item.mode}`} disabled={pending} onClick={() => chooseRoute(item.mode)} autoFocus={index === 0} aria-label={item.title}>
        <span className="start-guide-route-art" aria-hidden="true"><item.icon size={28} strokeWidth={1.4} /><i>{item.mode === 'existing' ? '♡' : '✦'}</i></span>
        <span className="start-guide-route-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRight className="start-guide-route-arrow" size={16} />
      </button>)}</div> : <form className="start-guide-form" onSubmit={event => void start(event)}>
        <div className="start-guide-picked-route"><route.icon size={16} /><span>{route.title}</span><small>独立的新项目</small></div>
        <Field label="角色名字"><input aria-label="新角色名字" autoFocus required maxLength={80} autoComplete="off" value={name} disabled={pending} onChange={e => setName(e.target.value)} placeholder="例如：Lumi" /></Field>
        <Field label="一句话简介（可选）"><textarea aria-label="新角色简介" rows={3} maxLength={2000} value={description} disabled={pending} onChange={e => setDescription(e.target.value)} placeholder={mode === 'existing' ? '比如：爱逞强、嘴硬心软，熟悉的人面前很会撒娇。' : '比如：一位爱收集星星的成年魔法师，总把关心装成顺手。'} /></Field>
        <div className="start-guide-form-actions"><button type="button" className="button secondary" disabled={pending} onClick={() => { setStep('route'); setFailed(false); }}><ArrowLeft size={15} />返回</button><button type="submit" className="button primary" disabled={pending || !name.trim()}>{pending ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{pending ? '正在创建项目…' : route.next}{!pending && <ArrowRight size={15} />}</button></div>
        {failed && <p className="start-guide-submit-note" role="alert">{error || '暂未创建成功，请稍后重试。'}<span>填写的内容已保留。</span></p>}
        <p className="start-guide-create-note">先创建角色项目，下一步再选择或生成图片。</p>
      </form>}

      <section className="start-guide-journey" aria-label="制作表情的三个步骤">
        <div className="start-guide-journey-title"><span className="eyebrow">THREE LITTLE STEPS</span><Heart size={13} /></div>
        <ol><li><ImagePlus size={18} strokeWidth={1.5} /><strong>角色参考图</strong><span>上传，或描述后生成</span></li><li><Layers3 size={18} strokeWidth={1.5} /><strong>Q 版母版</strong><span>挑喜欢的画风与候选</span></li><li><Heart size={18} strokeWidth={1.5} /><strong>整套表情</strong><span>选动作、文字，导出</span></li></ol>
        <p><RotateCcw size={13} /><span>不满意就再生成一张。旧图会保留在候选和「生成记录」里，随时回来挑。</span></p>
      </section>

      <footer className="start-guide-footer"><button type="button" className="text-button" disabled={pending} onClick={closeGuide}>跳过，先看看</button>{currentProjectName?.trim() && <button type="button" className="text-button start-guide-current" disabled={pending} onClick={closeGuide} title={`继续当前项目：${currentProjectName}`}><span>继续「{currentProjectName}」</span><ArrowRight size={13} /></button>}</footer>
      <p className="start-guide-reopen-note">之后可以从「使用指南」再次打开。</p>
    </div>
  </Modal>;
}
