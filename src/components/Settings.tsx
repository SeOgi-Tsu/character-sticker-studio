import { useState } from 'react';
import { ExternalLink, KeyRound, LoaderCircle, Save, ShieldCheck, Workflow } from 'lucide-react';
import type { ProviderSettings, RunningHubSettings } from '../shared/types';
import { api, errorMessage } from '../lib/api';
import { Field, Modal } from './Common';

const newRunningHub = (): RunningHubSettings => ({ kind: 'app', resourceId: '', promptNode: { nodeId: '', fieldName: '' }, extraNodes: [], outputIndex: 0 });

export default function Settings({ settings, onSaved, onClose }: { settings: ProviderSettings; onSaved: (value: ProviderSettings) => void; onClose: () => void }) {
  const [form, setForm] = useState<ProviderSettings>({ ...settings, apiKey: '' });
  const [extraNodesText, setExtraNodesText] = useState(JSON.stringify(settings.runninghub?.extraNodes ?? [], null, 2));
  const [clearKey, setClearKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changedEndpoint = form.provider !== settings.provider || form.baseUrl !== settings.baseUrl;
  const isRunningHub = form.provider === 'runninghub';
  const runninghub = form.runninghub ?? newRunningHub();
  const sizes = form.provider === 'gemini'
    ? [{ value: '1024x1024', label: '1K · 1:1 正方形' }, { value: '1536x1024', label: '1K · 3:2 横向设定图' }, { value: '1024x1536', label: '1K · 2:3 纵向立绘' }, { value: '1K', label: '1K · 1:1 正方形' }, { value: '2K', label: '2K · 1:1 正方形' }, { value: '4K', label: '4K · 1:1 正方形' }, { value: 'auto', label: '默认 · 1K 正方形' }]
    : [{ value: '1024x1024', label: '1024 × 1024 · 正方形' }, { value: '1536x1024', label: '1536 × 1024 · 横向设定图' }, { value: '1024x1536', label: '1024 × 1536 · 纵向立绘' }, { value: 'auto', label: '自动 · 模型决定' }];
  if (!sizes.some(size => size.value === form.size)) sizes.unshift({ value: form.size, label: `${form.size} · 已保存设置` });
  const change = (value: Partial<ProviderSettings>) => setForm(current => ({ ...current, ...value }));
  const changeRunningHub = (value: Partial<RunningHubSettings>) => change({ runninghub: { ...runninghub, ...value } });
  function selectProvider(provider: ProviderSettings['provider']) {
    if (form.provider === provider) return;
    change({ provider, baseUrl: provider === 'openai' ? 'https://api.openai.com/v1' : provider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' : 'https://www.runninghub.ai', model: '', apiKey: '', size: '1024x1024' });
    setClearKey(false); setError('');
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      let checkedRunningHub = form.runninghub;
      if (isRunningHub) {
        let extraNodes: unknown;
        try { extraNodes = JSON.parse(extraNodesText); } catch { throw new Error('额外节点需要是有效的 JSON 数组；不需要时填写 []。'); }
        if (!Array.isArray(extraNodes) || extraNodes.some(node => !node || typeof node !== 'object' || typeof node.nodeId !== 'string' || !node.nodeId.trim() || typeof node.fieldName !== 'string' || !node.fieldName.trim() || typeof node.fieldValue !== 'string')) throw new Error('每个额外节点都需要字符串 nodeId、fieldName 和 fieldValue。');
        if (!/^\d+$/.test(runninghub.resourceId.trim())) throw new Error('请从 RunningHub 复制完整的数字应用或工作流 ID。');
        checkedRunningHub = { ...runninghub, resourceId: runninghub.resourceId.trim(), promptNode: { nodeId: runninghub.promptNode.nodeId.trim(), fieldName: runninghub.promptNode.fieldName.trim() }, referenceNode: runninghub.referenceNode ? { nodeId: runninghub.referenceNode.nodeId.trim(), fieldName: runninghub.referenceNode.fieldName.trim() } : undefined, extraNodes };
      }
      const result = await api<ProviderSettings>('/api/settings', { method: 'PUT', body: JSON.stringify({ ...form, runninghub: checkedRunningHub, clearApiKey: clearKey || (changedEndpoint && !form.apiKey) }) });
      onSaved(result); onClose();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Modal title="连接你的绘图模型" subtitle="选择你的服务所支持的协议，也可以连接 RunningHub 工作流。" onClose={onClose} wide>
    <form onSubmit={save} className="settings-form">
      <div className="provider-options three-providers" role="group" aria-label="API 协议">
        <button type="button" className={form.provider === 'openai' ? 'active' : ''} onClick={() => selectProvider('openai')}><span className="provider-mark">O</span><strong>OpenAI Images 兼容</strong><small>官方 / 第三方 Images、Edits</small></button>
        <button type="button" className={form.provider === 'gemini' ? 'active' : ''} onClick={() => selectProvider('gemini')}><span className="provider-mark">G</span><strong>Gemini 原生兼容</strong><small>官方 / 第三方原生图片接口</small></button>
        <button type="button" className={isRunningHub ? 'active' : ''} onClick={() => selectProvider('runninghub')}><span className="provider-mark">R</span><strong>RunningHub</strong><small>AI 应用 / ComfyUI 工作流</small></button>
      </div>
      {isRunningHub && <div className="endpoint-presets"><span>服务站点</span><button type="button" className={form.baseUrl === 'https://www.runninghub.ai' ? 'active' : ''} onClick={() => change({ baseUrl: 'https://www.runninghub.ai' })}>国际站 .ai</button><button type="button" className={form.baseUrl === 'https://www.runninghub.cn' ? 'active' : ''} onClick={() => change({ baseUrl: 'https://www.runninghub.cn' })}>中国站 .cn</button><small>也可在下方填写兼容地址</small></div>}
      <Field label="Base URL" hint={form.provider === 'openai' ? '可填第三方地址，通常以 /v1 结尾；角色表情需要支持 multipart /images/edits 和参考图。仅支持聊天接口的服务不可用。' : form.provider === 'gemini' ? '可填兼容 Gemini 原生 REST 的第三方根地址，通常以 /v1beta 结尾；模型需支持图片输入和图片输出。' : '填写 RunningHub 站点根地址，或实现同样上传、提交、查询协议的服务地址；无需填写具体 API 路径。'}><input required type="url" value={form.baseUrl} onChange={e => change({ baseUrl: e.target.value })} spellCheck={false} /></Field>
      {!isRunningHub && <Field label="模型名称" hint="填写你所使用服务的图片模型 ID；兼容协议不代表每个模型都能出图。"><input required value={form.model} onChange={e => change({ model: e.target.value })} placeholder="来自你的服务商模型列表" autoComplete="off" /></Field>}
      <Field label="API Key" hint={changedEndpoint ? '服务地址已改变，请重新填写对应密钥；留空将清除旧密钥。' : settings.hasApiKey ? '已有密钥。留空保留，填写新密钥即可替换。' : '密钥仅保存在当前工作室服务端，不进入项目配方。'}><div className="input-icon"><KeyRound size={16} /><input type="password" value={form.apiKey} onChange={e => { change({ apiKey: e.target.value }); setClearKey(false); }} placeholder={settings.hasApiKey && !changedEndpoint ? '已安全保存 · 留空保留' : '输入 API Key'} autoComplete="new-password" /></div></Field>
      {settings.hasApiKey && <label className="check-label"><input type="checkbox" checked={clearKey} onChange={e => setClearKey(e.target.checked)} />清除已保存的密钥</label>}
      {isRunningHub && <section className="runninghub-config" aria-label="RunningHub 工作流配置">
        <div className="workflow-heading"><Workflow size={18} /><div><strong>让你的工作流接住角色与动作</strong><p>节点 ID 和字段名从该应用的 API 示例或工作流导出中复制。</p></div></div>
        <div className="form-row"><Field label="运行方式"><select value={runninghub.kind} onChange={e => changeRunningHub({ kind: e.target.value as RunningHubSettings['kind'] })}><option value="app">AI 应用</option><option value="workflow">ComfyUI 工作流</option></select></Field><Field label={runninghub.kind === 'app' ? 'AI 应用 ID' : '工作流 ID'} hint="按完整文本保存长数字 ID。"><input required inputMode="numeric" pattern="[0-9]+" value={runninghub.resourceId} onChange={e => changeRunningHub({ resourceId: e.target.value })} placeholder="复制应用或工作流 ID" autoComplete="off" /></Field></div>
        <div className="node-mapping"><strong>① 提示词输入</strong><p>每张表情的角色、构图和动作会自动填入这里。</p><div className="form-row"><Field label="提示词节点 ID"><input required value={runninghub.promptNode.nodeId} onChange={e => changeRunningHub({ promptNode: { ...runninghub.promptNode, nodeId: e.target.value } })} placeholder="从 API 示例复制" autoComplete="off" /></Field><Field label="提示词字段名"><input required value={runninghub.promptNode.fieldName} onChange={e => changeRunningHub({ promptNode: { ...runninghub.promptNode, fieldName: e.target.value } })} placeholder="从 API 示例复制" autoComplete="off" /></Field></div></div>
        <div className="node-mapping"><label className="check-label"><input type="checkbox" checked={Boolean(runninghub.referenceNode)} onChange={e => changeRunningHub({ referenceNode: e.target.checked ? { nodeId: '', fieldName: '' } : undefined })} /><strong>② 接入角色参考图</strong></label><p>制作母版和表情需要参考图节点，并且工作流本身要使用图片来保持角色一致；仅接上纯文生图预设无法保证同一角色。</p>{runninghub.referenceNode && <div className="form-row"><Field label="参考图节点 ID"><input required value={runninghub.referenceNode.nodeId} onChange={e => changeRunningHub({ referenceNode: { ...runninghub.referenceNode!, nodeId: e.target.value } })} placeholder="从 API 示例复制" autoComplete="off" /></Field><Field label="参考图字段名"><input required value={runninghub.referenceNode.fieldName} onChange={e => changeRunningHub({ referenceNode: { ...runninghub.referenceNode!, fieldName: e.target.value } })} placeholder="从 API 示例复制" autoComplete="off" /></Field></div>}</div>
        <details className="advanced-nodes"><summary>额外节点与输出选择</summary><Field label="额外节点（JSON 数组）" hint={'例如结构：[{"nodeId":"节点 ID","fieldName":"字段名","fieldValue":"值"}]。请换成真实节点；不用时保留 []。'}><textarea className="code-input" rows={5} value={extraNodesText} onChange={e => setExtraNodesText(e.target.value)} spellCheck={false} aria-label="额外节点 JSON" /></Field><Field label="输出图片序号" hint="从 0 开始。在工作流返回多张图片时，选择用于这一张表情的结果。"><input required type="number" min={0} max={15} step={1} value={runninghub.outputIndex} onChange={e => changeRunningHub({ outputIndex: Number(e.target.value) })} /></Field></details>
        <p className="workflow-size-note">图片尺寸、采样和模型由工作流决定。需要改变时，编辑工作流或填写对应的额外节点。</p>
      </section>}
      <div className="form-row">{!isRunningHub && <Field label="生成尺寸" hint="表情建议正方形；角色设定图可选横向，立绘可选纵向。实际支持范围取决于模型。"><select value={form.size} onChange={e => change({ size: e.target.value })}>{sizes.map(size => <option key={size.value} value={size.value}>{size.label}</option>)}</select></Field>}<Field label="同时生成张数" hint={isRunningHub ? '根据 RunningHub 的并发额度设置，建议先以 1 张验证节点。' : '较低并发更适合有速率限制的服务。'}><input type="number" min={1} max={4} step={1} required value={form.concurrency} onChange={e => change({ concurrency: Number(e.target.value) })} /></Field></div>
      <div className="info-note"><ShieldCheck size={18} /><span>点击生成才会提交绘图请求。单张费用由你的服务商决定。RunningHub 已提交任务可在生成记录里继续查询。</span></div>
      <div className="future-provider"><div><strong>本地 ComfyUI</strong><span>适配器预留 · 目前通过 RunningHub 接入云端工作流</span></div><span className="pill">COMING NEXT</span></div>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="modal-actions"><a className="text-link" href={form.provider === 'openai' ? 'https://platform.openai.com/docs/guides/image-generation' : form.provider === 'gemini' ? 'https://ai.google.dev/gemini-api/docs/image-generation' : 'https://www.runninghub.ai'} target="_blank" rel="noreferrer">{isRunningHub ? '打开 RunningHub' : '协议参考'} <ExternalLink size={13} /></a><button type="submit" className="button primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}保存连接</button></div>
    </form>
  </Modal>;
}
