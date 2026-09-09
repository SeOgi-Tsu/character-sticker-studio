# V2: diverse compositions and third-party generation

User approved continuing optimization with explicit constraints: avoid repeated portrait crops; reference the varied full-body/half-body/action formats used in Phoebe/Taffy communities; clarify third-party API support and possible RunningHub use.

## Diagnosis

The first pilot generated one close-up anchor then requested variants that changed only expression/action while preserving framing. The prompt's old identity rule also locked head-to-body ratio. This conflates identity with pose/crop. The reaction catalog mentioned body actions but had no explicit per-card composition control or distribution check.

## Implementation

1. Preserve identity and the selected drawing style, but independently specify camera/framing, scale, whole-body silhouette, props and contact points per reaction.
2. Seven selectable composition IDs in shared types: closeup, halfbody, fullbody, action, prop, scene, peek. Each card has a default; user override persisted in project.overrides. Unknown IDs rejected by API. Old recipes without the field remain compatible.
3. Add a balanced default mixed12 pack, >=6 compositions, <=3 closeups; expose distribution summaries so users can see repetition before paying for a batch. Existing pack IDs and custom cards remain usable.
4. Inspector offers composition selector with Chinese explanation; cards show composition badges; style remains independently selectable. Reusing a portrait anchor explicitly must not lock its crop or pose.
5. Third-party settings clearly name wire protocols. Keep OpenAI-compatible Images/Edits and Gemini generateContent; add RunningHub AI application/workflow adapter configured with site, app/workflow ID, prompt node, reference-image node, extra node values and output index. Never guess workflow node IDs or treat a chat-completions image proxy as Images API.
6. RunningHub submits once, records remoteTaskId before polling, restarts polling for known IDs, preserves unknown status when submit is ambiguous. Resuming known remote tasks never resubmits. Poll errors and result download errors retain ID for query recovery. Provide POST /api/jobs/:id/resume to resume known task query, and reject ordinary retry of a known nonterminal RH task to avoid accidental double charge.
7. Upload reference PNG through RH binary upload and feed returned fileName to the selected node. Reject a sticker/anchor run with missing reference node before submitting a paid generation. Workflow must itself support reference-based character generation; mapping is not a guarantee of image consistency.
8. Keep personal data and previous four samples; add a varied sample set via external import with accurate generation provenance. New source release omits personal images and credentials.

## Ownership / verification

- Root: shared contract/types, integration, varied generated pilot, real UI checks, release docs/archive.
- Content worker: catalog/compositions/prompts + meaningful regression tests and actual source research.
- Backend worker: all server files + backend/provider/RunningHub tests, official API verification, persistent RH lifecycle.
- Frontend worker: composition UI and protocol-specific connection form + browser-build readiness.

Verify tests and build; inspect actual mixed fullbody/action/prop/peek pilot at thumbnail size; use local HTTP fixtures for paid protocol verification, no user cloud credentials assumed. User's existing generations and private config stay intact. Live cloud/RH end-to-end requires their configured credentials and real resource ID/mappings.
