import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Check, LoaderCircle, Upload, X } from 'lucide-react';
import type { Asset, Job } from '../shared/types';

export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={id} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <header className="modal-head"><div><span className="eyebrow">CHARACTER STICKER STUDIO</span><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="关闭" onClick={onClose}><X size={21} /></button></header>
    {children}
  </dialog>;
}

export function Field({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return <label className={`field ${className}`}><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

export function UploadArea({ onUpload, busy, label = '拖入角色图，或点击上传', asset, compact = false }: { onUpload: (file: File) => void; busy?: boolean; label?: string; asset?: Asset; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return <div className={`upload-area ${compact ? 'compact' : ''} ${asset ? 'has-image' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy && e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]); }}>
    {asset && <img src={asset.url} alt="当前角色参考图" />}
    <button className="upload-trigger" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle size={25} className="spin" /> : <Upload size={25} />}<strong>{busy ? '正在导入图片…' : label}</strong><span>PNG / JPG / WebP · 最大 15 MB</span></button>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); e.target.value = ''; }} />
  </div>;
}

export const statusNames: Record<Job['status'], string> = { queued: '排队中', running: '生成中', succeeded: '已完成', failed: '失败', cancelled: '已取消', unknown: '状态待确认' };
export function Status({ status }: { status: Job['status'] }) {
  return <span className={`status status-${status}`}>{status === 'running' || status === 'queued' ? <LoaderCircle size={12} className={status === 'running' ? 'spin' : ''} /> : status === 'succeeded' ? <Check size={12} /> : <span className="status-dot" />}{statusNames[status]}</span>;
}
