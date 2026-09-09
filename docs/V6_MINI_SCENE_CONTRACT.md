# V6 / Final mini-scene refinement

User direction: the two user-supplied whale meme screenshots replace the earlier MFuns page as the primary creative reference. Study posture, a concrete object, implied viewer interaction and the contrast between bravado and visible reality. Preserve Margaret's original identity/outfit and the useful V5 plain-cute reactions. These are editorial choices, not verified popularity rankings.

## Shared fields

- `Character.signatureMotifs?: string`: editable recurring props/visual motifs, max 400 UTF-16 code units. Only sticker prompt acting/props use it; never override outfit, reference, age, body or identity. Omitted/empty means no extra direction.
- `Reaction.miniScene?: { enabled: boolean; setup: string; reveal: string; prop: string }`: optional single-image situation. setup/reveal max 240 each, prop max 160. `enabled:false` keeps editable content but contributes no mini-scene prompt. Omitted is legacy behavior. Fields may be empty; blank content must not invent arbitrary scene details. At least one nonempty field is needed to inject direction.
- Server validates the entire supplied miniScene object (explicit boolean enabled, string fields). Invalid values must not modify saved projects. Catalog, custom reactions and overrides survive project/recipe roundtrip. Generation freezes the resulting prompt; retries preserve original prompt. No provider changes, new paid calls or panel compositor.
- A scene is one frozen readable moment, one main prop or a small group of the same object; setup/reveal are context, not literal words or separate panels. Existing framing and selected hand interaction rules still govern. No mandatory room background or typography. Existing none/overlay/generated caption contracts stay intact.

## Ownership and scope

Root owns shared types, design, sample preparation/import/export, final packaging and verification.
Content worker owns catalog/prompts + prompt tests: six new recipes, `mini-theater12` mix of six new + six existing, `all70`, retain old IDs/packs; optional mini-scene prompt and motif direction.
Backend worker owns server validation and new mini-scene API tests only.
UI worker owns App/CharacterView/StickerInspector/styles and a compact optional mini-scene editor: checkbox, three labeled fields under a disclosure; readable summary on recipe cards; character motif field near persona. Existing user settings must not be overwritten by choosing a pack.

## Completion evidence

Four actual new pilot images representing different silhouettes/props/text modes; all imported with provenance, original image untouched. Build/full tests, desktop/mobile controls and independent portable-source install. Final source bundle includes fonts/licenses, no private data/images/configuration. Existing work remains available.
