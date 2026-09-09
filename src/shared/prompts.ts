import type { Character, Reaction, Style } from './types.ts';
import { getComposition } from './catalog.ts';

export interface NijiPromptOptions {
  layout?: 'single' | 'turnaround' | 'detail';
  stylize?: number;
  raw?: boolean;
  styleReference?: string;
}

function cleanProse(value: string | undefined): string {
  return (value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function characterDescription(character: Character): string {
  return [
    ['Character name', character.name],
    ['Character concept supplied by the user', character.description],
    ['Identity cues that must remain recognizable', character.identity],
    ['Outfit and accessories', character.outfit],
    ['Personality', character.personality],
  ].filter(([, value]) => cleanProse(value)).map(([label, value]) => `${label}: ${cleanProse(value)}.`).join('\n');
}

const identityRule = 'Use the supplied character reference for identity: preserve the recognizable hair design, hair color, eye color, distinctive accessories and outfit color blocks. Use an approved chibi anchor to preserve the chosen drawing finish and those identity cues only. Do not copy the reference pose, camera angle, crop or subject scale. Rebuild the silhouette and staging for this reaction, keeping the selected drawing style coherent; expressive squash, stretch and foreshortening are welcome where the action needs them. Keep accessories attached naturally and do not substitute a different character.';
const stickerComposition = 'Output: exactly one character, one reaction, one image. A single isolated sticker unit on a square canvas, legible at 96 pixels, with safe margin around the whole chosen staging. Follow the selected framing; all intentionally visible hair ornaments, hands, feet and props must stay inside the canvas. No grid, no collage, no multi-panel sheet, no duplicate poses, no extra characters. Prefer genuine transparent background where supported; otherwise use a plain uniform white background, never a drawn checkerboard. No text, no letters, no numbers, no speech bubbles, no captions, no logo and no watermark. Caption typography is added separately after generation.';

export function buildStickerPrompt(character: Character, reaction: Reaction, style: Style): string {
  return [
    'Create a cute, highly readable original character reaction sticker.',
    characterDescription(character),
    identityRule,
    `Use only this selected visual style for the entire set: ${cleanProse(style.prompt)}`,
    `Selected staging — this determines camera distance, crop and subject scale even if the reference uses different framing: ${getComposition(reaction).prompt}`,
    `Draw this one concrete action and expression: ${cleanProse(reaction.action)}`,
    'Capture the clearest single instant of the reaction. A dynamic action is one frozen pose, not a sequence. Body posture, silhouette and object interaction must carry the emotion as well as the face. If wording in the action suggests a different crop, keep its emotion and adapt the gesture to the selected staging. Hands have simple natural anatomy; required props remain readable without covering the eyes. Use only a few purposeful hearts, tears or motion marks.',
    stickerComposition,
  ].join('\n\n');
}

export function buildAnchorPrompt(character: Character, style: Style): string {
  return [
    'Create one reusable chibi character anchor for a consistent reaction sticker set.',
    characterDescription(character),
    identityRule,
    `Use only this selected visual style: ${cleanProse(style.prompt)}`,
    'Draw exactly one character in a neutral front-facing full-body standing pose, arms relaxed slightly away from the torso, a small warm closed-mouth smile and attentive open eyes. Show the hair, key accessories, simplified outfit and footwear clearly. This anchor establishes recognizable design and drawing finish; later stickers deliberately change pose, camera distance, framing and subject scale. One image, one pose, no character sheet, no expressions row, no extra subjects.',
    'Square canvas, centered compact silhouette with generous margins, clean flat lighting. Prefer genuine transparent background where supported; otherwise a plain white background, never a drawn checkerboard. No text, no captions, no lettering, no logo, no watermark.',
  ].join('\n\n');
}

const sheetRendering = 'Beautiful cohesive anime character design, appealing expressive face, clean 2D lineart, crisp cel shading, thoughtfully grouped colors, believable costume construction, readable silhouette, polished anime production model sheet on a plain light background. Preserve the exact same face, hair, outfit, proportions and accessory placement in every view. All views depict the same one character, not different cast members. No text, labels, typography, logos, watermarks or decorative UI.';
const turnaroundLayout = 'A clear anime character turnaround sheet: front view, side view, back view as three evenly spaced full-body turnarounds of the same character. Feet aligned to one baseline, consistent orthographic scale, neutral relaxed pose, clear space between views. Exactly three full-body views; no additional panels or close-ups.';
const detailLayout = 'A clear character reference sheet: front view, side view, back view as three evenly spaced full-body turnarounds; a large head close-up at the right and two smaller outfit detail close-ups below it. Feet aligned to one baseline, consistent orthographic scale, neutral relaxed pose, no overlapping panels, clear space between views. Head close-up explains the eyes, fringe and hair accessories; outfit detail panels explain the most distinctive fastenings and ornaments.';

export function buildCharacterPrompt(character: Character): string {
  return [
    'Create an anime character design sheet from the following character concept.',
    characterDescription(character),
    'Where a character reference is supplied, preserve its identity; fill only unspecified design details consistently with the user’s concept.',
    detailLayout,
    sheetRendering,
  ].join('\n\n');
}

function styleReferenceToken(value: string): string {
  const token = value.trim();
  if (/^\d{1,20}$/.test(token)) return token;
  // This token is copied to Midjourney, never fetched by this module. Accept
  // one explicit URL only, so spaces, weights or flags cannot alter the prompt.
  if (token.length > 2048 || /[\s<>"'\\{}]|--|::|%(?:0[0-9a-f]|20)/i.test(token)) {
    throw new Error('风格参考 / style reference 必须是单个数字代码或不含参数的 HTTPS 图片链接。');
  }
  try {
    const url = new URL(token);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.hash) throw new Error('Invalid URL');
    return url.href;
  } catch {
    throw new Error('风格参考 / style reference 必须是单个数字代码或 HTTPS 图片链接，不能包含账号、参数指令或片段。');
  }
}

export function buildNijiPrompt(character: Character, options: NijiPromptOptions = {}): string {
  const layout = options.layout ?? 'detail';
  if (!['single', 'turnaround', 'detail'].includes(layout)) throw new Error('布局 / layout 必须是 single、turnaround 或 detail。');
  const stylize = options.stylize ?? 160;
  if (!Number.isInteger(stylize) || stylize < 0 || stylize > 1000) throw new Error('风格化 / stylize 必须是 0–1000 的整数。');

  const layoutPrompt = layout === 'single'
    ? 'One beautiful full-body anime character illustration, one character standing in a relaxed readable three-quarter pose, complete outfit and footwear visible, generous empty margin, no additional views or panels.'
    : layout === 'detail'
      ? detailLayout
      : turnaroundLayout;

  // User prose remains in its supplied language. We do not claim translation
  // or insert hidden LLM calls. Neutralize MJ control syntax in all prose.
  const prose = [layoutPrompt, characterDescription(character), sheetRendering]
    .join(' ').replace(/--+/g, '—').replace(/::+/g, ':').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  const parameters = [`--niji 7`, `--ar ${layout === 'single' ? '2:3' : '16:9'}`, `--s ${stylize}`];
  if (options.raw) parameters.push('--raw');
  if (options.styleReference?.trim()) parameters.push(`--sref ${styleReferenceToken(options.styleReference)}`);
  return `${prose} ${parameters.join(' ')}`;
}
