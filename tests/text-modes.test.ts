import test from 'node:test';
import assert from 'node:assert/strict';
import { captionStyleDefaults, captionStyles, defaultCaptionFor, resolveCaptionMode } from '../src/shared/typography.ts';
import type { Reaction } from '../src/shared/types.ts';

test('legacy captions remain overlay-compatible and explicit disabled wins',()=>{
 assert.equal(resolveCaptionMode(), 'overlay');
 assert.equal(resolveCaptionMode({enabled:true}), 'overlay');
 assert.equal(resolveCaptionMode({enabled:false,mode:'generated'}), 'none');
 assert.equal(resolveCaptionMode({enabled:true,mode:'none'}), 'none');
 assert.equal(resolveCaptionMode({enabled:true,mode:'generated'}), 'generated');
});
test('reaction recommendations become explicit defaults with six real type styles',()=>{
 const reaction:Reaction={id:'r',name:'test',caption:'才没有！',action:'smile',category:'test',tags:[],emoji:'',textMode:'generated',captionStyleId:'brush'};
 const native=defaultCaptionFor(reaction);assert.equal(native.mode,'generated');assert.equal(native.text,'才没有！');assert.equal(native.styleId,'brush');
 assert.equal(defaultCaptionFor({...reaction,textMode:'none'}).enabled,false);
 assert.equal(defaultCaptionFor({...reaction,textMode:undefined,captionStyleId:undefined}).styleId,'round');
 assert.equal(new Set(captionStyles.map(s=>s.id)).size,6);
 assert.equal(new Set(captionStyles.map(s=>s.fontFile).filter(Boolean)).size,3);
});
test('switching style supplies an appropriate readable palette without changing caption content or mode',()=>{
 const defaults=captionStyleDefaults('bubble');
 assert.equal(defaults.styleId,'bubble');assert.equal(defaults.color,'#382537');assert.equal(defaults.stroke,'#fff9f0');
 assert.deepEqual(Object.keys(defaults).sort(),['styleId','color','stroke','fontSize','rotation'].sort());
 assert.notEqual(captionStyleDefaults('comic').color,defaults.color);
 const reaction:Reaction={id:'r',name:'test',caption:'嘿嘿',action:'smile',category:'test',tags:[],emoji:'',textMode:'none',captionStyleId:'bubble'};
 const generatedDefault=defaultCaptionFor(reaction);for(const [key,value] of Object.entries(defaults))assert.equal(generatedDefault[key as keyof typeof generatedDefault],value);
});
