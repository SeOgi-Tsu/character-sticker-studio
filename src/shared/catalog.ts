import type { Catalog, Reaction } from './types.ts';

// These are editorial selections, not a usage ranking. Source IDs indicate a
// related community motif, never permission to copy the source image or design.
function reaction(id: string, name: string, caption: string, category: string, emoji: string, action: string, tags: string[], sourceIds: string[] = [], recommended = false): Reaction {
  return { id, name, caption, category, emoji, action, tags, sourceIds, recommended };
}

const cute: Reaction[] = [
  reaction('waao', '哇袄！', '哇袄', '贴脸可爱', '😮', 'Face close to the viewer, eyes opened wide with bright highlights, tiny rounded open mouth, cheeks lifted, both small hands held beside the cheeks in delighted surprise.', ['惊喜', '大头', '接梗'], [], true),
  reaction('head-tilt', '歪头小问号', '诶？', '贴脸可爱', '🤔', 'Tilt the head visibly to one side, lift one eyebrow, keep a tiny half-open mouth, curious direct eye contact and hands resting together beneath the chin.', ['疑惑', '歪头', '无字也懂'], [], true),
  reaction('peek', '偷偷探头', '探头', '贴脸可爱', '👀', 'Peek around a small rounded vertical panel, showing the full head and one shoulder, one small hand gripping the edge, wide curious eyes looking straight at the viewer.', ['入群', '潜水', '探头'], [], true),
  reaction('puffed-cheeks', '鼓成一颗包子', '哼！', '贴脸可爱', '😤', 'Puff both cheeks into round bun shapes, press the lips into a tiny pout, brows slanted down slightly, cross the small arms with a harmless stubborn expression.', ['嘴硬', '鼓脸', '撒娇'], ['phoebe-hub'], true),
  reaction('cheek-squish', '脸颊软乎乎', '软乎乎', '贴脸可爱', '🥹', 'Press both cheeks inward gently using the character’s own small mitten-like hands, make a tiny puckered mouth and smiling crescent eyes, show squishy rounded cheeks.', ['捏脸', '软萌', '大头'], ['phoebe-hub'], true),
  reaction('cling', '贴到镜头上', '贴贴', '贴脸可爱', '💕', 'Lean one rounded cheek toward the viewer as if gently nuzzling the screen, eyes softly closed, tender smile, one tiny floating heart beside the cheek and shoulders tucked in.', ['贴贴', '陪伴', '撒娇'], [], true),
  reaction('hug', '抱抱充电站', '抱抱', '贴脸可爱', '🫂', 'Reach both small arms forward in an open welcoming hug, show round hopeful eyes and a warm little smile, keep the entire upper body visible with simple foreshortened hands.', ['抱抱', '安慰', '邀请'], [], true),
  reaction('headpat', '摸摸就好了', '摸摸', '贴脸可爱', '🫳', 'Extend one small open hand gently toward the viewer for a reassuring head pat, bend the wrist naturally, tilt the head and smile with soft relaxed eyes.', ['安慰', '摸摸', '陪伴'], [], true),
  reaction('puppy-eyes', '眼睛水汪汪', '可以嘛', '贴脸可爱', '🥺', 'Hold both small hands together under the chin, look slightly upward with very large watery eyes, raise the inner eyebrows and tuck the shoulders inward in a hopeful pleading pose.', ['拜托', '撒娇', '水汪汪'], [], true),
  reaction('shy', '被夸到冒烟', '才没有', '贴脸可爱', '☺️', 'Turn the blushing face slightly aside while looking back at the viewer, hide the lower cheeks behind both small hands, keep a bashful restrained smile and one tiny steam curl above the head.', ['害羞', '嘴硬', '脸红'], [], true),
  reaction('flower', '给你一朵小花', '给你', '贴脸可爱', '🌷', 'Offer one small simple flower toward the viewer with both hands, keep the flower below the face, smile with bright affectionate eyes and slightly flushed cheeks.', ['送花', '感谢', '喜欢'], ['phoebe-hub'], true),
  reaction('heart-hold', '捧着心来啦', '喜欢你', '贴脸可爱', '💗', 'Hold one plump heart-shaped cushion against the chest with both arms, rest the chin on its upper edge, smile with delighted eyes and softly rosy cheeks.', ['比心', '喜欢', '贴贴'], [], true),
];

