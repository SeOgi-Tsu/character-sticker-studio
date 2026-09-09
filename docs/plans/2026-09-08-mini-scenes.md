# Character Mini-scenes Implementation Plan

**Goal:** Add a small, optional layer of character-specific visual comedy to the existing cute reaction workflow.

**Architecture:** Extend the existing reaction/character records with optional mini-scene direction and signature motifs. Continue using the same prompt, job, caption and export pipeline. One sticker remains one frozen scene.

**Tech Stack:** Existing React/TypeScript, Express, Node SQLite, Sharp and image-generation adapters.

User has authorized this final optimization and then supplied corrected image references. Apply that direction without another approval loop. Implementation remains in the existing independent studio repository; do not edit the parent VCP application. Shared field bounds and ownership are in `docs/V6_MINI_SCENE_CONTRACT.md`.

1. Add failing prompt/API tests for optional scene behavior, disabled-scene preservation, framing/hand/text boundaries and portable roundtrip; preserve existing coverage.
2. Implement optional shared fields and strict API validation. Test malformed objects, nonstrings/booleans and overlong fields without altering persisted state.
3. Add six original visual situations and a mixed twelve-sticker selection; retain all previous recipes. Write short chat uses and one visible reveal per concept.
4. Add compact per-image scene editing and character motifs near the existing persona. Changing recommendations must preserve saved individual choices.
5. Generate four samples with the actual builder and the authoritative original Margaret sheet plus correct chibi anchor. Preserve costume and existing variants; import provenance and actual embedded-text modes.
6. Build and run all tests. Check controls, preview and no-text/native distinctions in a new browser tab, including mobile. Export and inspect the updated sheet.
7. Document actual results, bump version, package portable source with fonts, verify it in a new directory, and commit the finished change locally.
