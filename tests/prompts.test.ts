import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/shared/catalog.ts';
import { buildAnchorPrompt, buildCharacterPrompt, buildNijiPrompt, buildStickerPrompt } from '../src/shared/prompts.ts';
import type { Character } from '../src/shared/types.ts';

const character: Character = {
  name: 'Margaret', description: '会认真听你说话、偶尔嘴硬的伙伴',
  identity: 'pale blonde twin tails, ruby red eyes, black hair ribbons, gold heart ornament',
  outfit: 'black and cream dress with red trim', personality: 'warm, playful, a little proud',
  referenceAssetId: 'private-local-image', anchorAssetId: 'approved-anchor',
};

test('catalog packs resolve to unique, selectable reactions with clear provenance', () => {
  assert.ok(catalog.reactions.length >= 36 && catalog.reactions.length <= 48);
  assert.equal(new Set(catalog.reactions.map(item => item.id)).size, catalog.reactions.length);
  assert.equal(catalog.styles.length, 3);
  const sourceIds = new Set(catalog.sources.map(item => item.id));
  for (const item of catalog.reactions) {
    assert.ok(item.action.length >= 40, item.id);
    assert.ok(item.tags.length >= 2, item.id);
    for (const sourceId of item.sourceIds ?? []) assert.ok(sourceIds.has(sourceId), sourceId);
  }
  for (const pack of catalog.packs) {
    assert.equal(new Set(pack.reactionIds).size, pack.reactionIds.length, pack.id);
    for (const id of pack.reactionIds) assert.ok(catalog.reactions.some(item => item.id === id), id);
  }
  assert.equal(catalog.packs.find(item => item.id === 'cute12')?.reactionIds.length, 12);
  assert.equal(catalog.packs.find(item => item.id === 'chaos12')?.reactionIds.length, 12);
  assert.equal(catalog.packs.find(item => item.id === 'daily24')?.reactionIds.length, 24);
  assert.ok(catalog.sources.every(item => /^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt)));
});

test('sticker prompt locks one selected style and preserves character cues without caption text', () => {
  const reaction = { ...catalog.reactions[0], caption: 'DO_NOT_DRAW_THIS_CAPTION' };
  const style = catalog.styles[1];
  const prompt = buildStickerPrompt(character, reaction, style);
  assert.ok(prompt.includes(character.identity));
  assert.ok(prompt.includes(character.outfit));
  assert.ok(prompt.includes(reaction.action));
  assert.ok(prompt.includes(style.prompt));
  assert.ok(!prompt.includes(catalog.styles[0].prompt));
  assert.match(prompt, /exactly one character/i);
  assert.match(prompt, /one reaction/i);
  assert.match(prompt, /one image/i);
  assert.match(prompt, /no text/i);
  assert.match(prompt, /transparent/i);
  assert.ok(!prompt.includes(reaction.caption));
  assert.doesNotMatch(prompt, /菲比|塔菲|Phoebe|Taffy|private-local-image|approved-anchor/);
});

test('every reaction can change while the chosen style stays identical', () => {
  for (const reaction of catalog.reactions) {
    const prompt = buildStickerPrompt(character, reaction, catalog.styles[0]);
    assert.ok(prompt.includes(catalog.styles[0].prompt));
    assert.ok(prompt.includes(reaction.action));
  }
});

test('mixed starter pack changes framing and silhouette while retaining all existing reactions', () => {
  const pack = catalog.packs.find(item => item.id === 'mixed12');
  assert.ok(pack, 'a varied starter pack must be selectable');
  assert.equal(catalog.packs[0].id, 'mixed12');
  assert.equal(pack.reactionIds.length, 12);
  const chosen = pack.reactionIds.map(id => catalog.reactions.find(item => item.id === id)!);
  assert.ok(new Set(chosen.map(item => item.compositionId)).size >= 6);
  assert.ok(chosen.filter(item => item.compositionId === 'closeup').length <= 3);
  assert.equal(catalog.reactions.length, 48, 'old project reaction IDs stay usable');
  const compositionIds = new Set(catalog.compositions.map(item => item.id));
  for (const reaction of catalog.reactions) assert.ok(compositionIds.has(reaction.compositionId!), reaction.id);
});

test('whole-body and prone reactions require complete bodies instead of the portrait default', () => {
  for (const id of ['running', 'rolling', 'wriggle', 'low-battery', 'victory']) {
    const reaction = catalog.reactions.find(item => item.id === id)!;
    const prompt = buildStickerPrompt(character, reaction, catalog.styles[0]);
    assert.match(prompt, /entire body|whole body|full-body/i, id);
    assert.match(prompt, /not a portrait|no portrait/i, id);
    assert.doesNotMatch(prompt, /requested close-up may crop the torso|head-to-body ratio.*unchanged/i, id);
  }
  const prone = buildStickerPrompt(character, catalog.reactions.find(item => item.id === 'wriggle')!, catalog.styles[0]);
  assert.match(prone, /belly-down/i);
  assert.doesNotMatch(prone, /stand upright|standing pose/i);
});

