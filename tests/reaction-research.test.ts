import test from 'node:test';
import assert from 'node:assert/strict';
import { reactionReferences } from '../src/shared/reaction-research.ts';
import { originalTheatreTemplates, theatreTemplates } from '../src/shared/theatre.ts';
import { everydayTheatreTemplates } from '../src/shared/everyday-theatre.ts';
import { comedyTheatreTemplates } from '../src/shared/comedy-theatre.ts';
import { personalityTheatreTemplates } from '../src/shared/personality-theatre.ts';
import { chatReactionTheatreTemplates } from '../src/shared/chat-reactions-theatre.ts';

const originalReferenceIds=[
  'phoebe-blanket','phoebe-food','phoebe-taunt-counterexample',
  'taffy-punch','taffy-cry','taffy-laugh','taffy-fake-counterexample',
  'deepseek-caught','deepseek-denial','deepseek-bawl',
  'usagyuuun-bawl','betakkuma-body','milkmocha-pinch','milkmocha-heart',
  'peach-emotions','momonga-attention','pusheen-caught','pusheen-attention',
];

test('every research entry retains source, observation boundaries and an actionable independent first-frame direction',()=>{
  const ids=new Set(reactionReferences.map(r=>r.id));assert.equal(ids.size,reactionReferences.length);
  for(const id of originalReferenceIds)assert.ok(ids.has(id),`original research entry ${id} was lost`);
  for(const r of reactionReferences){assert.equal(new URL(r.url).protocol,'https:');for(const field of ['id','family','title','format','observed','verification','provenance','theme','mechanism','popularity','boundary','adaptation','firstFrame'] as const)assert.ok(r[field].trim().length>0,`${r.id} missing ${field}`);assert.ok(r.uses.length>0&&r.uses.every(use=>use.trim().length>0),`${r.id} missing chat uses`);}
  assert.equal(reactionReferences.find(r=>r.id==='deepseek-caught')!.format,'静态四格');
  assert.equal(reactionReferences.find(r=>r.id==='momonga-attention')!.format,'静态贴图');
});
test('each ready theatre has its own scene, opening pose and staging, rather than filename-only variants',()=>{
  const allPacks=[...originalTheatreTemplates,...everydayTheatreTemplates,...comedyTheatreTemplates,...personalityTheatreTemplates,...chatReactionTheatreTemplates];
  assert.deepEqual(theatreTemplates.map(t=>t.id),allPacks.map(t=>t.id));
  assert.equal(new Set(theatreTemplates.map(t=>t.id)).size,theatreTemplates.length);
  assert.equal(new Set(theatreTemplates.map(t=>t.scene)).size,theatreTemplates.length);
  assert.equal(new Set(theatreTemplates.map(t=>t.pose)).size,theatreTemplates.length);
  assert.equal(new Set(theatreTemplates.map(t=>t.theatre!.framing)).size,theatreTemplates.length);
  const laughter=theatreTemplates.find(t=>t.id==='theatre-laugh-roll')!;
  assert.match(laughter.pose,/supports the yellow cushion/);assert.match(laughter.beats[1],/Release the yellow cushion/);
});
