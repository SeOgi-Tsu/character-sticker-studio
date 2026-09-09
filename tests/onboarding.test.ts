import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDE_STORAGE_KEY, hasSeenGuide, markGuideSeen, newCharacterFromGuide, readActiveProjectId, rememberActiveProjectId, type GuideStorage, type StartGuideInput } from '../src/lib/onboarding.ts';
import { applyProjectChange } from '../src/lib/character-workflow.ts';
import type { Project } from '../src/shared/types.ts';

const project:Project={id:'old-project',name:'Margaret existing',character:{name:'Margaret',description:'existing description',identity:'existing identity',outfit:'existing cardigan',personality:'existing personality',memePersona:'existing persona',signatureMotifs:'existing motifs',outfitMode:'reference',referenceAssetId:'old-reference',anchorAssetId:'old-anchor'},styleId:'cream-chibi',selectedIds:['waao'],customReactions:[],overrides:{waao:{name:'custom label'}},captions:{waao:{text:'哼',enabled:true,mode:'generated',color:'#ffffff',stroke:'#382537',position:'bottom',fontSize:52}},createdAt:'2026-09-09',updatedAt:'2026-09-09'};

test('guide persistence uses its versioned key and never marks an unstarted guide by reading',()=>{
 const values=new Map<string,string>(),writes:string[]=[];
 const storage:GuideStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes.push(key);values.set(key,value);}};
 assert.equal(GUIDE_STORAGE_KEY,'character-sticker-studio:guide:v1');assert.equal(hasSeenGuide(storage),false);assert.equal(writes.length,0);
 markGuideSeen(storage);assert.equal(hasSeenGuide(storage),true);assert.deepEqual(writes,[GUIDE_STORAGE_KEY]);
});

test('blocked storage methods and inaccessible browser storage never crash onboarding',()=>{
 const blocked:GuideStorage={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.equal(hasSeenGuide(blocked),false);assert.doesNotThrow(()=>markGuideSeen(blocked));
 const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 try{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{get localStorage(){throw Error('browser storage access denied');}}});
  assert.equal(hasSeenGuide(),false);assert.doesNotThrow(()=>markGuideSeen());
  Object.defineProperty(globalThis,'window',{configurable:true,get(){throw Error('browser object denied');}});
  assert.equal(hasSeenGuide(),false);assert.doesNotThrow(()=>markGuideSeen());
  Reflect.deleteProperty(globalThis,'window');assert.equal(hasSeenGuide(),false);assert.doesNotThrow(()=>markGuideSeen());
 }finally{if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else Reflect.deleteProperty(globalThis,'window');}
});

test('active project persistence uses a separate key and tolerates unavailable storage',()=>{
 const values=new Map<string,string>();const storage:GuideStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);}};
 assert.equal(readActiveProjectId(storage),undefined);rememberActiveProjectId('new-project-id',storage);assert.equal(readActiveProjectId(storage),'new-project-id');assert.equal(values.get('character-sticker-studio:active-project:v1'),'new-project-id');assert.equal(hasSeenGuide(storage),false);
 const blocked:GuideStorage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};assert.equal(readActiveProjectId(blocked),undefined);assert.doesNotThrow(()=>rememberActiveProjectId('new-project-id',blocked));
 const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window');try{Object.defineProperty(globalThis,'window',{configurable:true,value:{get localStorage(){throw Error('denied');}}});assert.equal(readActiveProjectId(),undefined);assert.doesNotThrow(()=>rememberActiveProjectId('new-project-id'));Reflect.deleteProperty(globalThis,'window');assert.equal(readActiveProjectId(),undefined);assert.doesNotThrow(()=>rememberActiveProjectId('new-project-id'));}finally{if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else Reflect.deleteProperty(globalThis,'window');}
});

test('both guide entry paths create a clean character from entered fields without inheriting project assets or lore',()=>{
 for(const mode of ['existing','scratch'] as const){
  const input={...project.character,mode,name:'  新朋友  ',description:'  用户亲自写的设定\n保留换行。  '};
  const created=newCharacterFromGuide(input);
  assert.deepEqual(created,{name:'新朋友',description:'用户亲自写的设定\n保留换行。',identity:'',outfit:'',personality:'',memePersona:'',signatureMotifs:'',outfitMode:'reference'});
  assert.equal('referenceAssetId' in created,false);assert.equal('anchorAssetId' in created,false);assert.equal('mode' in created,false);assert.equal(input.referenceAssetId,'old-reference');
 }
 assert.equal(newCharacterFromGuide({mode:'existing',name:'新朋友',description:''}).description,'');
});

test('invalid guide entry cannot become a new character, and accepted field limits are retained',()=>{
 const valid:StartGuideInput={mode:'scratch',name:'新朋友',description:''};
 for(const change of [{name:''},{name:'  '},{name:'x'.repeat(81)},{description:'x'.repeat(2001)},{mode:'unknown'},{name:null},{description:42}])assert.throws(()=>newCharacterFromGuide({...valid,...change} as StartGuideInput));
 const boundary=newCharacterFromGuide({...valid,name:'x'.repeat(80),description:'x'.repeat(2000)});assert.equal(boundary.name.length,80);assert.equal(boundary.description.length,2000);
});

test('style or reference replacement invalidates the old anchor without mutating unrelated project data',()=>{
 const before=structuredClone(project);
 for(const change of [{styleId:'blob-doodle'},{character:{...project.character,referenceAssetId:'new-reference'}},{character:{...project.character,referenceAssetId:undefined}},{styleId:'blob-doodle',character:{...project.character,anchorAssetId:'premature-anchor'}}]){
  const next=applyProjectChange(project,change);assert.equal(next.character.anchorAssetId,undefined);assert.deepEqual(next.captions,project.captions);assert.deepEqual(next.overrides,project.overrides);assert.deepEqual(next.selectedIds,project.selectedIds);assert.equal(next.id,project.id);
 }
 assert.deepEqual(project,before);
});

test('unchanged reference, ordinary edits and explicit candidate selection preserve the intended anchor',()=>{
 const cases=[{change:{styleId:project.styleId},anchor:'old-anchor'},{change:{character:{...project.character,referenceAssetId:'old-reference'}},anchor:'old-anchor'},{change:{character:{...project.character,memePersona:'a different personality'}},anchor:'old-anchor'},{change:{character:{...project.character,anchorAssetId:'selected-candidate'}},anchor:'selected-candidate'},{change:{selectedIds:['new-reaction']},anchor:'old-anchor'}];
 for(const {change,anchor} of cases)assert.equal(applyProjectChange(project,change).character.anchorAssetId,anchor);
 const noReference={...project,character:{...project.character,referenceAssetId:undefined,anchorAssetId:'standalone-anchor'}};assert.equal(applyProjectChange(noReference,{name:'Renamed'}).character.anchorAssetId,'standalone-anchor');
});
