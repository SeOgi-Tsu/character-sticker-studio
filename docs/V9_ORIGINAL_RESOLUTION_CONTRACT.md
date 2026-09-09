# V9 Original-resolution export

User explicitly requests preserving generation resolution, with no default 512-pixel reduction. No image regeneration is needed.

- Shared `ExportSize = 'original' | 128 | 256 | 512 | 1024`; 128 remains for API compatibility.
- Download and ZIP routes accept `size=original`; omitted size defaults to original. Existing explicit 256/512/1024 remain supported, invalid sizes rejected.
- `Images.render(asset, size = 'original', caption?, options?)` preserves exact original width and height, including rectangular assets. No square padding, resizing or enlargement in original mode. With no applicable overlay (none/generated/embedded/empty), return the stored PNG bytes unchanged. Captioned original mode draws text on the original canvas with native-resolution glyphs; use the shorter image dimension as the 512-based typography scale, and actual width/height for positioning and wrapping. Existing explicit square output remains compatible.
- ZIP original mode: `originals/` plus `captioned/` when requested, `recipe.json`, `contact-sheet.png`. Do not manufacture a duplicate `resized/` directory for original mode. Explicit numeric sizes keep the old originals/resized/captioned directories. Contact sheet remains a small visual index only, never the delivered image quality.
- ZIP recipe records `export:{size, originalResolution:boolean}` and each result's actual source width/height. Existing recipe import tolerates metadata. Native baked lettering must never receive a second overlay.
- Frontend defaults export dropdown to 原始分辨率（默认）, with optional 256/512/1024. Single PNG download, large-image modal and inspector request original. Small 96/160 chat preview only changes screen display dimensions and preserves source aspect ratio. Preserve the internal 512-based caption scale so historical font sizes retain their relative size; do not rewrite user caption values.
- Tests: original no-overlay bytes identical, arbitrary rectangular dimensions/aspect preserved, overlay preserves dimensions and leaves non-text pixels unchanged, original/native ZIP correct and numeric legacy compatibility. Run a real 76-image original export, validate each PNG dimension matches its source and inspect typography. No private data in GitHub/source archive.

Root owns frontend integration/types/docs and real export/package verification. Backend worker owns server/images.ts, server/app.ts and relevant tests. No provider or new generation workflow changes.
