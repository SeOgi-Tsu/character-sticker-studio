# Shared contract (frontend/backend/content)

Shared TS types: `src/shared/types.ts`. Content exports `catalog` from `src/shared/catalog.ts` and `buildStickerPrompt(character, reaction, style)`, `buildAnchorPrompt(character, style)`, `buildCharacterPrompt(character)`, `buildNijiPrompt(character, options?)` from `src/shared/prompts.ts`. Niji options: `{layout?: 'single'|'turnaround'|'detail', stylize?: number, raw?: boolean, styleReference?: string}`. All return string.

All API results JSON unless PNG/ZIP; errors `{error:string}` with non-2xx status.

- GET `/api/bootstrap` -> Bootstrap (initial Margaret project, no bundled private image until imported locally).
- POST `/api/projects` body optional `{name,character}` -> Project.
- PUT `/api/projects/:id` body Project editable fields -> Project (validate; ignore supplied id/timestamps).
- POST `/api/assets` JSON `{filename,dataUrl,provenance?}` -> Asset, validate/decode image up to 15 MB. Stored filenames random, URL `/assets-local/:id.png`.
- GET `/api/settings` -> safe ProviderSettings. PUT `/api/settings` with ProviderSettings -> safe settings; blank/omitted apiKey preserves existing secret (explicit `clearApiKey:true` clears it). provider/base URL changes should clear prior key unless a new key is supplied.
- POST `/api/jobs` `{projectId,kind:'sticker'|'anchor'|'character',reactionIds?:string[],requestId:string}` -> `{jobs:Job[]}`. Freeze project/prompt/reference/provider config, reject missing config and (for stickers) missing reference before queue creation. Use anchorAssetId first then referenceAssetId. Repeated requestId must not cause duplicate paid calls. kind character may have no reference; anchor must have reference. Each single sticker -> single upstream call. No automatic fallback from edit to text-only. Default concurrency 2.
- GET `/api/jobs?projectId=...` -> Job[]. GET `/api/jobs/:id` -> Job.
- POST `/api/jobs/:id/cancel` -> Job (queued cancelled; running best-effort abort with ambiguity explained).
- POST `/api/jobs/:id/retry` `{requestId:string}` -> Job (new version; no destructive overwrite; explicit action for unknown jobs).
- POST `/api/jobs/import` `{projectId,assetId,kind,reactionId?,name,provenance}` -> Job succeeded imported provenance, not a provider run (used to bring back Niji or external assets). model/provider describe imported.
- GET `/api/projects/:id/recipe` -> portable JSON `{version:1,project}` sans asset paths/secrets; reference filenames may be a separate manifest. POST `/api/projects/import` `{version:1,project}` -> new Project with no untrusted local asset IDs.
- GET `/api/projects/:id/export?captions=1&size=512` -> ZIP successful sticker results (latest successful per reaction), originals/ + resized/ always, captioned/ if requested + recipe.json + contact-sheet.png, fail explicitly if no sticker images. Asset-level download via URL remains original file.
- GET `/api/jobs/:id/render?size=512&caption=1` -> captioned PNG using current project's caption override or reaction caption; defaults caption enabled. Preserve real alpha (don't silently fake transparency). Use Sharp with escaped Pango/SVG, bundled font if available.
- GET `/api/health` -> `{ok:true}`.

Auth: loopback default. `STUDIO_TOKEN` optional; when enabled protect APIs and private assets via HTTP-only same-site cookie obtained by POST `/api/login` `{token}` (also accept Bearer). No secret in URL. Refuse non-loopback HOST without token. Origin/Host validation to stop unrelated websites from invoking local paid generation. Tests inject local fixture provider through createApp options (do not expose fixture provider in production UI).

Backend entry exports `createApp({dataDir?, ...test options})` or equivalent for tests and `index.ts` launches server. Persist SQLite JSON records using Node built-in sqlite. Mark running jobs unknown after restart; keep queued jobs recoverable. API key stays private server config, never in bootstrap or export.