test('selected staging overrides reference framing and supports deliberate per-reaction choice', () => {
  const reaction = { ...catalog.reactions.find(item => item.id === 'hug')!, compositionId: 'fullbody' as const };
  const prompt = buildStickerPrompt(character, reaction, catalog.styles[0]);
  assert.match(prompt, /do not copy.*pose.*camera.*crop.*scale/i);
  assert.ok(prompt.includes(catalog.compositions.find(item => item.id === 'fullbody')!.prompt));
  assert.ok(!prompt.includes(catalog.compositions.find(item => item.id === 'halfbody')!.prompt));
  assert.doesNotMatch(prompt, /props stay small|subordinate to the face|requested close-up may crop/i);
  assert.ok(prompt.includes(catalog.styles[0].prompt));
  const legacy = { ...catalog.reactions.find(item => item.id === 'running')! };
  delete legacy.compositionId;
  assert.ok(buildStickerPrompt(character, legacy, catalog.styles[0]).includes(catalog.compositions.find(item => item.id === 'action')!.prompt));
  const custom = { ...legacy, id: 'custom-reaction', action: 'Hold both arms open in a friendly invitation.' };
  assert.ok(buildStickerPrompt(character, custom, catalog.styles[0]).includes(catalog.compositions.find(item => item.id === 'halfbody')!.prompt));
});

test('switching a face reaction to full body removes the close camera request', () => {
  for (const id of ['waao', 'watching-you']) {
    const reaction = { ...catalog.reactions.find(item => item.id === id)!, compositionId: 'fullbody' as const };
    const prompt = buildStickerPrompt(character, reaction, catalog.styles[0]);
    assert.match(prompt, /Full-body wide framing/i);
    assert.doesNotMatch(prompt, /Face close to the viewer|oversized face toward the viewer/i);
  }
  for (const reaction of catalog.reactions) {
    assert.doesNotMatch(reaction.action, /camera|framing|canvas|close-up|three-quarter view|overhead angle|viewed slightly from above|whole compact body|entire upper body visible/i, reaction.id);
  }
});

test('anchor establishes one reusable neutral character, character sheet includes useful views', () => {
  const anchor = buildAnchorPrompt(character, catalog.styles[0]);
  assert.match(anchor, /exactly one character/i);
  assert.match(anchor, /neutral/i);
  assert.ok(anchor.includes(character.identity));
  const sheet = buildCharacterPrompt(character);
  assert.match(sheet, /front view, side view, back view/i);
  assert.match(sheet, /head close-up/i);
  assert.match(sheet, /outfit detail/i);
  assert.ok(sheet.includes(character.description));
  assert.doesNotMatch(sheet, /--niji/);
});

test('Niji sheet defaults use Niji 7 and manual-import-compatible parameters', () => {
  const prompt = buildNijiPrompt(character);
  assert.equal(prompt, buildNijiPrompt(character, { layout: 'detail' }));
  assert.match(prompt, /front view, side view, back view/i);
  assert.match(prompt, /head close-up/i);
  assert.match(prompt, /--niji 7 --ar 16:9 --s 160$/);
  assert.doesNotMatch(prompt, /--oref|--cref|--q(?:\s|$)|--raw|--style/);
  assert.ok(prompt.includes(character.description), 'Chinese descriptions remain explicit source text');
});

test('Niji options select layout, raw and a single numeric or HTTPS style reference', () => {
  assert.match(buildNijiPrompt(character, { layout: 'single' }), /--ar 2:3/);
  const turnaround = buildNijiPrompt(character, { layout: 'turnaround' });
  assert.match(turnaround, /front view, side view, back view/i);
  assert.doesNotMatch(turnaround, /head close-up|outfit detail close-up/i);
  const detail = buildNijiPrompt(character, { layout: 'detail' });
  assert.match(detail, /front view, side view, back view/i);
  assert.match(detail, /three.*full-body/i);
  assert.match(detail, /head close-up/i);
  assert.match(detail, /outfit detail close-up/i);
  assert.match(buildNijiPrompt(character, { stylize: 220, raw: true, styleReference: '4064340293' }), /--s 220 --raw --sref 4064340293$/);
  assert.match(buildNijiPrompt(character, { styleReference: 'https://example.com/style.png?version=2' }), /--sref https:\/\/example\.com\/style\.png\?version=2$/);
});

test('Niji rejects malformed style references instead of appending extra parameters', () => {
  for (const styleReference of ['42 --niji 6', '42\n--repeat 100', 'random', 'javascript:alert(1)', 'file:///private.png', 'https://name:secret@example.com/a.png', 'https://example.com/a.png --q 4', 'https://example.com/%0a--repeat', 'https://example.com/a.png::2']) {
    assert.throws(() => buildNijiPrompt(character, { styleReference }), /style reference|风格参考/i, styleReference);
  }
});

test('Niji rejects invalid parameter values and prevents parameters inside user prose', () => {
  for (const stylize of [-1, 1001, NaN, Infinity, 1.5]) {
    assert.throws(() => buildNijiPrompt(character, { stylize }), /stylize|风格化/i);
  }
  assert.throws(() => buildNijiPrompt(character, { layout: 'unknown' as 'single' }), /layout|布局/i);
  const prompt = buildNijiPrompt({ ...character, description: '金发 --repeat 40\n--v 6 ::5' });
  assert.doesNotMatch(prompt, /--repeat|--v 6|::5/);
  assert.equal((prompt.match(/--niji /g) ?? []).length, 1);
});
