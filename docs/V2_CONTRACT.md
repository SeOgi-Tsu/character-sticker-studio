# V2 interface changes

See src/shared/types.ts for exact types.

Content exports `compositions: Composition[]` from catalog.ts and includes it in catalog.compositions. reaction.compositionId optional for old/custom recipes; get resolved value in prompts/UI by `reaction.compositionId || 'halfbody'`. Inspector user overrides stored in `project.overrides[id].compositionId` (no new endpoint).

ProviderSettings.provider adds runninghub. Settings payload includes runninghub:{kind:'app'|'workflow',resourceId:string,promptNode:{nodeId,fieldName},referenceNode?:{nodeId,fieldName},extraNodes:[{nodeId,fieldName,fieldValue}],outputIndex:number}. Base URL site default https://www.runninghub.ai or .cn (native RH endpoints appended); model may be empty for RH and is recorded as app/resource ID by server. size is not applied to workflow; user may configure actual size node values in extraNodes. apiKey retains existing secret-preserving rules. Validate numeric decimal resource IDs without converting to floating point, unique node+field pairs, bounded values, outputIndex 0..15. Never include key in public settings/export.

Job adds optional remoteTaskId. POST /api/jobs/:id/resume (empty body) returns Job, only for RH with known remote task ID and unknown/failed state; it continues querying/downloading the same task, no submit/no charge initiating call. Queued and running remain ordinary status; source Job keeps remoteTaskId across errors. After restart, RH jobs with known ID can automatically recover query, jobs with unknown submit remain unknown. Record remote ID before poll. Existing synchronous providers unaffected.

RunningHub official transport references must be verified by implementer. Existing local Plugin/VCPRunningHub/lib/client.js provides evidence, not copyable implementation. Key never printed/read from old VCP config. CLI fixture injection allowed for tests, not a user-facing mock mode.

Frontend must clearly show RunningHub app/workflow and node mappings; it cannot assert arbitrary existing Anima preset accepts references. Resume-query control for known RH task distinct from regenerate. Real results still imported/rendered/exported via existing endpoints.