const chaos: Reaction[] = [
  reaction('deadpan', '眼神已下班', '就这？', '群聊发疯', '😑', 'Face the viewer with half-lidded flat eyes, tiny straight mouth and completely relaxed shoulders, rest the cheek on one hand with an unimpressed blank stare.', ['眼神死', '无语', '吐槽'], [], true),
  reaction('fake-cry', '小珍珠说来就来', '呜哇哇', '群聊发疯', '😭', 'Make a theatrically wide crying mouth with two oversized streams of tears, keep the body small and upright, hold fists below the cheeks in a harmless exaggerated sob.', ['假哭', '委屈', '发疯'], ['phoebe-hub'], true),
  reaction('wriggle', '阴暗地蠕动一下', '蠕动', '群聊发疯', '🐛', 'Lie belly-down in a compact curved pose, elbows tucked near the cheeks and feet lifted slightly, glance sideways with a determined tiny pout; a single still pose with two short curved motion marks.', ['蠕动', '发疯', '瘫软']),
  reaction('desk-bang', '小手拍桌', '你说啥！', '群聊发疯', '💥', 'Plant both small palms on a low simple tabletop at the instant of an emphatic desk slap, lean forward with wide eyes and an open indignant mouth, use only two small impact rays.', ['拍桌', '震惊', '接梗']),
  reaction('rolling', '滚成一小团', '打滚', '群聊发疯', '🌀', 'Curl sideways into a small ball with knees tucked to the chest, mouth open in a playful protest, cheeks round and hair following the curled silhouette, show one frozen rolling pose.', ['打滚', '撒泼', '发疯']),
  reaction('melt', '人已经化了', '化掉了', '群聊发疯', '🫠', 'Slump forward with the chin and both forearms resting on the ground, body compressed into a soft low silhouette, droopy eyelids and a tiny resigned smile, retain recognizable hair and clothing.', ['融化', '瘫软', '无语']),
  reaction('smug', '小小得意一下', '拿捏', '群聊发疯', '😏', 'Raise the chin slightly with one eyebrow lifted and a tiny smug grin, rest one hand at the waist and curl the other beside the cheek, look sideways with playful confidence.', ['得意', '嘴硬', '欠欠的']),
  reaction('panic', '慌得很有礼貌', '等一下！', '群聊发疯', '😵', 'Hold both small palms up toward the viewer in an urgent stop gesture, eyes wide and pupils small, mouth wobbly, lean backward slightly with one large sweat drop.', ['慌张', '等下', '社死']),
  reaction('stunned', '脑子短路两秒', '啊？', '群聊发疯', '😳', 'Stare straight ahead with wide empty eyes and a tiny open mouth, arms hanging loosely, hair slightly raised in surprise, freeze in a stiff stunned pose with no other objects.', ['震惊', '呆住', '接梗'], ['phoebe-hub'], true),
  reaction('popcorn', '瓜先放这里', '继续说', '群聊发疯', '🍿', 'Hold a tiny bowl of popcorn against the chest, lift one kernel toward the mouth, lean forward with intensely curious sparkling eyes and an amused small smile.', ['吃瓜', '围观', '潜水']),
  reaction('cant-stop-laughing', '真的绷不住了', '绷不住了', '群聊发疯', '😂', 'Bend forward laughing with eyes squeezed into crescents, one small hand covering the mouth and the other holding the belly, cheeks raised and one happy tear at the corner of an eye.', ['大笑', '绷不住', '接梗']),
  reaction('watching-you', '盯——', '看着我', '群聊发疯', '🫵', 'Lean the oversized face toward the viewer with a perfectly straight mouth, open steady eyes fixed on the viewer, keep both small hands resting below the chin in an intense silent stare.', ['盯人', '大头', '无字也懂']),
];

