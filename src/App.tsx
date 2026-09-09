import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Coffee, Download, FileJson, Flower2, Heart, History, ImagePlus, Layers3, LoaderCircle, Menu, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Smile, Sparkles, Upload, WandSparkles, X } from 'lucide-react';
import type { Asset, Bootstrap, Caption, Catalog, Character, Job, Project, ProviderSettings, Reaction } from './shared/types';
import { api, ApiError, download, errorMessage, post, readImage } from './lib/api';
import { Field, Modal, Status } from './components/Common';
import CharacterView from './components/CharacterView';
import NijiWorkshop from './components/NijiWorkshop';
import Settings from './components/Settings';
import StickerInspector, { defaultCaption } from './components/StickerInspector';
import ResultsView, { ImagePreview } from './components/ResultsView';

type Page = 'character' | 'anchor' | 'stickers' | 'history' | 'export' | 'niji';
const navigation = [
  { id: 'character' as Page, label: '角色设定', en: 'CHARACTER', icon: Smile, number: '01' },
  { id: 'anchor' as Page, label: 'Q 版母版', en: 'CHIBI ANCHOR', icon: ImagePlus, number: '02' },
  { id: 'stickers' as Page, label: '表情工坊', en: 'STICKER STUDIO', icon: Heart, number: '03' },
  { id: 'history' as Page, label: '生成记录', en: 'GENERATIONS', icon: History, number: '04' },
  { id: 'export' as Page, label: '打包带走', en: 'EXPORT & SHARE', icon: Download, number: '05' },
];

