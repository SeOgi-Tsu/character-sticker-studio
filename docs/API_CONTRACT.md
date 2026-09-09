# Shared contract (frontend/backend/content) · v0.6.0

V0.2 adds per-reaction `compositionId`, `catalog.compositions`, RunningHub provider settings and `POST /api/jobs/:id/resume`. See [V2_CONTRACT.md](V2_CONTRACT.md) for the exact additions. Known RunningHub remote tasks resume querying on restart; other ambiguous submissions remain unknown. All original endpoints remain compatible.

V0.3 adds `catalog.interactions` and optional Reaction/override fields `interactionId` (observe/approach/offer/touch/squish/comic), `intensity` (integer 1..3), and `intent` (string, max160 UTF-16 code units). These survive project save and recipe import/export. Missing fields preserve old recipe compatibility; prompt defaults are observe/2/no intent. Existing provider requests and settings are unchanged. See [V3_INTERACTION_PLAN.md](V3_INTERACTION_PLAN.md).

V0.4 adds `Character.outfitMode` (reference/custom, default reference), ordered original + secondary chibi reference transport, and optional `RunningHubSettings.styleReferenceNode`. In reference mode new sticker jobs prioritize the original garment source; custom mode permits text-led redesign. See [V4_WARDROBE_CONTRACT.md](V4_WARDROBE_CONTRACT.md); old single-reference jobs remain compatible.

V0.5.0 adds three per-image text modes, six caption styles, three bundled OFL Chinese fonts, an editable meme-personality brief and four new reactions (64 total). Existing cloud API and RunningHub transport/settings stay unchanged. See [V5_TEXT_PERSONA_CONTRACT.md](V5_TEXT_PERSONA_CONTRACT.md) and [TYPOGRAPHY_BACKEND.md](TYPOGRAPHY_BACKEND.md).

V0.6.0 adds optional per-character signature motifs and per-reaction single-image mini-scenes, six new reactions (70 total), and pack `mini-theater12` (角色小剧场 12). Original 64 reaction IDs, their packs, reference-outfit rules and Niji generation/import flow remain available. Default selections are not automatically enlarged. See [V6_MINI_SCENE_CONTRACT.md](V6_MINI_SCENE_CONTRACT.md).

Shared TS types: `src/shared/types.ts`. Content exports `catalog` from `src/shared/catalog.ts` and `buildStickerPrompt(character, reaction, style, caption?)`, `buildAnchorPrompt(character, style)`, `buildCharacterPrompt(character)`, `buildNijiPrompt(character, options?)` from `src/shared/prompts.ts`. Niji options: `{layout?: 'single'|'turnaround'|'detail', stylize?: number, raw?: boolean, styleReference?: string}`. All return string. Omitting the optional sticker caption preserves a text-free generation prompt; the jobs API resolves the project's caption or reaction recommendation before calling this function.

## V0.6.0 optional mini-scene fields

| Field | Contract |
| --- | --- |
| `Character.signatureMotifs?` | String, max 400 UTF-16 code units; recurring props/visual motifs for sticker generation only. Empty or omitted means no added direction. It must not override outfit, identity, body, age or reference priority. |
| `Reaction.miniScene?` | Optional complete object `{enabled:boolean, setup:string, reveal:string, prop:string}`, also supported in custom reactions and overrides. If supplied, all four fields are required and validated. |
| `miniScene.setup` | Max 240 UTF-16 code units: the situation implied by one still image. |
| `miniScene.reveal` | Max 240 UTF-16 code units: the visible detail that reveals the joke or contradiction. |
| `miniScene.prop` | Max 160 UTF-16 code units: one main prop or a small group of the same object. |
| `Project.selectedIds`, explicit job `reactionIds` | Input array maximum 200; IDs must identify known reactions. This accommodates 70 built-ins plus up to 64 custom reactions without increasing the custom-reaction limit or auto-selecting more images. |

For example, a per-reaction override uses a complete object even when some text fields are blank:

```json
{
  "miniScene": {
    "enabled": true,
    "setup": "被发现偷吃，却装作没事。",
    "reveal": "嘴边留下饼干屑，手里还藏着咬过一口的点心。",
    "prop": "一块心形饼干"
  }
}
```

Disable by writing the same object with `enabled:false`; retain `setup/reveal/prop` for later editing. Disabled, omitted or all-blank mini-scenes add no mini-scene prompt. These fields describe one frozen moment, not literal caption text or additional comic panels; no room background or typography is mandatory. Existing framing and viewer-hand interaction rules still govern. Text modes `none/overlay/generated` remain independent, including immutable native-lettering behavior below.

Project save and recipe roundtrips retain motifs and mini-scenes, including disabled content. Generation composes them into the frozen prompt, and retries keep that original prompt; editing affects only a new generation and does not alter existing image pixels. Invalid supplied mini-scene objects are rejected before saved project mutation.