const daily: Reaction[] = [
  reaction('understood', '小本本记住了', '收到', '日常反应', '🫡', 'Give a small crisp salute with one hand at the temple, face forward with attentive eyes and a confident closed-mouth smile, keep the other arm relaxed by the side.', ['回应', '收到', '日常']),
  reaction('okay', '这事包我身上', '好耶', '日常反应', '👍', 'Raise one clearly shaped small thumbs-up near the shoulder, smile broadly with confident sparkling eyes, keep the other hand resting at the waist.', ['同意', '点赞', '开心']),
  reaction('confused', '好像哪里不对', '不懂诶', '日常反应', '🧐', 'Scratch the side of the head with one small hand, knit the brows gently, look upward to one side with a puzzled half-open mouth and hunched shoulders.', ['疑惑', '不会', '日常']),
  reaction('thinking', '小脑袋转呀转', '让我想想', '日常反应', '💭', 'Rest the chin on one curled hand, glance upward to one side with one brow raised, purse the lips thoughtfully and keep the body still in a focused thinking pose.', ['思考', '等下', '日常']),
  reaction('nope', '小手拒绝', '不可以', '日常反应', '🙅', 'Cross both small forearms in a clear X at chest height, frown gently with puffed cheeks and a stubborn tiny mouth, maintain a cute non-threatening expression.', ['拒绝', '嘴硬', '边界']),
  reaction('please', '双手合十拜托', '拜托拜托', '日常反应', '🙏', 'Press both palms together in front of the chest, lean forward a little and look up with hopeful round eyes, hold a small earnest smile with relaxed shoulders.', ['拜托', '请求', '日常']),
  reaction('thanks', '认真鞠个小躬', '谢谢啦', '日常反应', '🎀', 'Bow the upper body gently with both hands folded neatly in front, close the eyes in a warm smile, preserve the recognizable hair accessories and outfit silhouette.', ['感谢', '礼貌', '日常']),
  reaction('sorry', '对不起小声版', '对不起嘛', '日常反应', '🥲', 'Stand with shoulders tucked inward, hold both hands together low in front, lower the head slightly while looking up apologetically with one tiny tear and a worried soft mouth.', ['道歉', '委屈', '日常']),
  reaction('low-battery', '没电小挂件', '没电了', '日常反应', '🪫', 'Sit slumped with loose arms and half-closed eyes, tip the head forward, keep a tiny exhausted mouth and flattened posture, show the whole compact body without any battery icon or lettering.', ['没电', '疲惫', '摆烂']),
  reaction('sleepy', '困成一颗团子', '先睡一步', '日常反应', '😴', 'Rest the cheek on a small plain pillow held in both arms, close the eyes sleepily and relax the mouth, curl into a compact cozy sitting pose with the full hair silhouette visible.', ['困困', '睡觉', '日常']),
  reaction('hungry', '一口幸福', '开饭！', '日常反应', '🍚', 'Hold a small bowl close to the chest with one hand and a rounded spoon near the mouth with the other, puff one cheek after a bite, eyes smiling with uncomplicated delight.', ['干饭', '开心', '日常'], ['phoebe-hub']),
  reaction('running', '小短腿加急', '来啦来啦', '日常反应', '🏃', 'Hold a single energetic running pose with one knee lifted and opposite arm forward, lean toward the destination with bright determined eyes, use two short speed marks behind the feet.', ['来啦', '跑路', '日常'], ['phoebe-hub']),
];

