import type { Caption, CaptionStyle, CaptionStyleId, Reaction, TextMode } from './types.ts';

export const captionStyles: CaptionStyle[] = [
 {id:'classic',name:'经典粗描边',description:'清楚醒目的传统表情字',fontFamily:'Noto Sans CJK SC, Microsoft YaHei, sans-serif',prompt:'Bold clean Chinese sans-serif lettering, compact strokes, white fill and a dark rounded outline, instantly readable at chat size.'},
 {id:'round',name:'快乐软糖',description:'圆润不规则，俏皮又软萌',fontFamily:'ZCOOL KuaiLe',fontFile:'ZCOOLKuaiLe-Regular.ttf',prompt:'Playful rounded hand-drawn Chinese display lettering, slightly irregular soft chunky shapes, cream-white fill and a cocoa outline, cute but highly readable.'},
 {id:'handwritten',name:'随手碎碎念',description:'松弛手写，适合吐槽和小声嘀咕',fontFamily:'Long Cang',fontFile:'LongCang-Regular.ttf',prompt:'Loose spontaneous Chinese handwriting, expressive pen pressure, airy spacing, dark ink with a discreet white edge, like a funny handwritten aside.'},
 {id:'brush',name:'毛笔炸毛',description:'有力的毛笔笔势，适合嘴硬和爆发',fontFamily:'Zhi Mang Xing',fontFile:'ZhiMangXing-Regular.ttf',prompt:'Energetic expressive Chinese brush lettering, sweeping confident strokes and clear readable glyphs, bold dark ink with a contrasting pale edge, a punchy comedic exclamation.'},
 {id:'bubble',name:'软萌对话泡',description:'圆字配小气泡，像在对你说话',fontFamily:'ZCOOL KuaiLe',fontFile:'ZCOOLKuaiLe-Regular.ttf',prompt:'Cute rounded Chinese lettering inside one compact softly rounded cream speech bubble with a short tail pointing toward the character, warm dark ink, hand-drawn outline, generous breathing room.'},
 {id:'comic',name:'漫画重击',description:'醒目跳字与偏移阴影，放大反差',fontFamily:'ZCOOL KuaiLe',fontFile:'ZCOOLKuaiLe-Regular.ttf',prompt:'Lively comic-impact Chinese display lettering, punchy warm yellow fill with a thick dark outline and a small offset colored shadow, slight purposeful tilt that follows the gesture, readable at small size.'},
];

/** Older saved captions used enabled alone; an explicit disabled switch always wins. */
export function resolveCaptionMode(caption?: Partial<Caption>): TextMode {
 if(caption?.enabled===false||caption?.mode==='none')return 'none';
 return caption?.mode??'overlay';
}

/** Recommendations seed new settings only; callers must prefer explicit saved captions. */
export function defaultCaptionFor(reaction: Reaction): Caption {
 const mode=reaction.textMode??'overlay',styleId=reaction.captionStyleId??'round';
 return {text:reaction.caption,enabled:mode!=='none',mode,position:'bottom',...captionStyleDefaults(styleId)};
}

/** Apply a deliberate style change without overwriting text, mode or placement. */
export function captionStyleDefaults(styleId:CaptionStyleId):Pick<Caption,'styleId'|'color'|'stroke'|'fontSize'|'rotation'> {
 const ink=styleId==='handwritten'||styleId==='brush'||styleId==='bubble';
 return {styleId,color:ink?'#382537':styleId==='comic'?'#fff080':'#fff9f0',stroke:ink?'#fff9f0':'#382537',fontSize:styleId==='handwritten'?64:styleId==='brush'?68:52,rotation:styleId==='comic'?-6:styleId==='handwritten'?-3:0};
}
