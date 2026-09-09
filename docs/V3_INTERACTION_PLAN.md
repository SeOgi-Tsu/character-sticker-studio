# V3: expressive, viewer-directed cute reactions

User direction: strengthen visual tension, extreme cute interaction and funny reactions; learn from contemporary DeepSeek/whale static memes. Previous Taffy examples were old, and Phoebe GIF material does not itself establish effective static composition. Preserve successful earlier styles/packs and the existing generation pipeline.

## Diagnosis

V2 improves camera-distance variety but its global prompt requires safe margins, all details inside the canvas, small props and no extra hands. These constraints favor neatly displayed characters over embodied interaction. More framing types alone cannot describe who acts on whom, where contact occurs, or why the pose is funny.

## Design and ownership

1. Root owns shared types/backend validation/tests/docs and actual Margaret interaction samples. A researcher visually inspects current static whale examples; content worker owns catalog/prompts/tests, frontend worker owns UI.
2. Reaction adds optional `interactionId: observe|approach|offer|touch|squish|comic`, `intensity: 1|2|3`, `intent: string`. Catalog adds `interactions: Interaction[]` where each has id/name/description/prompt. Content exports `interactions`, `getInteraction(reaction)`. Old cards and old recipes default to observe / intensity2 / empty intent; no silently added hands or changed old IDs.
3. Interaction defines viewer relation: observer, approaching viewer, offering something, receiving a gentle headpat, cheek/contact squish, or comic contrast. Only touch/squish may introduce one anonymous viewer hand when needed; never extra limbs belonging to Margaret, second full people or gratuitous distress.
4. Intensity affects acting, foreground/background scale contrast, intentional foreshortening and soft squash/stretch. It does not automatically force close-up framing. Composition remains a separate user choice, and full-body still keeps the selected complete action legible. A quiet observe card must remain valid even in the same pack as a dramatic card.
5. Intent is the intended response in the receiver, e.g. wanting to catch/hug/pat, being playfully challenged, or laughing at a disproportionate reaction. It is visible/editable and included in the prompt, not an invented popularity score.
6. New default `interaction12` mixes eight new expressive recipes with four prior favorites; keep all48 old reactions and packs. Interleave high-energy and restful beats; do not make every expression watery eyes + giant hands.
7. Inspector provides interaction selector, intensity controls and short intent input; card badges/selection summary remain compact. The UI must say these change the next generation, not claim existing imported samples were re-rendered.
8. Fix global prompt conflicts: character identity and rendering finish stay consistent; intentional foreground crop, slight camera tilt and one dominant graphic joke are allowed when selected. Do not indiscriminately crop faces, bury eyes behind props or add busy effects. Caption text stays a separate export layer.

## Validation

- New fields survive save/recipe import/export, invalid IDs/intensity values and overlong intent rejected before provider submission.
- Old48 reactions and old recipes remain supported. Observe mode never forces a viewer hand. Fullbody+intensity3 does not also demand a headshot; hands/props have clear ownership/contact.
- Research records source date and whether actual static image was inspected; no old Taffy material represented as current top trends, no leaderboard claims, no redistribution of whale character assets.
- Real interaction sample generation using original Margaret identity and prior line/color reference; preserve old8 results; clearly label built-in imagegen as external imported samples rather than paid provider validation.
- Tests/build/browser/portable source package verification; no changes to API credentials, RunningHub adapters or user-unsaved tabs.