const companion: Reaction[] = [
  reaction('welcome', '小幅度招手', '你来啦', '陪伴营业', '👋', 'Wave one small open hand beside the face, tilt the head slightly and smile with welcoming crescent eyes, keep the other hand resting naturally in front.', ['欢迎', '回应', '陪伴']),
  reaction('proud-of-you', '你超棒的', '超棒！', '陪伴营业', '⭐', 'Lift one simple star-shaped cushion above the head with both hands, smile proudly at the viewer with shining eyes, keep the full compact body balanced and visible.', ['夸夸', '鼓励', '星星']),
  reaction('victory', '小小胜利结算', '赢啦', '陪伴营业', '🏆', 'Lift both small fists overhead in a triumphant V-shaped arm pose, close the eyes in a joyful smile, stand on tiptoe with cheeks raised in celebration.', ['胜利', '开心', '庆祝']),
  reaction('cheer', '加油加油呀', '冲呀', '陪伴营业', '📣', 'Hold one small plain megaphone beside the open smiling mouth, lift the other fist encouragingly, look ahead with energetic bright eyes and an upright supportive pose.', ['加油', '鼓励', '营业']),
  reaction('waiting', '乖乖等你', '等你哦', '陪伴营业', '⏳', 'Sit neatly with both knees together and hands resting on them, look toward the viewer with patient round eyes and a tiny expectant smile, keep the pose calm and compact.', ['等候', '陪伴', '期待']),
  reaction('lurking', '安静冒个泡', '我在哦', '陪伴营业', '🫧', 'Hold the lower half of the face behind a small round plain cushion, show curious eyes above it and two small hands gripping its sides, peek gently with a shy attentive gaze.', ['潜水', '陪伴', '探头']),
  reaction('tea-time', '先喝一口', '吨吨吨', '陪伴营业', '☕', 'Cup a small plain mug with both hands and take one quiet sip, soften the eyes into a contented expression, keep the mug below eye level and shoulders relaxed.', ['喝茶', '围观', '休息']),
  reaction('ready', '认真模式启动', '交给我', '陪伴营业', '✨', 'Pull both small fists close to the chest in a determined ready pose, straighten the shoulders, focus the eyes forward and make a tiny confident smile.', ['认真', '开工', '回应']),
  reaction('sulking', '气成河豚', '不理你了', '陪伴营业', '🐡', 'Turn the upper body slightly away while looking back sideways, puff one cheek and cross both small arms, lift the chin in a cute sulking pose without anger effects.', ['闹别扭', '撒娇', '嘴硬']),
  reaction('blown-away', '可爱暴击到了', '受不了了', '陪伴营业', '💘', 'Lean backward a little with both small hands pressed over the heart, eyes dazzled and cheeks blushing, mouth open in delighted disbelief, add one small heart sparkle.', ['心动', '夸夸', '可爱']),
  reaction('blanket', '被窝结界', '不想动', '陪伴营业', '🛌', 'Wrap the body in one soft plain blanket leaving the recognizable head and hair accessories outside, rest the chin on the blanket edge, show sleepy half-lidded eyes and a tiny calm smile.', ['被窝', '摆烂', '困困']),
  reaction('busy', '小手正在忙', '稍等一下', '陪伴营业', '💻', 'Sit behind a tiny plain laptop with both hands near its keyboard, glance up at the viewer with focused but gentle eyes and one sweat drop, keep the face fully visible above the screen.', ['忙碌', '等下', '开工']),
];

const reactions = [...cute, ...chaos, ...daily, ...companion];