Pack `mini-theater12` combines six new IDs (`cookie-alibi`, `gift-custodian`, `lid-deadlock`, `secret-standby`, `umbrella-bias`, `reserved-cushion`) with six existing reactions. `all70` contains the complete library; `all64` and older packs remain. Pack selection does not overwrite stored overrides or captions. The creative basis follows the user's corrected whale-image references and supplementary observations of an official VTuber sticker set; [V6_REFERENCE_NOTES.md](V6_REFERENCE_NOTES.md) distinguishes those observations from unsupported popularity rankings.

## V0.5.0 text and persona fields

| Field | Contract |
| --- | --- |
| `Character.memePersona?` | Editable string, max 1,200 UTF-16 code units. Describes motives, speech rhythm, habits and comedic reversal; it does not replace identity or outfit settings. |
| `Caption.mode?` | `none`, `overlay` or `generated`. Existing `enabled:false` or explicit `mode:none` always resolves to `none`; old enabled captions without `mode` resolve to `overlay`. |
| `Caption.styleId?` | `classic`, `round`, `handwritten`, `brush`, `bubble` or `comic`. An explicitly stored legacy caption without this field retains the classic renderer. |
| `Caption.position` | `top`, `bottom`, `left` or `right`; default `bottom`. |
| `Caption.rotation?` | Finite number from −20 to 20 degrees; default 0. |
| `Caption.fontSize` | Finite number from 12 to 120; default 52. Local rendering scales this against a 512px canvas. Native generation receives `fontSize / 512` as approximate glyph-height proportion, not a precise pixel guarantee. Current UI sliders use 20–96. |
| `Caption.text` | Up to 48 Unicode code points including line breaks; six-digit hex `color` and `stroke` remain required after normalization. `generated` jobs reject empty/whitespace-only text before queue creation. |
| `Reaction.textMode?`, `Reaction.captionStyleId?` | Recommendations, also allowed in overrides. Explicit `Project.captions[reactionId]` settings take priority. |
| `Job.textMode?`, `Job.generatedText?` | Snapshot of actual generation intent. `generatedText` records the exact requested native text; it is not OCR or proof that the model rendered the spelling correctly. Older jobs without metadata remain compatible with clean-source post-captioning. |
| `Catalog.captionStyles`, `Catalog.personas` | Caption metadata and editable persona presets. Persona entries contain `id`, `name`, `description`, `brief`; choosing one copies `brief` into `Character.memePersona`. |

The shared module `src/shared/typography.ts` exports `resolveCaptionMode(caption?)`, `defaultCaptionFor(reaction)`, `captionStyleDefaults(styleId)` and `captionStyles`. New defaults use reaction recommendations or `overlay` + `round`. `captionStyleDefaults` returns only `styleId`, `color`, `stroke`, `fontSize`, `rotation`: apply these when selecting a preset while retaining the current text, mode, enabled flag and position. This ensures bubble lettering gets its dark-ink palette instead of inheriting white text from a legacy caption.

The six style names are 经典粗描边 (`classic`), 快乐软糖 (`round`), 随手碎碎念 (`handwritten`), 毛笔炸毛 (`brush`), 软萌对话泡 (`bubble`) and 漫画重击 (`comic`). `round`, `bubble`, `comic` use ZCOOL KuaiLe; `handwritten` uses Long Cang; `brush` uses Zhi Mang Xing. `classic` retains the system Chinese sans-serif fallback. The three font files, their original copyright/OFL 1.1 notices and source manifest ship in [public/fonts](../public/fonts/README.md). Their font licenses are separate from the application's MIT license; they are selected project fonts, not verified identifications of the fonts used in whale/DeepSeek reference memes.

Catalog pack `bratty12` (嘴硬小剧场 12) combines four new reactions with eight existing ones. Its recommendations mix four `generated`, four `overlay` and four `none`; saved project captions can change that mix. New IDs are `smug-challenge`, `caught-bluff`, `little-victory`, `quiet-softening`. Pack `all64` contains all 64 recipes; prior reaction IDs and packs remain available. Persona presets `adult-bratty`, `warm-soft`, `dry-deadpan` describe adult character performance; they do not issue age/body/wardrobe redesign commands. These are editable creative selections, not usage rankings.

### Source image versus current caption settings

- `none`: prompt requests no text; rendering adds no local caption. Stored wording remains available for later toggling.
- `overlay`: prompt requests a clean source; current local text, font, color, size, position, line breaks and rotation can be changed or switched off without altering source pixels. Ordinary clean images from previous versions remain editable this way.
- `generated`: prompt includes one exact quoted phrase plus lettering, position and size direction; removes conflicting no-text instructions. Returned letters belong to the raster image. The caller must review spelling and layout; native Chinese correctness is not guaranteed.

A source recorded as `Job.textMode: generated` must never receive a second local caption, regardless of subsequently edited project settings. Selecting `none`, requesting `caption=0`, or disabling captions during ZIP export only skips postprocessing: none of these erase source lettering. To change/remove it, save new settings and create a new generation (`none` for a text-free version). Retry deliberately retains the old prompt and text snapshot. For a clean source switched to desired `generated`, show the clean original and explain that its requested lettering appears only after a new generation; do not simulate it as already baked in.