function emptyCharacter(name = ''): Character { return { name, description: '', identity: '', outfit: '', personality: '' }; }
function withAssets(existing: Asset[], incoming: Asset[]) { return Array.from(new Map([...existing, ...incoming].map(asset => [asset.id, asset])).values()); }
function withJobs(existing: Job[], incoming: Job[]) { return Array.from(new Map([...existing, ...incoming].map(job => [job.id, job])).values()); }

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { await post('/api/login', { token }); onSuccess(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  return <main className="welcome-screen"><div className="welcome-card"><div className="brand-mark"><Flower2 size={28} /></div><span className="eyebrow">YOUR PRIVATE LITTLE STUDIO</span><h1>可爱，<em>只属于你。</em></h1><p>这个工作室已启用访问保护。<br />输入部署时设置的工作室口令继续。</p><form onSubmit={login}><Field label="工作室口令"><input type="password" autoComplete="current-password" value={token} onChange={e => setToken(e.target.value)} required autoFocus /></Field>{error && <p className="error-banner" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <ShieldCheck size={17} />}进入工作室</button></form></div></main>;
}

function ReactionCard({ reaction, index, selected, active, job, onSelect, onOpen }: { reaction: Reaction; index: number; selected: boolean; active: boolean; job?: Job; onSelect: () => void; onOpen: () => void }) {
  const Motif = [Heart, Sparkles, Flower2, Coffee, Smile, CircleHelp][index % 6];
  return <article className={`reaction-card tone-${index % 6} ${selected ? 'selected' : ''} ${active ? 'inspected' : ''}`} style={{ animationDelay: `${Math.min(index, 16) * 25}ms` }}>
    <button className={`reaction-art ${job?.asset ? 'has-result checker' : ''}`} onClick={onOpen} aria-label={`编辑 ${reaction.name}`} aria-pressed={active}>
      {job?.asset ? <img src={job.asset.url} alt={reaction.name} loading="lazy" /> : <><span className="card-sequence">NO. {String(index + 1).padStart(2, '0')}</span><span className="card-motif"><Motif size={31} strokeWidth={1.45} /></span><span className={`reaction-lettering ${reaction.caption.length > 4 ? 'long' : ''}`}>{reaction.caption || reaction.name}</span><span className="draft-mark">动作稿 · 待生成</span><span className="card-scribble" aria-hidden="true">✳</span></>}
      {job && !job.asset && <span className="card-job-status"><Status status={job.status} /></span>}
    </button>
    <div className="reaction-card-bottom"><button className="reaction-card-title" onClick={onOpen}><strong>{reaction.name}</strong><span>{reaction.tags.slice(0, 2).join(' / ') || reaction.category}</span></button><label className="card-checkbox"><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`选择 ${reaction.name}`} /><span><Check size={13} strokeWidth={3} /></span></label></div>
  </article>;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [catalog, setCatalog] = useState<Catalog>({ reactions: [], styles: [], packs: [], sources: [] });
  const [settings, setSettings] = useState<ProviderSettings>({ provider: 'openai', baseUrl: '', model: '', size: '1024x1024', concurrency: 2 });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState<Page>('stickers');
  const [activeId, setActiveId] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [activePack, setActivePack] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [custom, setCustom] = useState({ name: '', caption: '', action: '' });
  const [preview, setPreview] = useState<Job | null>(null);
  const [retryWarning, setRetryWarning] = useState<Job | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [pollError, setPollError] = useState('');
  const projectRef = useRef<Project | null>(null);
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const savePromise = useRef<Promise<Project> | null>(null);
  const busyRef = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);
  const lastRequest = useRef<{ signature: string; requestId: string } | null>(null);
  const retryRequests = useRef(new Map<string, string>());

  const notify = useCallback((message: string, type: 'error' | 'success' = 'success') => setNotice({ message, type }), []);
  const handleError = useCallback((error: unknown) => { if (error instanceof ApiError && error.status === 401) setAuthRequired(true); else notify(errorMessage(error), 'error'); }, [notify]);
  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const data = await api<Bootstrap>('/api/bootstrap');
      const first = data.projects[0];
      if (!first) throw new Error('工作室没有可用项目，请检查服务端初始化。');
      setProjects(data.projects); setProject(first); projectRef.current = first;
      revision.current = 0; savedRevision.current = 0; setDirty(false);
      setCatalog(data.catalog); setSettings(data.settings); setAssets(withAssets(data.assets, data.jobs.flatMap(j => j.asset ? [j.asset] : []))); setJobs(data.jobs);
      const completedIds = new Set(data.jobs.filter(job => job.projectId === first.id && job.kind === 'sticker' && job.status === 'succeeded' && job.asset).map(job => job.reactionId));
      setActiveId(first.selectedIds.find(id => completedIds.has(id)) || first.selectedIds[0] || data.catalog.reactions[0]?.id || ''); setAuthRequired(false);
    } catch (error) { if (error instanceof ApiError && error.status === 401) setAuthRequired(true); else setLoadError(errorMessage(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!notice || notice.type === 'error') return; const timer = window.setTimeout(() => setNotice(null), 4500); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => { function beforeUnload(event: BeforeUnloadEvent) { if (revision.current !== savedRevision.current) { event.preventDefault(); event.returnValue = ''; } } window.addEventListener('beforeunload', beforeUnload); return () => window.removeEventListener('beforeunload', beforeUnload); }, []);
  const pending = jobs.some(job => job.status === 'queued' || job.status === 'running');
  useEffect(() => {
    if (!pending || authRequired) return;
    let stopped = false;
    let timer: number;
    async function poll() {
      try { const incoming = await api<Job[]>('/api/jobs'); if (stopped) return; setJobs(existing => withJobs(existing, incoming)); setAssets(existing => withAssets(existing, incoming.flatMap(j => j.asset ? [j.asset] : []))); setPollError(''); }
      catch (error) { if (!stopped) { if (error instanceof ApiError && error.status === 401) setAuthRequired(true); else setPollError('任务状态暂时无法同步，正在重新连接。'); } }
      if (!stopped) timer = window.setTimeout(poll, 2200);
    }
    timer = window.setTimeout(poll, 1600);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [pending, authRequired]);

  function changeProject(value: Partial<Project>) {
    const current = projectRef.current;
    if (!current) return;
    const changingStyle = value.styleId !== undefined && value.styleId !== current.styleId;
    const next = { ...current, ...value, ...(changingStyle ? { character: { ...(value.character ?? current.character), anchorAssetId: undefined } } : {}) };
    projectRef.current = next; revision.current += 1; setProject(next); setDirty(true);
    if (changingStyle) notify('风格已切换，可重新生成或选择匹配的 Q 版母版。');
  }
  async function saveProject(): Promise<Project> {
    if (savePromise.current) await savePromise.current;
    if (!projectRef.current) throw new Error('未选择项目');
    if (revision.current === savedRevision.current) return projectRef.current;
    const snapshot = projectRef.current;
    const version = revision.current;
    setSaving(true);
    const promise = api<Project>(`/api/projects/${snapshot.id}`, { method: 'PUT', body: JSON.stringify(snapshot) });
    savePromise.current = promise;
    try {
      const updated = await promise;
      setProjects(current => current.map(item => item.id === updated.id ? updated : item));
      savedRevision.current = version;
      if (revision.current === version) { projectRef.current = updated; setProject(updated); setDirty(false); }
      else { projectRef.current = { ...projectRef.current!, updatedAt: updated.updatedAt }; setProject(projectRef.current); }
      return updated;
    } finally { savePromise.current = null; setSaving(false); }
  }
  async function saveAll() { let result = await saveProject(); while (revision.current !== savedRevision.current) result = await saveProject(); return result; }
  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await action(); } catch (e) { handleError(e); } finally { busyRef.current = false; setBusy(false); }
  }
  function navigate(next: Page) { setPage(next); setSidebarOpen(false); }
  async function switchProject(id: string) {
    await run(async () => {
      await saveAll();
      const next = projects.find(item => item.id === id);
      if (!next) return;
      projectRef.current = next; setProject(next); revision.current = 0; savedRevision.current = 0; setDirty(false);
      const completedIds = new Set(jobs.filter(job => job.projectId === next.id && job.kind === 'sticker' && job.status === 'succeeded' && job.asset).map(job => job.reactionId));
      setActiveId(next.selectedIds.find(reactionId => completedIds.has(reactionId)) || next.selectedIds[0] || catalog.reactions[0]?.id || ''); setActivePack(''); setCategory('全部');
    });
  }
  async function upload(file: File, target: 'reference' | 'anchor') {
    if (uploading) return;
    setUploading(true);
    const importingProjectId = projectRef.current?.id;
    try {
      const asset = await post<Asset>('/api/assets', { filename: file.name, dataUrl: await readImage(file), provenance: page === 'niji' ? '用户从 Niji 官方平台导入' : '用户提供的角色素材' });
      setAssets(current => withAssets(current, [asset]));
      if (projectRef.current?.id !== importingProjectId) { notify('图片已导入素材库，请在原项目中选择。'); return; }
      const imported = await post<Job>('/api/jobs/import', { projectId: importingProjectId, assetId: asset.id, kind: target === 'anchor' ? 'anchor' : 'character', name: `${projectRef.current?.character.name || '角色'} · ${target === 'anchor' ? '导入母版' : '导入参考图'}`, provenance: page === 'niji' ? 'Niji 官方生成，用户手动导入' : '用户上传' });
      setJobs(current => withJobs(current, [imported]));
      if (projectRef.current?.id !== importingProjectId) { notify('图片已保存在原项目的生成记录中，请回到该项目选用。'); return; }
      changeProject({ character: { ...projectRef.current!.character, ...(target === 'anchor' ? { anchorAssetId: asset.id } : { referenceAssetId: asset.id }) } });
      await saveAll(); notify(target === 'anchor' ? 'Q 版母版已导入并保存' : '角色参考图已导入并保存');
    } catch (error) { handleError(error); } finally { setUploading(false); }
  }
  async function generate(kind: Job['kind'], ids?: string[]) {
    await run(async () => {
      const current = await saveAll();
      if (!settings.hasApiKey || !settings.model || !settings.baseUrl) { setSettingsOpen(true); notify('先连接图片 API，再开始生成。', 'error'); return; }
      if (kind !== 'character' && !(current.character.anchorAssetId || current.character.referenceAssetId)) { navigate('character'); notify('请先上传或生成一张角色参考图。', 'error'); return; }
      const reactionIds = kind === 'sticker' ? (ids ?? current.selectedIds) : undefined;
      if (kind === 'sticker' && !reactionIds?.length) { notify('先选择至少一个想生成的表情。', 'error'); return; }
      const signature = JSON.stringify({ projectId: current.id, updatedAt: current.updatedAt, kind, reactionIds });
      const requestId = lastRequest.current?.signature === signature ? lastRequest.current.requestId : crypto.randomUUID();
      lastRequest.current = { signature, requestId };
      const result = await post<{ jobs: Job[] }>('/api/jobs', { projectId: current.id, kind, reactionIds, requestId });
      lastRequest.current = null;
      setJobs(existing => withJobs(existing, result.jobs));
      notify(`${result.jobs.length} 张${kind === 'sticker' ? '表情' : kind === 'anchor' ? '母版' : '角色图'}已加入生成队列`);
    });
  }
  async function retry(job: Job, confirmed = false) {
    if (job.status === 'unknown' && !confirmed) { setRetryWarning(job); return; }
    setRetryWarning(null);
    await run(async () => {
      const requestId = retryRequests.current.get(job.id) ?? crypto.randomUUID();
      retryRequests.current.set(job.id, requestId);
      const retried = await post<Job>(`/api/jobs/${job.id}/retry`, { requestId });
      retryRequests.current.delete(job.id);
      setJobs(existing => withJobs(existing, [retried])); notify('已创建新的重试任务，原记录保留。');
    });
  }
  async function cancel(job: Job) { await run(async () => { const cancelled = await post<Job>(`/api/jobs/${job.id}/cancel`); setJobs(existing => withJobs(existing, [cancelled])); notify(job.status === 'running' ? '已请求停止；上游是否收费请查看任务说明。' : '已取消排队任务。'); }); }
  async function downloadJob(job: Job) { await run(async () => { await saveAll(); await download(job.kind === 'sticker' ? `/api/jobs/${job.id}/render?size=512&caption=1` : job.asset!.url, `${job.name}.png`); }); }
  async function openPreview(job: Job) { await run(async () => { await saveAll(); setPreview(job); }); }
  async function exportRecipe() { await run(async () => { const current = await saveAll(); await download(`/api/projects/${current.id}/recipe`, `${current.character.name || 'character'}-recipe.json`); notify('配方已导出；参考图请单独保存。'); }); }
  async function exportZip(captions: boolean, size: number) { await run(async () => { const current = await saveAll(); await download(`/api/projects/${current.id}/export?captions=${captions ? 1 : 0}&size=${size}`, `${current.character.name || 'character'}-stickers.zip`); }); }
  async function importRecipe(file: File) { await run(async () => { await saveAll(); if (file.size > 2 * 1024 * 1024) throw new Error('配方文件需小于 2 MB'); let recipe: unknown; try { recipe = JSON.parse(await file.text()); } catch { throw new Error('请选择有效的 JSON 配方文件'); } const next = await post<Project>('/api/projects/import', recipe); setProjects(current => [next, ...current]); projectRef.current = next; setProject(next); revision.current = 0; savedRevision.current = 0; setDirty(false); setActiveId(next.selectedIds[0] || ''); navigate('character'); notify('配方已导入，请重新添加角色参考图。'); }); }
  async function createProject(e: React.FormEvent) { e.preventDefault(); await run(async () => { await saveAll(); const next = await post<Project>('/api/projects', { name: `${newName} 的表情工坊`, character: emptyCharacter(newName) }); setProjects(current => [next, ...current]); projectRef.current = next; setProject(next); revision.current = 0; savedRevision.current = 0; setDirty(false); setNewProjectOpen(false); setNewName(''); navigate('character'); notify('新角色的工作室准备好了。'); }); }
  function addCustom(e: React.FormEvent) { e.preventDefault(); if (!projectRef.current) return; const item: Reaction = { id: `custom-${crypto.randomUUID()}`, name: custom.name, caption: custom.caption, action: custom.action, category: '我的自定义', emoji: '', tags: ['自定义'] }; changeProject({ customReactions: [...projectRef.current.customReactions, item], selectedIds: [...projectRef.current.selectedIds, item.id] }); setActiveId(item.id); setCategory('全部'); setSearch(''); setCustomOpen(false); setCustom({ name: '', caption: '', action: '' }); }

  if (authRequired) return <Login onSuccess={() => void load()} />;
  if (loading) return <main className="welcome-screen"><div className="loading-logo"><Flower2 size={37} strokeWidth={1.5} /><span>正在打开可爱工坊…</span><LoaderCircle size={19} className="spin" /></div></main>;
  if (!project || loadError) return <main className="welcome-screen"><div className="welcome-card"><Flower2 size={38} /><h1>工坊还没准备好</h1><p className="error-banner" role="alert">{loadError || '项目加载失败'}</p><button className="button primary" onClick={() => void load()}>重新连接</button></div></main>;

  const reactions = [...catalog.reactions, ...project.customReactions].map(item => ({ ...item, ...project.overrides[item.id] }));
  const categories = ['全部', ...new Set(reactions.map(item => item.category))];
  const filtered = reactions.filter(item => (category === '全部' || item.category === category) && [item.name, item.caption, item.action, ...item.tags].join(' ').toLowerCase().includes(search.toLowerCase()));
  const active = reactions.find(item => item.id === activeId) || reactions[0];
  const ownJobs = jobs.filter(job => job.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestFor = (id: string) => ownJobs.find(job => job.kind === 'sticker' && job.reactionId === id);
  const anchorAsset = assets.find(asset => asset.id === project.character.anchorAssetId);
  const referenceAsset = assets.find(asset => asset.id === project.character.referenceAssetId);
  const heroAsset = anchorAsset || referenceAsset;
  const currentStyle = catalog.styles.find(style => style.id === project.styleId) || catalog.styles[0];
  const readyCount = new Set(ownJobs.filter(job => job.kind === 'sticker' && job.status === 'succeeded').map(job => job.reactionId)).size;
  const activeCount = ownJobs.filter(job => ['running', 'queued'].includes(job.status)).length;
  function toggleSelection(id: string) { const current = projectRef.current!; setActivePack(''); changeProject({ selectedIds: current.selectedIds.includes(id) ? current.selectedIds.filter(item => item !== id) : [...current.selectedIds, id] }); }
  function openReaction(id: string) {
    setActiveId(id);
    if (window.matchMedia('(max-width: 760px)').matches) window.requestAnimationFrame(() => {
      document.getElementById('sticker-inspector')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  }
  function editReaction(value: Partial<Reaction>) { if (!active) return; const current = projectRef.current!; changeProject({ overrides: { ...current.overrides, [active.id]: { ...current.overrides[active.id], ...value } } }); }
  function editCaption(value: Caption) { if (!active) return; changeProject({ captions: { ...projectRef.current!.captions, [active.id]: value } }); }

  return <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="关闭导航" onClick={() => setSidebarOpen(false)} />}
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('stickers'); }}><span className="brand-mark"><Flower2 size={27} strokeWidth={1.8} /></span><span><strong>绒绒工坊</strong><small>CHARACTER STICKER STUDIO</small></span></a>
      <div className="project-switcher"><label><span className="eyebrow">YOUR WORKSPACE</span><select value={project.id} aria-label="选择角色项目" disabled={busy || uploading || saving} onChange={e => void switchProject(e.target.value)}>{projects.map(item => <option key={item.id} value={item.id}>{item.character.name || item.name}</option>)}</select></label><button className="icon-button" aria-label="新建角色项目" onClick={() => setNewProjectOpen(true)}><Plus size={18} /></button></div>
      <div className="sidebar-character"><span className="character-stamp">{anchorAsset ? 'CHIBI ANCHOR' : 'YOUR MUSE'}</span>{heroAsset ? <img className={anchorAsset ? 'is-anchor' : ''} src={heroAsset.url} alt={`${project.character.name} 的${anchorAsset ? 'Q 版母版' : '角色参考图'}`} /> : <button className="no-character" onClick={() => navigate('character')}><ImagePlus size={37} strokeWidth={1.2} /><span>让你的角色<br />住进这里</span></button>}<div className="character-nameplate"><strong>{project.character.name || '未命名角色'}</strong><span>{heroAsset ? <><span className="live-dot" />{anchorAsset ? '母版已选定' : '参考图已就绪'}</> : '等待第一张角色图'}</span></div><span className="photo-corner top" /><span className="photo-corner bottom" /></div>
      <nav className="main-navigation" aria-label="工作室步骤">{navigation.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><span className="nav-number">{item.number}</span><item.icon size={18} /><span>{item.label}</span>{item.id === 'history' && activeCount > 0 ? <span className="nav-count">{activeCount}</span> : page === item.id ? <span className="nav-active-dot" /> : null}</button>)}</nav>
      <button className={`niji-nav ${page === 'niji' ? 'active' : ''}`} onClick={() => navigate('niji')}><span className="niji-emblem">n</span><span><strong>Niji 7 角色工坊</strong><small>从灵感到三视图</small></span><ArrowRight size={15} /></button>
      <div className="sidebar-bottom"><button onClick={() => setSettingsOpen(true)}><Settings2 size={17} /><span>模型与连接</span><span className={`connection-dot ${settings.hasApiKey ? 'connected' : ''}`} /></button><div className="sidebar-note"><Heart size={12} /> MADE FOR YOUR LITTLE EMOTIONS</div></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="打开导航" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span>{project.character.name || '新角色'} 的工作室</span><span className="breadcrumb-slash">/</span><strong>{page === 'niji' ? 'Niji 7 角色工坊' : navigation.find(item => item.id === page)?.label}</strong></div><div className="topbar-actions"><span className={`save-state ${dirty ? 'dirty' : ''}`}>{saving ? <LoaderCircle size={12} className="spin" /> : dirty ? <span /> : <Check size={12} />}{saving ? '保存中' : dirty ? '有未保存修改' : '已保存到本机'}</span><button className="button small quiet save-button" disabled={!dirty || saving || busy} onClick={() => void run(async () => { await saveAll(); notify('修改已保存'); })}>保存</button><button className="icon-button" aria-label="导入项目配方" title="导入项目配方" onClick={() => importRef.current?.click()}><Upload size={17} /></button><button className="icon-button" aria-label="导出项目配方" title="导出项目配方" onClick={() => void exportRecipe()}><FileJson size={17} /></button><span className="version-label">LOCAL STUDIO <span>01</span></span></div></header>
      <input type="file" accept="application/json,.json" hidden ref={importRef} onChange={e => { if (e.target.files?.[0]) void importRecipe(e.target.files[0]); e.target.value = ''; }} />
      {pollError && <div className="connection-banner" role="status"><LoaderCircle size={15} className="spin" />{pollError}</div>}
      {page === 'stickers' ? <div className="sticker-layout"><main className="sticker-main"><div className="studio-heading"><div><span className="eyebrow">A COLLECTION OF LITTLE EMOTIONS</span><h1>把心情，<em>变可爱。</em><span className="heading-spark"><Sparkles size={29} strokeWidth={1.4} /></span></h1><p>一只角色，一整套说不完的小情绪。</p></div><button className="edition-note" onClick={() => setSourcesOpen(true)}><span>THE CUTE EDIT</span><strong>2026</strong><small>灵感与选款依据 <ArrowRight size={11} /></small></button></div>
        <div className="style-strip"><span className="strip-label"><SlidersHorizontal size={15} />画风</span><div className="style-choices">{catalog.styles.map((style, index) => <button key={style.id} title={style.description} className={project.styleId === style.id ? 'active' : ''} onClick={() => changeProject({ styleId: style.id })}><span className={`style-swatch swatch-${index}`} />{style.name}{project.styleId === style.id && <Check size={13} />}</button>)}</div></div>
        <div className="pack-section"><div className="pack-topline"><span className="eyebrow">PICK YOUR MOOD</span><button className="text-button" onClick={() => setSourcesOpen(true)}><BookOpen size={13} />怎么选出这些表情？</button></div><div className="pack-options">{catalog.packs.map((pack, index) => <button className={activePack === pack.id ? 'active' : ''} key={pack.id} title={pack.description} onClick={() => { changeProject({ selectedIds: [...pack.reactionIds] }); setActivePack(pack.id); setCategory('全部'); }}><span className="pack-icon">{index === 0 ? <Heart size={18} /> : index === 1 ? <Sparkles size={18} /> : <Layers3 size={18} />}</span><span><strong>{pack.name}</strong><small>{pack.description}</small></span><span className="pack-count">{pack.reactionIds.length}<small>枚</small></span></button>)}</div></div>
        <div className="collection-toolbar"><div className="category-tabs" role="group" aria-label="表情分类">{categories.map(item => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}{item === '全部' && <span>{reactions.length}</span>}</button>)}</div><div className="search-input"><Search size={15} /><input aria-label="搜索表情" placeholder="找一种心情…" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        <div className="collection-meta"><span>{filtered.length} 种心情，挑你喜欢的 <span className="tiny-flower">✳</span></span><div><button className="text-button" onClick={() => { setActivePack(''); const ids = filtered.map(item => item.id); changeProject({ selectedIds: Array.from(new Set([...project.selectedIds, ...ids])) }); }}>选中当前</button><span>/</span><button className="text-button" onClick={() => { setActivePack(''); changeProject({ selectedIds: [] }); }}>清空</button><button className="text-button custom-button" onClick={() => setCustomOpen(true)}><Plus size={14} />自定义</button></div></div>
        <div className="reaction-grid">{filtered.map((reaction, index) => <ReactionCard key={reaction.id} reaction={reaction} index={index} selected={project.selectedIds.includes(reaction.id)} active={active?.id === reaction.id} job={latestFor(reaction.id)} onSelect={() => toggleSelection(reaction.id)} onOpen={() => openReaction(reaction.id)} />)}</div>{filtered.length === 0 && <div className="empty-state"><Search size={30} /><h3>这份心情还没收录</h3><p>换个词搜索，或添加一个自定义表情。</p><button className="button secondary" onClick={() => setCustomOpen(true)}><Plus size={15} />自定义表情</button></div>}
        <div className="collection-footnote"><span>小图要清楚，情绪要直接，可爱要像你。</span><button className="text-button" onClick={() => setSourcesOpen(true)}>策划参考 <ArrowRight size={12} /></button></div>
      </main><StickerInspector reaction={active} caption={active ? project.captions[active.id] ?? defaultCaption(active) : undefined} job={active ? latestFor(active.id) : undefined} onReaction={editReaction} onCaption={editCaption} onGenerate={() => active && void generate('sticker', [active.id])} onRetry={job => void retry(job)} onDownload={job => void downloadJob(job)} onPreview={job => void openPreview(job)} busy={busy || uploading} dirty={dirty} revision={project.updatedAt} />
      <footer className="batch-bar"><div className="batch-selection"><div className="selection-count">{String(project.selectedIds.length).padStart(2, '0')}</div><div><strong>张表情已选中</strong><span>{currentStyle?.name || '选择画风'} <span>·</span> {activeCount ? `${activeCount} 张正在生成` : readyCount ? `${readyCount} 张已完成` : '每张独立生成'}</span></div></div><div className="batch-actions">{!settings.hasApiKey && <button className="connection-hint" onClick={() => setSettingsOpen(true)}><span className="connection-dot" />连接图片 API</button>}<button className="button secondary" disabled={busy || !project.selectedIds.length || uploading} onClick={() => void generate('sticker', [project.selectedIds[0]])}>先做 1 张样张</button><button className="button primary" disabled={busy || !project.selectedIds.length || uploading} onClick={() => void generate('sticker')}>{busy ? <LoaderCircle size={16} className="spin" /> : <WandSparkles size={17} />}生成选中的 {project.selectedIds.length} 张<ArrowRight size={16} /></button></div></footer></div> : <main className="page-content">
        {(page === 'character' || page === 'anchor') && <CharacterView key={page} project={project} assets={assets} jobs={jobs} catalog={catalog} onChange={changeProject} onUpload={(file, target) => void upload(file, target)} onGenerate={kind => void generate(kind)} onNiji={() => navigate('niji')} busy={busy} uploading={uploading} anchorMode={page === 'anchor'} />}
        {page === 'niji' && <NijiWorkshop key={project.id} project={project} onUpload={(file, target) => void upload(file, target)} uploading={uploading} onError={message => notify(message, 'error')} />}
        {(page === 'history' || page === 'export') && <ResultsView project={project} jobs={jobs} onPreview={job => void openPreview(job)} onDownload={job => void downloadJob(job)} onRetry={job => void retry(job)} onCancel={job => void cancel(job)} onExport={(captions, size) => void exportZip(captions, size)} onRecipe={() => void exportRecipe()} busy={busy} exportMode={page === 'export'} />}
      </main>}
    </div>
    {notice && <div className={`toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}><span>{notice.type === 'error' ? <CircleHelp size={19} /> : <Check size={19} />}</span><p>{notice.message}</p><button className="icon-button" aria-label="关闭通知" onClick={() => setNotice(null)}><X size={17} /></button></div>}
    {settingsOpen && <Settings settings={settings} onSaved={value => { setSettings(value); notify('模型连接已保存'); }} onClose={() => setSettingsOpen(false)} />}
    {preview && <ImagePreview job={preview} project={project} onClose={() => setPreview(null)} onDownload={job => void downloadJob(job)} />}
    {sourcesOpen && <Modal title="可爱，也要有使用场景。" subtitle="这是可编辑的选款策划，不是未经验证的全网热度排行榜。" onClose={() => setSourcesOpen(false)} wide><div className="sources-intro"><span className="edition-large">2026</span><p>优先覆盖日常接话、贴贴撒娇和反差反应。把「小图清晰、情绪明确、能反复使用」变成选款标准；你可以改文案、换动作，或重新组合自己的整套表情。</p></div><div className="source-list">{catalog.sources.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><BookOpen size={18} /><div><strong>{source.title}</strong><p>{source.evidence}</p><small>查阅：{source.checkedAt}</small></div><ArrowRight size={17} /></a>)}</div><p className="honesty-note">参考创作者的表达方式与官方贴图场景，不内置或复制他人的表情图片。传播效果仍取决于角色、社区和实际使用。</p></Modal>}
    {newProjectOpen && <Modal title="欢迎一个新朋友" subtitle="从一句话开始，也可以稍后上传角色图。" onClose={() => setNewProjectOpen(false)}><form className="simple-form" onSubmit={createProject}><Field label="角色名字"><input required maxLength={80} autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="例如：Lumi" /></Field><button className="button primary full" disabled={busy || !newName.trim()}><Plus size={17} />创建角色工作室</button></form></Modal>}
    {customOpen && <Modal title="这份心情，你来定义。" subtitle="用一个明确的动作，让角色替你说话。" onClose={() => setCustomOpen(false)}><form className="simple-form" onSubmit={addCustom}><Field label="表情名称"><input required maxLength={80} autoFocus value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} placeholder="例如：偷偷观察" /></Field><Field label="文案（可留空）"><input maxLength={60} value={custom.caption} onChange={e => setCustom({ ...custom, caption: e.target.value })} placeholder="让我康康" /></Field><Field label="动作与情绪"><textarea required rows={4} value={custom.action} onChange={e => setCustom({ ...custom, action: e.target.value })} placeholder="从画面侧边探出半张脸，睁大眼睛，好奇地偷偷观察。" /></Field><button className="button primary full"><Plus size={17} />加入我的表情</button></form></Modal>}
    {retryWarning && <Modal title="重新生成这张？" subtitle="上一次提交状态不确定，服务商可能已完成或扣费。" onClose={() => setRetryWarning(null)}><div className="simple-form"><p>请先在服务商控制台核对「{retryWarning.name}」的记录。继续会提交一笔新的绘图请求，原任务会保留。</p><div className="split-actions"><button className="button secondary" onClick={() => setRetryWarning(null)}>暂不重试</button><button className="button primary" onClick={() => void retry(retryWarning, true)}>已核对，重新生成</button></div></div></Modal>}
  </div>;
}
