# Text rendering and immutable native lettering

`src/shared/typography.ts` is the shared source for six caption styles and reaction-based defaults. `resolveCaptionMode` preserves legacy `enabled` behavior: disabled wins; an older enabled caption defaults to overlay. Explicit legacy captions without a style keep their classic appearance.

`server/images.ts` uses Sharp's Pango text input with an absolute `fontfile` for ZCOOL KuaiLe, Long Cang and Zhi Mang Xing. Fonts ship in `public/fonts`; the runtime does not require installation. Pango produces real glyph pixels, then a circular alpha maximum filter adds antialiased outlines. Bubble adds a restrained vector panel and comic adds a colored offset shadow. Only geometry and the existing classic path use SVG. Text is XML-escaped, capped at 48 Unicode characters, wrapped, fitted and positioned before bounded rotation. Classic single-line captions retain the old outlined sans-serif layout.

There are three distinct paths:

- `none`: a clean generation prompt, with no post-caption. Stored wording remains available for later toggling.
- `overlay`: a clean generation prompt and editable local lettering. Four positions, six styles, color, size, line breaks and rotation remain reversible because the source is untouched.
- `generated`: the chosen exact wording and lettering direction enter the image prompt. A job snapshots `textMode` and `generatedText` before queue submission. These letters are part of the returned image and require regeneration to change or remove.

Every image render and ZIP path passes the job's actual native-text flag. A job created or imported with `textMode: generated` never receives another local caption, even after its project settings are changed. `caption=0` only disables postprocessing; it does not erase embedded text. Older jobs without metadata remain clean-source compatible. Importers must label existing native lettering explicitly; the server does not infer text from pixels.

The project API validates modes, style IDs, positions, booleans, colors, 12–120 font sizes and −20° to 20° rotation. `character.memePersona` accepts at most 1,200 characters. Native generation rejects an empty caption before queue submission. Retries keep their original text snapshot and prompt. Imported assets, project recipes and ZIP result records preserve the appropriate text metadata, without including private provider settings.

Verification uses temporary databases and fixture image providers, never stored user keys or paid image calls. `tests/text*.test.ts` covers compatibility, actual distinct Chinese glyphs in the three shipped fonts, six visually different styles, XML-safe wrapping/placement, native lettering protection, recipe roundtrips, frozen retries and credential-free ZIP exports.
