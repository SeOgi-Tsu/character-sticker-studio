import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/shared/catalog.ts';
import { buildAnchorPrompt, buildCharacterPrompt, buildNijiPrompt, buildStickerPrompt } from '../src/shared/prompts.ts';
import type { Caption, Character, Reaction } from '../src/shared/types.ts';

const character: Character = {
  name: 'Margaret', description: '会认真听你说话、偶尔嘴硬的伙伴',
  identity: 'pale blonde twin tails, ruby red eyes, black hair ribbons, gold heart ornament',
  outfit: 'black and cream dress with red trim', personality: 'warm, playful, a little proud',
  referenceAssetId: 'private-local-image', anchorAssetId: 'approved-anchor',
};

test('catalog packs resolve to unique, selectable reactions with clear provenance', () => {
  assert.equal(catalog.reactions.length, 64);
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
  assert.equal(pack.reactionIds.length, 12);
  const chosen = pack.reactionIds.map(id => catalog.reactions.find(item => item.id === id)!);
  assert.ok(new Set(chosen.map(item => item.compositionId)).size >= 6);
  assert.ok(chosen.filter(item => item.compositionId === 'closeup').length <= 3);
  assert.equal(catalog.packs.find(item => item.id === 'all48')!.reactionIds.length, 48, 'the original complete pack keeps its recipe');
  const compositionIds = new Set(catalog.compositions.map(item => item.id));
  for (const reaction of catalog.reactions) assert.ok(compositionIds.has(reaction.compositionId!), reaction.id);
});

test('interaction starter combines new visual gags, old favorites and quiet beats', () => {
  const pack = catalog.packs.find(item => item.id === 'interaction12');
  assert.ok(pack);
  assert.equal(catalog.packs[0].id, 'interaction12');
  assert.equal(pack.reactionIds.length, 12);
  const originalIds = catalog.packs.find(item => item.id === 'all48')!.reactionIds;
  assert.equal(pack.reactionIds.filter(id => !originalIds.includes(id)).length, 8);
  const chosen = pack.reactionIds.map(id => catalog.reactions.find(item => item.id === id)!);
  assert.ok(new Set(chosen.map(item => item.compositionId)).size >= 6);
  assert.ok(chosen.filter(item => item.compositionId === 'closeup').length <= 3);
  assert.ok(new Set(chosen.map(item => item.interactionId ?? 'observe')).size >= 5);
  assert.ok(chosen.some(item => item.intensity === 1), 'quiet beats balance dramatic gestures');
  assert.ok(chosen.some(item => item.intensity === 3), 'dramatic gestures are available');
  for (const item of chosen.filter(item => !originalIds.includes(item.id))) {
    assert.ok(item.intent && item.intent.length > 8, item.id);
    assert.ok(item.interactionId, item.id);
  }
});

test('viewer-contact prompt permits one clearly connected hand without blanket margin prohibitions', () => {
  const reaction = { ...catalog.reactions[0], interactionId: 'squish', intensity: 3, compositionId: 'closeup' } as Reaction;
  const prompt = buildStickerPrompt(character, reaction, catalog.styles[0]);
  assert.match(prompt, /one anonymous viewer hand/i);
  assert.match(prompt, /contact point/i);
  assert.match(prompt, /not an extra arm belonging to the character/i);
  assert.doesNotMatch(prompt, /no extra hands|all intentionally visible.*must stay inside|safe margin around the whole|generous margins/i);
  assert.match(prompt, /one dominant visual joke/i);
  assert.match(prompt, /eyes and mouth.*readable/i);
});

test('observation and legacy recipes never require a viewer hand or a lens approach', () => {
  const reaction = { ...catalog.reactions.find(item => item.id === 'blanket')!, interactionId: 'observe', intensity: 1 } as Reaction;
  for (const candidate of [reaction, { ...reaction, interactionId: undefined, intensity: undefined }]) {
    const prompt = buildStickerPrompt(character, candidate, catalog.styles[0]);
    assert.match(prompt, /Observation mode/i);
    assert.match(prompt, /do not introduce an off-screen viewer hand/i);
    assert.doesNotMatch(prompt, /add one anonymous viewer hand|reach into the viewer|mandatory close-up/i);
    assert.ok(prompt.includes(catalog.compositions.find(item => item.id === 'scene')!.prompt));
  }
});

