# Character Sticker Studio Implementation Plan

**Goal:** Deliver the approved standalone character-to-static-sticker WebUI with configurable image APIs, a Niji 7 prompt workshop, selectable cute reactions, persistent generation jobs, editable captions and portable export.

**Architecture:** Independent React/TypeScript frontend and Node 22 API, SQLite persistence, local assets. Original implementation in its own repository; no runtime dependency on VCP. Provider secrets stay on the server. Niji exports prompts for official generation and imports the result; no unsupported official API claim.

**Tech stack:** React, Vite, TypeScript, Express, Node SQLite, Sharp, archiver, node:test/tsx.

## Approved scope

- User approved implementation and static PNG first. Cloud image API first; ComfyUI extension contract.
- Previous 24 reactions are a curated use-case list, not usage rankings. Add source-grounded cute/absurd reaction collections with visible editorial labels and source dates.
- Build and test locally; prepare GitHub/Docker documentation. Publishing is a later user action.

## Tasks

1. Root: scaffold separate repository, shared type/API contract, dependencies and scripts. Verify Node runtime and independent install.
2. Content worker: current primary/community research, original 36+ reaction catalog, style/packs, deterministic character/Niji/sticker prompt builders. Write tests for preserving identity, no unsupported Niji parameters and text separation before implementation.
3. Backend worker: persistent projects/assets/config/jobs, OpenAI-compatible Images and Gemini generateContent adapters, queue with unknown-submit recovery, cancellation, PNG caption processing and ZIP exports. Test reference passing, secret redaction, path validation, duplicate submit and restart recovery with local fixture provider (no paid calls).
4. Frontend worker: polished cream/cherry creative workspace, character editing, Niji workshop, selectable reaction cards, custom captions/actions, actual generation controls, settings and result history/export. Verify build and real browser interactions; no fake generated results.
5. Root: generate a real Margaret pilot with built-in image tool, save as a local imported sample with accurate provenance, seed original provided reference into private data (excluded from Git).
6. Root: integrate and browser QA, verify upload/create/save/batch/errors/retry/import/export against actual server using a local fixture for paid provider contract. Review implementation for scope and correctness, fix failures.
7. Root: README, env example, Docker, source/provenance notes; package source-only ZIP and verify excludes keys/data/node_modules. Report actual verification and API credential limitation.

## Validation commands

- `npm test`: meaningful contract and persistence tests; fixture imagery explicitly test-only.
- `npm run build`: TypeScript check + production Vite output.
- `npm start`: production API/UI on loopback port 4317.
- Browser: load, inspect desktop/mobile, choose pack, edit custom card, save character, upload image, configure provider, error handling, download recipe; verify no browser-console errors.
- External paid API generation requires user provider config; built-in pilot is separate and must not be presented as a successful app provider test.
