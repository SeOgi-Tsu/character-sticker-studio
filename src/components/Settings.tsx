import { useState } from 'react';
import { ExternalLink, KeyRound, LoaderCircle, Save, ShieldCheck } from 'lucide-react';
import type { ProviderSettings } from '../shared/types';
import { api, errorMessage } from '../lib/api';
import { Field, Modal } from './Common';

export default function Settings({ settings, onSaved, onClose }: { settings: ProviderSettings; onSaved: (value: ProviderSettings) => void; onClose: () => void }) {
  const [form, setForm] = useState<ProviderSettings>({ ...settings, apiKey: '' });
  const [clearKey, setClearKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changedEndpoint = form.provider !== settings.provider || form.baseUrl !== settings.baseUrl;
  const sizes = form.provider === 'gemini'
    ? [{ value: '1024x1024', label: '1K · 1:1 正方形' }, { value: '1536x1024', label: '1K · 3:2 横向设定图' }, { value: '1024x1536', label: '1K · 2:3 纵向立绘' }, { value: '1K', label: '1K · 1:1 正方形' }, { value: '2K', label: '2K · 1:1 正方形' }, { value: '4K', label: '4K · 1:1 正方形' }, { value: 'auto', label: '默认 · 1K 正方形' }]
    : [{ value: '1024x1024', label: '1024 × 1024 · 正方形' }, { value: '1536x1024', label: '1536 × 1024 · 横向设定图' }, { value: '1024x1536', label: '1024 × 1536 · 纵向立绘' }, { value: 'auto', label: '自动 · 模型决定' }];
  if (!sizes.some(size => size.value === form.size)) sizes.unshift({ value: form.size, label: `${form.size} · 已保存设置` });
  const change = (value: Partial<ProviderSettings>) => setForm(current => ({ ...current, ...value }));
  function selectProvider(provider: ProviderSettings['provider']) {
    if (form.provider === provider) return;
    change({ provider, baseUrl: provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com/v1beta', model: '', apiKey: '', size: '1024x1024' });
    setClearKey(false);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api<ProviderSettings>('/api/settings', { method: 'PUT', body: JSON.stringify({ ...form, clearApiKey: clearKey || (changedEndpoint && !form.apiKey) }) });
      onSaved(result); onClose();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Modal title="连接你的绘图模型" subtitle="配置一次，角色、母版和整套表情都在这里生成。" onClose={onClose}>
    <form onSubmit={save} className="settings-form">
      <div className="provider-options" role="group" aria-label="API 协议">
        <button type="button" className={form.provider === 'openai' ? 'active' : ''} onClick={() => selectProvider('openai')}><span className="provider-mark">O</span><strong>OpenAI Images</strong><small>兼容 Images / Edits 协议</small></button>
        <button type="button" className={form.provider === 'gemini' ? 'active' : ''} onClick={() => selectProvider('gemini')}><span className="provider-mark">G</span><strong>Gemini 原生</strong><small>支持图片输出的模型</small></button>
      </div>
      <Field label="Base URL" hint={form.provider === 'openai' ? '服务需要支持带参考图的 /images/edits。兼容协议不等于支持每个模型。' : '填写 Gemini REST API 根地址，末尾包含 /v1beta。'}><input required type="url" value={form.baseUrl} onChange={e => change({ baseUrl: e.target.value })} spellCheck={false} /></Field>
      <Field label="模型名称" hint="填写你所使用服务的图片模型 ID。"><input required value={form.model} onChange={e => change({ model: e.target.value })} placeholder="来自你的服务商模型列表" autoComplete="off" /></Field>
      <Field label="API Key" hint={changedEndpoint ? '服务地址已改变，请重新填写对应密钥；留空将清除旧密钥。' : settings.hasApiKey ? '已有密钥。留空保留，填写新密钥即可替换。' : '密钥仅保存在当前工作室服务端，不进入项目配方。'}><div className="input-icon"><KeyRound size={16} /><input type="password" value={form.apiKey} onChange={e => { change({ apiKey: e.target.value }); setClearKey(false); }} placeholder={settings.hasApiKey && !changedEndpoint ? '已安全保存 · 留空保留' : '输入 API Key'} autoComplete="new-password" /></div></Field>
      {settings.hasApiKey && <label className="check-label"><input type="checkbox" checked={clearKey} onChange={e => setClearKey(e.target.checked)} />清除已保存的密钥</label>}
      <div className="form-row"><Field label="生成尺寸" hint="表情建议正方形；角色设定图可选横向，立绘可选纵向。实际支持范围取决于模型。"><select value={form.size} onChange={e => change({ size: e.target.value })}>{sizes.map(size => <option key={size.value} value={size.value}>{size.label}</option>)}</select></Field><Field label="同时生成张数" hint="较低并发更适合有速率限制的服务。"><input type="number" min={1} max={4} value={form.concurrency} onChange={e => change({ concurrency: Number(e.target.value) })} /></Field></div>
      <div className="info-note"><ShieldCheck size={18} /><span>点击生成才会提交绘图请求。单张费用由你的服务商决定，工作室不提供未经验证的估价。</span></div>
      <div className="future-provider"><div><strong>ComfyUI</strong><span>适配器预留 · 本版尚未接入工作流</span></div><span className="pill">COMING NEXT</span></div>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="modal-actions"><a className="text-link" href={form.provider === 'openai' ? 'https://platform.openai.com/docs/guides/image-generation' : 'https://ai.google.dev/gemini-api/docs/image-generation'} target="_blank" rel="noreferrer">接口文档 <ExternalLink size={13} /></a><button type="submit" className="button primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}保存连接</button></div>
    </form>
  </Modal>;
}
