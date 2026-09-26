import { useState } from 'react';
import { ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { Modal } from './Common';
import { reactionReferences, researchDate, researchPrinciples } from '../shared/reaction-research';
import './ReactionResearch.css';

export default function ReactionResearch({onClose}:{onClose:()=>void}) {
  const [query,setQuery]=useState(''),[family,setFamily]=useState('全部系列'),[kind,setKind]=useState('全部类型');
  const families=[...new Set(reactionReferences.map(r=>r.family))];
  const term=query.trim().toLocaleLowerCase();
  const results=reactionReferences.filter(r=>(family==='全部系列'||r.family===family)&&(kind==='全部类型'||(kind==='静态参考'?r.format.startsWith('静态'):!r.format.startsWith('静态')))&&(!term||[r.family,r.title,r.theme,r.observed,r.mechanism,r.adaptation,...r.uses].join(' ').toLocaleLowerCase().includes(term)));
  return <Modal title="先看它怎么演，再想她怎么演。" subtitle="具体作品、实际观察、聊天用途与独立首帧设计。参考别人的表达方式，形成自己的角色剧情。" wide onClose={onClose}>
    <div className="reaction-research">
      <div className="research-intro"><span><BookOpen size={24}/></span><div><strong>{reactionReferences.length} 个具体样本 · {families.length} 个角色系列</strong><p>查阅：{researchDate}。动态图、视频取样和静态漫画分别标注；“看过画面”不代表已测完动画周期。</p></div></div>
      <div className="research-principles">{researchPrinciples.map((p,i)=><article key={p.title}><small>0{i+1}</small><h3>{p.title}</h3><p>{p.text}</p></article>)}</div>
      <div className="research-evidence-note"><strong>怎么看“流行”</strong><p>GIPHY Views、视频播放/收藏/分享、商店收录是不同口径。这里没有可核验的 QQ 群实时转发榜；缺少数据就明确写出来。<a href="https://support.giphy.com/hc/en-us/articles/360020023332-What-Does-A-GIF-View-Mean-on-GIPHY" target="_blank" rel="noreferrer">GIPHY Views 定义 ↗</a></p></div>
      <div className="research-toolbar"><label className="research-search"><Search size={15}/><input aria-label="搜索参考案例" placeholder="找打拳、大哭、接触、偷吃…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="参考角色系列" value={family} onChange={e=>setFamily(e.target.value)}><option>全部系列</option>{families.map(f=><option key={f}>{f}</option>)}</select><select aria-label="参考媒体类型" value={kind} onChange={e=>setKind(e.target.value)}>{['全部类型','动态 / 视频参考','静态参考'].map(k=><option key={k}>{k}</option>)}</select><span>{results.length} 条</span></div>
      <div className="research-case-grid">{results.map(r=><article className="research-case" key={r.id}><div className="research-case-meta"><span>{r.family}</span><span className={r.format.startsWith('静态')?'static':''}>{r.format}</span></div><h3><a href={r.url} target="_blank" rel="noreferrer">{r.title}<ArrowUpRight size={15}/></a></h3><div className="research-case-tags"><span>{r.verification}</span>{r.uses.map(u=><i key={u}>{u}</i>)}</div><p className="research-observation">{r.observed}</p><div className="research-mechanism"><small>值得借鉴</small><p>{r.mechanism}</p></div><div className="research-adaptation"><small>Margaret 可以怎么演 · 创意改编</small><p>{r.adaptation}</p><small>这条专属首帧要准备什么</small><p>{r.firstFrame}</p></div><details><summary>公开指标与观察边界</summary><p><b>数据：</b>{r.popularity}</p><p><b>局限：</b>{r.boundary}</p><p><b>来源：</b>{r.provenance}</p></details><a className="research-source-link" href={r.url} target="_blank" rel="noreferrer">查看具体作品 <ArrowUpRight size={12}/></a></article>)}</div>
      {!results.length&&<p className="research-empty">没有匹配项，换个动作词或清除筛选。</p>}
      <div className="research-footer"><strong>静止时也要让人知道它想说什么。</strong><p>LINE 的官方制作指导要求静态首帧能传达贴图情绪。这里借鉴可读性原则；其 4 秒规格属于 LINE，不能套作 QQ GIF 或 H3 限制。用于生成视频的起势首帧，要能承接本条动作；最终 GIF 封面还可从成片挑选。</p><a href="https://creator.line.me/en/guideline/animationsticker/detail/" target="_blank" rel="noreferrer">LINE 官方动态贴图指导 ↗</a></div>
    </div>
  </Modal>;
}
