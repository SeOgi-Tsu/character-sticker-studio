import presets from './loop-presets.json';
import type { ProviderSettings } from './types';
export const loopPresets = presets;
export const loopWorkflowUrl='https://www.runninghub.ai/post/2116526206026842114';
export const loopDefaultSettings:ProviderSettings={provider:'runninghub',baseUrl:'https://www.runninghub.ai',model:'workflow:2116526206026842114',size:'512x512',concurrency:1,runninghub:{kind:'workflow',resourceId:'2116526206026842114',promptNode:{nodeId:'8',fieldName:'value'},referenceNode:{nodeId:'7',fieldName:'image'},extraNodes:[{nodeId:'10',fieldName:'noise_seed',fieldValue:'42'}],outputIndex:0}};
export interface LoopRecipe {id:string;name:string;prompt:string;seed:string;selected:boolean;}
export interface LoopWorkspace {version:1;revision:number;masterAssetId?:string;recipes:LoopRecipe[];}
export function buildLoopPrompt(action:string){return `subject_definitions:
<Subject 1> is the single character in <Picture 1>, including the face, hairstyle, headwear, eye colors, costume, proportions and illustration style.
<Subject 2> is the simple background and lighting in <Picture 1>.

summary:
[reference generation] A continuous cute repeating reaction by <Subject 1> against <Subject 2>, for a short looping GIF.

retention_analysis:
<Subject 1>: fully_preserved - Preserve identity, original eye colors and their left-right arrangement, hair, fixed head accessories, costume and chibi proportions.
<Subject 2>: fully_preserved - Preserve the simple background color, constant soft lighting and faint contact shadow.

detailed_description:
A single uninterrupted full-body view of <Subject 1>, centered with generous space around the head, hands, hair and feet, against <Subject 2>. The character fills about seventy percent of the square frame. ${action} Head accessories remain securely attached; only their flexible edges follow the movement. The motion is already ongoing and continues evenly through the entire cycle. Maintain the same position, scale, background and exposure, with a locked camera, no cuts, no entrance, no final held pose, no text and no mirroring.

overall_soundscape:
No speech or sound effects; silent reaction animation.

non_diegetic_music:
N/A`;}
export const defaultLoopWorkspace=():LoopWorkspace=>({version:1,revision:0,recipes:loopPresets.map(p=>({id:p.id,name:p.name,prompt:buildLoopPrompt(p.action),seed:'42',selected:true}))});
