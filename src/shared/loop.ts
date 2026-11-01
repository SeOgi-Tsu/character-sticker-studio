import presets from './loop-presets.json';
import scenes from './loop-scenes.json';
import type { ProviderSettings } from './types';
export const loopPresets = [...scenes, ...presets];
export const sceneLoopPresets = scenes;
export const loopWorkflowUrl='https://www.runninghub.ai/post/2116526206026842114';
export const loopDefaultSettings:ProviderSettings={provider:'runninghub',baseUrl:'https://www.runninghub.ai',model:'workflow:2116526206026842114',size:'512x512',concurrency:1,runninghub:{kind:'workflow',resourceId:'2116526206026842114',promptNode:{nodeId:'8',fieldName:'value'},referenceNode:{nodeId:'7',fieldName:'image'},extraNodes:[{nodeId:'10',fieldName:'noise_seed',fieldValue:'42'}],outputIndex:0}};
export interface LoopRecipe {id:string;name:string;prompt:string;seed:string;selected:boolean;referenceAssetId?:string;}
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
A single uninterrupted view of <Subject 1> against <Subject 2>, matching the reference image framing and leaving room for the intended gesture. ${action} Head accessories remain securely attached; only their flexible edges follow the movement. The motion is already ongoing and continues evenly through the entire cycle. Maintain the same position, scale, background and exposure, with a locked camera, no cuts, no entrance, no final held pose, no text and no mirroring.

overall_soundscape:
No speech or sound effects; silent reaction animation.

non_diegetic_music:
N/A`;}
export function buildSceneLoopPrompt(action:string,framing:string){return `subject_definitions:
<Subject 1> is the character in <Picture 1>, preserving the original identity, face design, hair, costume, eye-color arrangement and illustration style.
<Subject 2> is the scene, props and any interacting hands in <Picture 1>.

summary:
[reference generation] A readable, playful situational reaction by <Subject 1>, using the composition and prop relationships of <Subject 2>.

retention_analysis:
<Subject 1>: partially_preserved - Preserve identity and costume while allowing expressive facial deformation, changes of gaze and the designed gesture.
<Subject 2>: partially_preserved - Retain the reference scene layout and physical prop connections; animate only the described interactions.

detailed_description:
${framing} ${action} Preserve the reference's illustrated linework and color palette. The repeated action is already in progress and flows through the loop boundary. The camera stays still while the character performs; no cuts, no one-time entrance or ending, no transformation, no new text. Keep the original subject count and distinguish the character's hands from any outside interacting hands. Match the scene-specific framing; do not replace it with a centered full-body standing view.

overall_soundscape:
Silent reaction animation, no speech or sound effects.

non_diegetic_music:
N/A`;}
export const sceneLoopRecipes=():LoopRecipe[]=>scenes.map(p=>({id:p.id,name:p.name,prompt:buildSceneLoopPrompt(p.action,p.framing),seed:'42',selected:true}));
export const defaultLoopWorkspace=():LoopWorkspace=>({version:1,revision:0,recipes:sceneLoopRecipes()});
export function installSceneLoops(w:LoopWorkspace):LoopWorkspace{
 const known=new Set(w.recipes.map(r=>r.id)),added=sceneLoopRecipes().filter(r=>!known.has(r.id));
 if(!added.length)return w;
 if(w.recipes.length+added.length>30)throw new Error('加入情景套装会超过 30 条，请先保留需要的配方。');
 return {...w,recipes:[...w.recipes.map(r=>({...r,selected:false})),...added]};
}