Importers must declare already embedded text explicitly. No pixel inspection or OCR automatically determines `textMode`. Portable project recipes preserve the persona and per-reaction caption configuration; ZIP `recipe.json` additionally records result `textMode/generatedText`. Project recipe import creates a project, not reconstructed image jobs; import retained assets separately with their actual metadata when needed.

## Endpoints

All API results JSON unless PNG/ZIP; errors `{error:string}` with non-2xx status.

- GET `/api/bootstrap` -> Bootstrap (initial Margaret project, no bundled private image until imported locally).
- POST `/api/projects` body optional `{name,character}` -> Project.
- PUT `/api/projects/:id` body Project editable fields -> Project (validate; ignore supplied id/timestamps).
- POST `/api/assets` JSON `{filename,dataUrl,provenance?}` -> Asset, validate/decode image up to 15 MB. Stored filenames random, URL `/assets-local/:id.png`.
- GET `/api/settings` -> safe ProviderSettings. PUT `/api/settings` with ProviderSettings -> safe settings; blank/omitted apiKey preserves existing secret (explicit `clearApiKey:true` clears it). provider/base URL changes should clear prior key unless a new key is supplied.
- POST `/api/jobs` `{projectId,kind:'sticker'|'anchor'|'character',reactionIds?:string[],requestId:string}` -> `{jobs:Job[]}`. `reactionIds` accepts at most 200 entries, or defaults to the project's unchanged `selectedIds`. Freeze prompt/reference/provider config plus `textMode` and, for native lettering, `generatedText`; enabled mini-scenes and signature motifs are part of the frozen sticker prompt. Reject missing config/reference and empty native text before queue creation. In reference-outfit mode prioritize `referenceAssetId`, with a distinct `anchorAssetId` as optional second reference; otherwise prefer anchor then original. Repeated requestId must not cause duplicate paid calls. kind character may have no reference; anchor must have reference. Each single sticker -> single upstream call. No automatic fallback from edit to text-only. Default concurrency 2.
- GET `/api/jobs?projectId=...` -> Job[]. GET `/api/jobs/:id` -> Job.
- POST `/api/jobs/:id/cancel` -> Job (queued cancelled; running best-effort abort with ambiguity explained).
- POST `/api/jobs/:id/retry` `{requestId:string}` -> Job (new version; original prompt and `textMode/generatedText` preserved, no destructive overwrite; explicit action for unknown jobs). New project edits require POST `/api/jobs` with a new requestId instead.
- POST `/api/jobs/import` `{projectId,assetId,kind,reactionId?,name,provenance,textMode?,generatedText?}` -> Job succeeded imported provenance (max20000 characters, so full generation prompts can be retained), not a provider run (used to bring back Niji or external assets). model/provider describe imported. `textMode` defaults to `overlay` for stickers and `none` for other kinds. Declare `generated` for an image already containing lettering; `generatedText` is optional and permitted only with that mode, with the same 48-code-point limit. The asset is not automatically stripped or OCR-checked.
- GET `/api/projects/:id/recipe` -> portable JSON `{version:1,project}` sans asset paths/secrets; reference filenames may be a separate manifest. POST `/api/projects/import` `{version:1,project}` -> new Project with no untrusted local asset IDs.
- GET `/api/projects/:id/export?captions=1&size=512` -> ZIP successful sticker results (latest successful per reaction), `originals/` + `resized/` always, `captioned/` if requested + `recipe.json` + `contact-sheet.png`; fail explicitly if no sticker images. `resized/` means resized source, not guaranteed text-free. Optional captioned output respects each current caption mode and actual native-text job flag; native text is never duplicated or erased. ZIP result records include `textMode/generatedText`. Asset-level download via URL remains original file.
- GET `/api/jobs/:id/render?size=512&caption=1` -> PNG using current project caption override or `defaultCaptionFor(reaction)`. Add post-caption only when the desired mode is `overlay` and actual `job.textMode` is not `generated`; `caption=0` skips post-caption only. Preserve real alpha (don't silently fake transparency). Use Sharp with escaped Pango/SVG; the three named fonts are loaded from bundled `public/fonts` files, not a required system installation.
- GET `/api/health` -> `{ok:true}`.

Auth: loopback default. `STUDIO_TOKEN` optional; when enabled protect APIs and private assets via HTTP-only same-site cookie obtained by POST `/api/login` `{token}` (also accept Bearer). No secret in URL. Refuse non-loopback HOST without token. Origin/Host validation to stop unrelated websites from invoking local paid generation. Tests inject local fixture provider through createApp options (do not expose fixture provider in production UI).

Backend entry exports `createApp({dataDir?, ...test options})` or equivalent for tests and `index.ts` launches server. Persist SQLite JSON records using Node built-in sqlite. Mark running jobs unknown after restart; keep queued jobs recoverable. API key stays private server config, never in bootstrap or export.
