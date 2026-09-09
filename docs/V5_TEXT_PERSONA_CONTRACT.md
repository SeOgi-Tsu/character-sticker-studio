# V5 text direction and character meme persona

User approved optimizing fonts, per-image text choice, text generated as part of the image, and a concise meme-personality brief. Margaret's requested archetype is a cheeky, boastful, teasing adult character who becomes flustered when challenged. Maintain V4 original open-cardigan wardrobe and all earlier controls. No assumption that reference meme font names or generation method can be proven from raster examples.

## Shared fields

Types in src/shared/types.ts are authoritative. Caption keeps old text/enabled/color/stroke/fontSize fields; adds optional mode:none|overlay|generated, styleId:classic|round|handwritten|brush|bubble|comic, rotation(-20..20); position extends top/bottom/left/right. New helpers in src/shared/typography.ts (backend worker owns file):

- resolveCaptionMode(c?: Partial<Caption>): TextMode — disabled `enabled:false` or explicit mode:none => none; otherwise mode or overlay. Missing fields preserve old on/off behavior.
- defaultCaptionFor(reaction:Reaction): Caption — mode from reaction.textMode or overlay, style from reaction.captionStyleId or round, sensible preset colors, position and rotation. enabled false only for none. Existing explicit legacy captions without style render classic.
- captionStyles: CaptionStyle[] — shared metadata and English generated-lettering directions. Fonts: classic system fallback; round/bubble/comic ZCOOL KuaiLe; handwritten Long Cang; brush Zhi Mang Xing. root downloads TTFs + OFL into public/fonts with filenames ZCOOLKuaiLe-Regular.ttf, LongCang-Regular.ttf, ZhiMangXing-Regular.ttf.

Character.memePersona?:string max1200. UI presets copy a brief into this editable field; no opaque hidden personality model. Catalog.personas contains id/name/description/brief. Catalog.captionStyles uses shared metadata. Reaction optional textMode/captionStyleId are recommendations, not overrides of explicit project.captions settings.

Job.textMode and generatedText snapshot actual generation intent. Imported jobs may specify these fields; old jobs default text-free source treated as overlay-compatible. A generated-text asset has its lettering baked in: never claim mode:none erases it, never automatically overlay a second caption. UI must distinguish desired next-generation settings from the existing job snapshot.

## Three text paths

1. none: prompt asks no text; render original/resized without overlays; keep stored caption text for later toggling.
2. overlay: prompt asks no text; editable local typography after generation. Original remains clean. Render supports actual bundled font choices, line breaks/short wrapping, side/top/bottom placement, rotation and restrained visual styles (bubble/soft round/handwritten/brush/comic). Do not simply rename identical fonts.
3. generated: prompt specifies one exact quoted caption string, chosen lettering style/placement, composed with character gesture/negative space; removes conflicting global no-text/no-bubble rules. Raw output contains the text. No extra post-caption is applied; no claim of removable text. Changing/removing it requires a new generated image.

buildStickerPrompt signature becomes (character,reaction,style,caption?:Caption). Missing caption defaults to text-free overlay generation for compatibility. Backend resolves project caption override or defaultCaptionFor before building, freezes job.textMode and generatedText, and preserves both in retry/history/recipe results. Native text requested but model misspells: user review/regeneration, not false success of OCR.

Image rendering options may add embeddedText:boolean or bypass overlay at app callsites; all render/download/ZIP paths must respect actual job.textMode=generated even if current caption mode changes. caption=0 only disables postprocessing, not baked-in letters. Existing generated-text preview must show current real image and a regeneration hint if mode/text differs. Resized images stay available in all modes; no destructive text erasure promised.

## Persona and catalog

Content worker owns catalog/prompts/tests/prompts.test.ts. Add4 new stable reactions (report IDs to root), plus a persona-led bratty12 with 4new+8old, and all64 retaining original60 & all prior packs. Mixed text recommendations: none/overlay/generated all represented. Persona reflects motives, speech rhythm and comedic reversal, not changing age/body/outfit. Do not put a sexualized or child-coded trope tag into image prompts; describe the adult teasing/boastful behavior concretely.

## Ownership

- Root: types/contract, vendored font files+license/docs/package copy, real text/native/no-text pilot samples and runtime migration, browser QA/release.
- Backend worker: server/**; src/shared/typography.ts; tests/text*.test.ts plus necessary existing test changes. validates new fields, freezes native-text metadata, actual font rendering and render/export semantics. Avoid touching wardrobe logic/providers unless needed; no paid API calls.
- Content worker: catalog/prompts/prompt tests, persona presets and four reaction recipes; imports typography exports from backend-owned helper.
- UI worker: src/App.tsx, components/**, src/styles.css; text modes+font/preset/position controls, accurate baked-text hints, persona card/presets, preserve compact layout. No extra approval.

## Verification

Test mode compatibility and exact generated text, no contradictory no-text instructions, native text not double-stamped or falsely removed, recipe roundtrip validation, persona preservation/wardrobe fidelity, truly distinct bundled fonts, Unicode/XML escaping/line breaks and export dimensions. Root visually checks sample overlays and native lettering. Fonts carry OFL and provenance; source/Docker include them and do not rely on system installation. User's private images and keys remain outside source package.
