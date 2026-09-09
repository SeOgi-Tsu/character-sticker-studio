import type { Project } from '../shared/types';

/** A style or identity-reference change makes the previously selected anchor stale. */
export function applyProjectChange(current:Project,change:Partial<Project>):Project {
 const character=change.character??current.character;
 const changedStyle=change.styleId!==undefined&&change.styleId!==current.styleId;
 const changedReference=character.referenceAssetId!==current.character.referenceAssetId;
 return {...current,...change,...(changedStyle||changedReference?{character:{...character,anchorAssetId:undefined}}:{})};
}