export const catalog: Catalog = {
  reactions,
  styles: [
    { id: 'cream-chibi', name: '奶油精致 Q 版', description: '软软圆脸、细腻眼睛、干净赛璐璐。想可爱，也想一眼认出是你。', color: '#F6D9AB', prompt: 'Refined 2D anime chibi illustration, two-head-tall proportions, soft round cheeks, expressive detailed eyes, clean chocolate-brown linework, restrained crisp cel shading, warm cream highlights and soft peach blush. Retain the character’s exact hair, eye and outfit colors; cream is a lighting accent, not a recoloring instruction. Consistent rounded silhouette, polished compact sticker finish.' },
    { id: 'cheeky-bighead', name: '欠欠大头反应', description: '脸占画面、小手短短、表情放大。可爱里带一点欠欠的幽默。', color: '#F3B6BE', prompt: 'Playful 2D big-head reaction sticker, one-and-a-half-head-tall proportions, oversized wide rounded face, tiny compact torso and mitten-like hands, bold clean dark outline, simple flat cel colors, exaggerated brows and mouth, expressive eyes preserving their original color. Soft coral blush as a small accent, mischievous comic timing, original character design, consistent proportions across the set.' },
    { id: 'blob-doodle', name: '糯米团子简笔', description: '团成一颗、几笔就懂。动作夸张，缩成聊天小图也清楚。', color: '#C9D7BB', prompt: 'Minimal hand-drawn 2D blob chibi sticker, compact bean-shaped body, very large rounded head, tiny stubby limbs, slightly organic dark brown contour, flat colors with almost no shading, simplified readable eyes and mouth. Preserve the exact hair silhouette, eye color, key accessories and the outfit’s main color blocks. Soft sage accents used only for small decorative marks; high legibility at small chat size, consistent line weight.' },
  ],
  packs: [
    { id: 'cute12', name: '贴脸可爱 12', description: '编辑首选：先试大头、贴贴和软乎乎的小表情。不是使用量排行榜。', reactionIds: cute.map(item => item.id) },
    { id: 'chaos12', name: '群聊发疯 12', description: '眼神死、假哭、拍桌、蠕动；一眼能接住情绪的反应精选。', reactionIds: chaos.map(item => item.id) },
    { id: 'daily24', name: '日常好用 24', description: '在可爱和群聊反应里加入收到、谢谢、干饭、没电；编辑按聊天场景配齐。', reactionIds: ['waao', 'head-tilt', 'peek', 'puffed-cheeks', 'cling', 'hug', 'puppy-eyes', 'flower', 'deadpan', 'fake-cry', 'stunned', 'cant-stop-laughing', ...daily.map(item => item.id)] },
    { id: 'all48', name: '完整反应库 48', description: '四类全选；每张仍可取消、修改动作和文案，建议先试少量再批量。', reactionIds: reactions.map(item => item.id) },
  ],
  sources: [
    { id: 'phoebe-hub', title: 'Phoebe Hub · 菲比社区表情样本', url: 'https://kato-shoko705.github.io/Phoebe-Hub/', checkedAt: '2026-09-08', evidence: '公开社区库及搜索索引可见 2026 年 6 月的捏脸、送花、干饭、哭闹、震惊等静态和动态条目。本库只借鉴反应类型，全部重写为原创动作；这些条目和站内“最热”都不能代表 QQ 使用量，部分页面依赖脚本加载。' },
    { id: 'taffy-2026', title: '塔菲表情包分享 · 2026 年社区案例', url: 'https://www.bilibili.com/video/BV18zzkBPEwR/', checkedAt: '2026-09-08', evidence: '创作者于 2026-01-24 发布个人收藏分享，说明这类角色表情仍有整理与传播活动。收藏规模属于作者自述，视频互动不等于表情使用频次；未据此给具体反应排名。' },
    { id: 'taffy-community', title: 'TaffySticker · 跨平台表情分享案例', url: 'https://t.me/s/TaffySticker?before=75', checkedAt: '2026-09-08', evidence: '社区明确分享 QQ 动图和可跨平台导入的图片/GIF 资源，用于参考整套导出的使用方式。此为延续性案例，不能视为 2026 新梗或热度证据，也不提供素材再授权。' },
    { id: 'niji-guide', title: 'Niji 7 官方提示词指南', url: 'https://nijijourney.com/blog/niji-7-prompting', checkedAt: '2026-09-08', evidence: '官方 2026-01-26 指南强调具体视觉描述，并展示 --raw 和风格参考用法；本工具整合角色三视图与头部细节的提示词结构，由用户在官方服务出图后导入。' },
    { id: 'niji-style', title: 'Niji 官方 Style Explorer / Creator', url: 'https://nijijourney.com/blog/style-creator', checkedAt: '2026-09-08', evidence: '官方 2026-07-08 更新介绍 Niji 7 风格探索与创建功能；风格参考影响画面风格，不承诺锁定角色身份。' },
  ],
};
