# V7 First-use and candidate workflow

User authorized a final onboarding/history refinement and explicitly authorized creating a private GitHub repository. Finish and verify implementation before private publication. Existing local runtime data/images/keys must not enter Git history or the source package.

## Scope and behavior

- First successful app load shows a short, dismissible guide once per browser/origin using localStorage key `character-sticker-studio:guide:v1`. Storage denial must not break the app. Add a persistent `使用指南` entry to reopen it. No paid generation is triggered by the guide.
- Guide chooses `existing` (upload reference) or `scratch` (describe/generate). A second compact step collects required name (80) and optional description (2000). Starting creates a separate clean project through the existing API after saving current edits. Existing projects and references never become the new character. Back/skip/continue-current is possible. Mark seen only on dismissal or successful start, not failed creation.
- `StartGuide` standalone UI props: `{currentProjectName?:string,busy:boolean,onStart:(input:StartGuideInput)=>Promise<boolean>,onClose:()=>void}`. Parent handles error notification/persistence/navigation. Component remains open on failed start, preserves inputs, disables double submit while pending, and uses existing Modal for keyboard/focus behavior. Component imports its own CSS.
- `StartGuideInput`/`StartMode` live in `src/lib/onboarding.ts`: `{mode:'existing'|'scratch',name:string,description:string}`. Helpers: `hasSeenGuide(storage?:GuideStorage):boolean`, `markGuideSeen(storage?:GuideStorage):void`, `newCharacterFromGuide(input):Character`; storage mocks injectable, browser default obtained safely. Existing mode may still carry optional user description. New character has empty identity/outfit/personality/memePersona/signatureMotifs, reference outfit mode, no asset IDs.
- Parent uses `entryMode?:StartMode` on CharacterView for contextual first instructions. Route existing to upload/read reference, scratch to description and cloud/Niji choices. Existing project continuation only closes guide.

## Character/mother-image candidates

- CharacterView gains optional props `entryMode`, `onNext`, `onHistory`, `onPreview`. Callback types: next/history void; preview `(job:Job)=>void`. Existing onChange/onGenerate/onNiji remain unchanged.
- Candidate list uses current project/kind, newest first, explicit statuses, selected badge and preview action. Buttons say `再生成一张角色图`/`再生成一张母版` when prior images exist. Explain each new generation retains previous candidates; active same-kind jobs show a status and disable repeated submit. Missing reference still guards anchor creation. Niji remains manual external generation + import, never pretends to call official API.
- Once a reference is selected, show `下一步：制作 Q 版母版`; for selected anchor show `下一步：制作表情`. Parent saves before navigation. `生成记录` stays directly reachable. Selecting candidates changes selected asset only, no destructive overwrite.
- `applyProjectChange(current:Project,change:Partial<Project>):Project` in `src/lib/character-workflow.ts`: change style or referenceAssetId => clear anchorAssetId; unrelated changes preserve anchor; unchanged reference preserves anchor. New uploads and candidate selection use this same parent helper. No server contract/provider changes required.

## Ownership

Root: App.tsx integration, plan/docs/version, runtime/browser/source QA, private GitHub creation and push after audit.
Welcome worker: StartGuide.tsx and StartGuide.css only.
History worker: CharacterView.tsx and CharacterWorkflow.css only (may consume optional props above).
Logic worker: onboarding.ts, character-workflow.ts and targeted tests only. Tests cover blocked storage, clean separate character input, reference/style invalidation vs ordinary edits.

## Verification

Build/full tests, actual first-open/skip/reopen/reload/browser persistence, both entry paths on an isolated fixture UI rather than polluting Margaret, selected reference/anchor candidates and history navigation, desktop/mobile accessibility. No real paid API call without configured user credentials. Package excluding personal data, then create private repo using existing authenticated GitHub account, push source history only after tracked-history audit, verify remote privacy/HEAD/CI.
