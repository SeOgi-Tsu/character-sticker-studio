import type { Character } from '../shared/types';

export type StartMode = 'existing' | 'scratch';
export interface StartGuideInput { mode: StartMode; name: string; description: string; }
export interface GuideStorage {
 getItem(key:string):string|null;
 setItem(key:string,value:string):void;
}

export const GUIDE_STORAGE_KEY='character-sticker-studio:guide:v1';
const ACTIVE_PROJECT_KEY='character-sticker-studio:active-project:v1';

function availableStorage(storage?:GuideStorage):GuideStorage|undefined {
 if(storage)return storage;
 // Even reading the browser storage property can raise SecurityError.
 try{return typeof window==='undefined'?undefined:window.localStorage;}catch{return undefined;}
}

export function hasSeenGuide(storage?:GuideStorage):boolean {
 try{return availableStorage(storage)?.getItem(GUIDE_STORAGE_KEY)==='1';}catch{return false;}
}

export function markGuideSeen(storage?:GuideStorage):void {
 try{availableStorage(storage)?.setItem(GUIDE_STORAGE_KEY,'1');}catch{/* Storage is optional; dismissal must still work. */}
}

export function readActiveProjectId(storage?:GuideStorage):string|undefined {
 try{const id=availableStorage(storage)?.getItem(ACTIVE_PROJECT_KEY);return typeof id==='string'&&id.trim()?id.trim():undefined;}catch{return undefined;}
}

export function rememberActiveProjectId(id:string,storage?:GuideStorage):void {
 if(typeof id!=='string'||!id.trim())return;
 try{availableStorage(storage)?.setItem(ACTIVE_PROJECT_KEY,id.trim());}catch{/* Selecting a project does not depend on storage access. */}
}

/** Whitelist new inputs rather than cloning any current character or asset selection. */
export function newCharacterFromGuide(input:StartGuideInput):Character {
 if(!input||!['existing','scratch'].includes(input.mode))throw new Error('请选择从现有角色图开始，或描述一个新角色。');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>80)throw new Error('请填写 1–80 字的角色名字。');
 if(typeof input.description!=='string'||input.description.trim().length>2000)throw new Error('角色描述最多 2000 字，可留空。');
 return {name:input.name.trim(),description:input.description.trim(),identity:'',outfit:'',personality:'',memePersona:'',signatureMotifs:'',outfitMode:'reference'};
}