test('interaction and intensity respect selected wide staging and do not replace identity', () => {
  const reaction = { ...catalog.reactions.find(item => item.id === 'hug')!, interactionId: 'approach', intensity: 3, compositionId: 'fullbody', intent: '看到冲过来的小伙伴，想张开手接住她。' } as Reaction;
  const prompt = buildStickerPrompt(character, reaction, catalog.styles[0]);
  assert.ok(prompt.includes(character.identity));
  assert.ok(prompt.includes(reaction.intent!));
  assert.match(prompt, /Full-body wide framing/i);
  assert.match(prompt, /selected staging has priority over interaction/i);
  assert.match(prompt, /dramatic.*foreshortening/i);
  assert.doesNotMatch(prompt, /face must fill|deliberately crop.*feet|mandatory close-up/i);
  const calm = buildStickerPrompt(character, { ...reaction, intensity: 1 }, catalog.styles[0]);
  assert.match(calm, /gentle.*natural proportions/i);
  assert.doesNotMatch(calm, /Dramatic intensity/i);
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

test('every prompt builder preserves the original sheet outfit above an inconsistent style anchor', () => {
  const referenceCharacter = { ...character, outfit: 'open cardigan with a low curved neckline, detached sleeves and asymmetric legwear' };
  const prompts = [
    buildAnchorPrompt(referenceCharacter, catalog.styles[0]),
    buildStickerPrompt(referenceCharacter, catalog.reactions[0], catalog.styles[0]),
    buildCharacterPrompt(referenceCharacter),
    buildNijiPrompt(referenceCharacter),
  ];
  for (const prompt of prompts) {
    assert.match(prompt, /original character reference.*outfit authority/i);
    assert.match(prompt, /outranks.*chibi anchor.*style reference/i);
    assert.match(prompt, /if two reference images are supplied.*first.*original.*identity.*outfit.*second.*face.*drawing.style.*anchor only.*original controls clothes/i);
    assert.match(prompt, /garment types.*neckline contour and depth.*open or closed layering.*shoulder and sleeve.*hem.*legwear.*accessor/i);
    assert.match(prompt, /simplify.*rendering.*not.*redesign/i);
    assert.match(prompt, /do not.*add fabric.*change coverage/i);
    assert.match(prompt, /outfit notes clarify.*do not override/i);
    assert.ok(prompt.includes(referenceCharacter.outfit));
    assert.doesNotMatch(prompt, /must wear.*(?:turtleneck|pullover)|fully covered|mandatory.*high.neck/i);
  }
});

test('explicit custom outfit mode authorizes the user design in all builders without reference conflicts', () => {
  const customized = { ...character, outfitMode: 'custom' as const, outfit: 'a navy raincoat with brass buttons and yellow boots' };
  for (const prompt of [buildAnchorPrompt(customized, catalog.styles[1]), buildStickerPrompt(customized, catalog.reactions[0], catalog.styles[1]), buildCharacterPrompt(customized), buildNijiPrompt(customized)]) {
    assert.match(prompt, /user explicitly chose.*custom outfit/i);
    assert.match(prompt, /user.*outfit text.*overrides.*reference clothing/i);
    assert.ok(prompt.includes(customized.outfit));
    assert.doesNotMatch(prompt, /original character reference.*outfit authority|outfit notes clarify.*do not override|original controls clothes/i);
    assert.match(prompt, /identity.*hair.*eyes/i);
  }
});

test('described characters without a reference can define clothes without inventing reference authority', () => {
  const described = { ...character, referenceAssetId: undefined, anchorAssetId: undefined };
  assert.match(buildAnchorPrompt(described, catalog.styles[0]), /no original character reference.*user.*outfit text/i);
  assert.match(buildCharacterPrompt(described), /no original character reference.*user.*outfit text/i);
});

test('half and full-body interaction pack adds four recipes while preserving previous 56 and seven framing types', () => {
  const oldPack = catalog.packs.find(item => item.id === 'all56')!;
  assert.equal(oldPack.reactionIds.length, 56);
  assert.equal(catalog.packs.find(item => item.id === 'all60')!.reactionIds.length, 60);
  assert.equal(catalog.compositions.length, 7);
  const newIds = ['viewer-offer', 'tiptoe-wave', 'tiny-confident', 'thoughtful-sulk'];
  const v4Ids = catalog.packs.find(item => item.id === 'all60')!.reactionIds;
  assert.deepEqual(v4Ids.filter(id => !oldPack.reactionIds.includes(id)), newIds);
  const pack = catalog.packs.find(item => item.id === 'body-interaction12')!;
  assert.ok(pack, 'a dedicated half/full-body pack must be selectable');
  const selected = pack.reactionIds.map(id => catalog.reactions.find(item => item.id === id)!);
  assert.equal(selected.length, 12);
  assert.equal(selected.filter(item => item.compositionId === 'fullbody').length, 6);
  assert.equal(selected.filter(item => item.compositionId === 'halfbody').length, 6);
  assert.ok(new Set(selected.map(item => item.interactionId ?? 'observe')).size >= 5);
  for (const id of newIds) {
    assert.ok(pack.reactionIds.includes(id));
    const reaction = catalog.reactions.find(item => item.id === id)!;
    const prompt = buildStickerPrompt(character, reaction, catalog.styles[0]);
    assert.ok(reaction.intent && reaction.intent.length > 8);
    assert.match(prompt, /waist-up medium framing|full-body wide framing/i);
    assert.doesNotMatch(prompt, /close-up framing:|whale tail|whale fins/i);
  }
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

const sampleCaption: Caption = { text: '才、才没有！', enabled: true, color: '#fff4e7', stroke: '#422435', position: 'right', fontSize: 52, mode: 'generated', styleId: 'handwritten', rotation: -8 };

test('native lettering uses only the selected caption verbatim and removes contradictory text exclusions', () => {
  const reaction = { ...catalog.reactions[0], caption: '不要画这句默认文案' };
  const prompt = buildStickerPrompt(character, reaction, catalog.styles[0], sampleCaption);
  assert.equal(prompt.split(sampleCaption.text).length - 1, 1);
  assert.ok(prompt.includes(JSON.stringify(sampleCaption.text)), 'exact wording and punctuation must be quoted');
  assert.ok(!prompt.includes(reaction.caption), 'an explicit per-image caption overrides the reaction recommendation');
  assert.match(prompt, /integrat.*lettering.*image|lettering.*part of.*image/i);
  assert.match(prompt, /right.*(?:side|edge)|(?:side|edge).*right/i);
  assert.match(prompt, /hand.*(?:drawn|written)|brush pen/i);
  assert.match(prompt, /negative space/i);
  assert.match(prompt, /no logo.*no watermark/i);
  assert.doesNotMatch(prompt, /no text|no letters|no numbers|no speech bubbles|no captions|typography is added separately/i);
  assert.ok(prompt.includes(character.identity));
  assert.ok(prompt.includes(catalog.styles[0].prompt));
});

test('caption modes preserve text-free source generation for legacy, none and overlay choices', () => {
  const reaction = { ...catalog.reactions[0], textMode: 'generated' as const };
  for (const caption of [undefined, { ...sampleCaption, mode: 'none' as const }, { ...sampleCaption, mode: 'overlay' as const }, { ...sampleCaption, mode: undefined }, { ...sampleCaption, enabled: false }]) {
    const prompt = buildStickerPrompt(character, reaction, catalog.styles[0], caption);
    assert.match(prompt, /no text/i);
    assert.ok(!prompt.includes(sampleCaption.text));
  }
  const none = buildStickerPrompt(character, reaction, catalog.styles[0], { ...sampleCaption, mode: 'none' });
  assert.doesNotMatch(none, /typography is added separately/i, 'none must not imply a mandatory later caption');
});

test('native multiline lettering keeps selected wording and supports all six style directions', () => {
  for (const style of catalog.captionStyles ?? []) {
    const caption = { ...sampleCaption, styleId: style.id, text: '看好了…\n哼哼！', position: 'top' as const };
    const prompt = buildStickerPrompt(character, catalog.reactions[0], catalog.styles[0], caption);
    assert.ok(prompt.includes(JSON.stringify(caption.text)));
    assert.ok(prompt.includes(style.prompt), style.id);
    assert.match(prompt, /top/i);
    assert.match(prompt, /line break/i);
  }
  assert.equal(catalog.captionStyles?.length, 6);
});

test('native lettering translates the size control into approximate relative glyph height only', () => {
  const make = (fontSize: number, mode: Caption['mode'] = 'generated') => buildStickerPrompt(character, catalog.reactions[0], catalog.styles[0], { ...sampleCaption, fontSize, mode });
  const small = make(20), large = make(96);
  assert.notEqual(small, large);
  assert.match(small, /glyph height.*approximately 3\.9%.*canvas height/i);
  assert.match(large, /glyph height.*approximately 18\.8%.*canvas height/i);
  assert.match(large, /aesthetic.*reference.*not.*exact.*pixel/i);
  assert.equal(make(20, 'none'), make(96, 'none'));
  assert.equal(make(20, 'overlay'), make(96, 'overlay'));
});

test('meme personality guides acting and comedic reversal without changing the reference design or Niji sheet', () => {
  const brief = '成年角色。爱逞强，喜欢小小挑衅；被反将一军时脸红嘴硬。亲近时偷偷递来甜点，却假装只是顺手。';
  const customized = { ...character, outfit: 'open cardigan with a low curved neckline, detached sleeves and asymmetric legwear', memePersona: brief };
  const prompt = buildStickerPrompt(customized, catalog.reactions[0], catalog.styles[0]);
  assert.ok(prompt.includes(brief));
  assert.match(prompt, /motivat.*speech rhythm.*comedic reversal/i);
  assert.match(prompt, /personality brief.*behavior.*not.*(?:age|wardrobe)/i);
  assert.match(prompt, /original character reference.*outfit authority/i);
  assert.match(prompt, /preserve.*age.*body.*outfit/i);
  assert.ok(prompt.includes(customized.outfit));
  assert.equal(buildNijiPrompt(customized), buildNijiPrompt({ ...customized, memePersona: undefined }), 'the optional chat persona must not rewrite the character sheet');
  assert.doesNotMatch(prompt, /mesugaki|loli|schoolgirl|seduct|erotic/i);
});

test('persona starter retains the original sixty and mixes native words, editable words and wordless acting', () => {
  const old = catalog.packs.find(item => item.id === 'all60')!;
  const all = catalog.packs.find(item => item.id === 'all64');
  const pack = catalog.packs.find(item => item.id === 'bratty12');
  assert.ok(all);
  assert.ok(pack);
  assert.equal(old.reactionIds.length, 60);
  assert.equal(all.reactionIds.length, 64);
  const newIds = ['smug-challenge', 'caught-bluff', 'little-victory', 'quiet-softening'];
  assert.deepEqual(all.reactionIds.filter(id => !old.reactionIds.includes(id)), newIds);
  assert.equal(pack.reactionIds.length, 12);
  assert.ok(newIds.every(id => pack.reactionIds.includes(id)));
  assert.equal(pack.reactionIds.filter(id => old.reactionIds.includes(id)).length, 8);
  const selected = pack.reactionIds.map(id => catalog.reactions.find(item => item.id === id)!);
  assert.deepEqual(new Set(selected.map(item => item.textMode)), new Set(['none', 'overlay', 'generated']));
  assert.ok(new Set(selected.map(item => item.compositionId)).size >= 5);
  assert.ok(selected.some(item => item.intensity === 1));
  assert.ok(selected.some(item => item.intensity === 3));
  assert.ok(catalog.personas.length >= 3);
  for (const preset of catalog.personas) {
    assert.ok(preset.brief.length > 40 && preset.brief.length <= 1200, preset.id);
    assert.doesNotMatch(preset.brief, /mesugaki|loli|schoolgirl|seduct|erotic|雌小鬼|未成年/i);
  }
});
