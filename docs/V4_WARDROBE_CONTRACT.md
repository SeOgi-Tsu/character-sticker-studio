# V4: original outfit fidelity + full/half-body interactions

User correction: original Margaret has an open off-shoulder cardigan with the low neckline and layered inner top visible in the supplied adult character sheet. Previous agent-created crew-neck sweater was an unauthorized outfit redesign. Correct current Margaret outfit text, stop using the incorrect outfit anchor as sole authority, and correct existing sample variants; add full/half-body interactions without changing the character design.

## Shared contract

- `Character.outfitMode?: 'reference'|'custom'`. Missing means reference. Reference mode: original sheet defines clothing construction; user text clarifies visible details. Custom mode: user explicitly chooses text-led wardrobe alteration. Without any reference image, use the user's description in either mode; do not require an absent sheet.
- Preserve neckline outline/depth, open/closed cardigan, layers, shoulder/sleeve design, hem, legwear, shoes and accessories. Q stylization may simplify rendering and proportions; it must not invent a collar, close an open garment, add fabric, remove details or change coverage. User requested ordinary outfit matching, not intensified sexual framing.
- Original source PNG stays untouched. Old erroneous samples/metadata are retained as historical versions, not silently rewritten. Current Margaret project is backed up before replacing its outfit description and anchor.

## Reference transport

Keep existing provider `GenerationInput.reference?:Buffer`, add `secondaryReference?:Buffer` for compatible transport. Store `secondaryReferenceId?` alongside existing StoredJob.referenceId; old tasks remain compatible.

For new sticker tasks:

- reference outfit mode + original reference: primary=original; secondary=anchor if different.
- reference mode with only anchor: primary=anchor, no secondary.
- custom mode: primary=anchor if available else original; no secondary (explicit outfit text overrides input clothes).
- character/anchor generation: original reference preferred, no secondary.

Image order is described in prompts: if two images, first is original identity/clothing source; second is face/line/color style anchor, not wardrobe authority. Pose/crop remains freely directed by each reaction.

OpenAI-compatible multipart: one image retains `image`; two use repeated `image[]` fields in primary/secondary order. Gemini uses two inline image parts in the same order. No provider call retries or silent single-image fallback after a rejected multi-image request.

RunningHub adds optional `runninghub.styleReferenceNode`. If primary + secondary provided and this node exists, upload both separately and map them to separate validated node/field pairs. Without a second node, send the original primary image only, retain text style direction; UI explicitly describes this limitation. Existing single-reference workflows remain usable. Known remote task resume must not re-upload or re-submit images.

## UI

- Character form: “服装依据：沿用原图服装（默认） / 按文字换装”. Explain original versus Q anchor duties, reference neckline/opening preserved.
- RunningHub advanced reference mapping: optional style/face second node, no guessed IDs. When absent explain only original garment reference is sent.
- Existing settings, API keys, palette, presets and user edits remain supported.

## Catalog

Four new stable reaction IDs: viewer-offer, tiptoe-wave, tiny-confident, thoughtful-sulk. `body-interaction12` mixes six full-body and six half-body reactions; keep prior56/old packs, add all60. No new claims of popularity rankings.

## Verification

Tests cover wardrobe mode validation/recipe roundtrip, all prompt builders' authority rules, explicit custom override without contradictory clothing-lock instructions, distinct primary/secondary transport bytes and order, snapshot isolation, old single-image compatibility, RH optional second mapping, no repeated paid submission. Real new/corrected samples checked visually against supplied source, retained with generation provenance. User cloud/RH credentials still not assumed.
