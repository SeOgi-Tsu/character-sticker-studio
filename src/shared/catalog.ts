import type { Catalog, Composition, CompositionId, Interaction, PersonaPreset, Reaction } from './types.ts';
import { captionStyles } from './typography.ts';

export const compositions: Composition[] = [
  { id: 'closeup', name: '贴脸特写', description: '让脸颊、眼神或触碰点成为主角；可贴边、轻微变形，关键特征仍清楚。', prompt: 'Close-up framing: the face and action-defining gesture occupy about 80–92% of the canvas, with only a little shoulder visible. Choose eye-level or a slight high/low camera angle that makes this emotion readable. Preserve recognizable identity details; the shoulders and trailing hair may deliberately run beyond an edge, but protect the eyes, mouth and contact point. This is the selected close-up, not the default for other stickers.' },
  { id: 'halfbody', name: '半身互动', description: '看到腰间和双臂，靠近的小手可以透视放大；让身体真的朝你伸过来。', prompt: 'Waist-up medium framing: show the head, shoulders, arms and waist, with the character occupying about 65–85% of the canvas height. Let the arm gesture and torso lean create the silhouette. Preserve readable limb connections; a reaching hand may be larger in the foreground while the waist remains visible. Keep the head clearly smaller in the frame than a face close-up.' },
  { id: 'fullbody', name: '全身姿态', description: '完整露出身体与双脚；小小一只的反差、蹲坐和鞠躬都能讲清情绪。', prompt: 'Full-body wide framing: show the entire body from hair tips to both feet, including every limb, at about 35–70% of the canvas height. Use the smaller end for a deliberately tiny scale joke and the larger end for a readable complete pose. Camera observes the requested pose from a clear three-quarter angle. The body silhouette carries the reaction; not a portrait, no bust crop, no hidden legs.' },
  { id: 'action', name: '夸张全身动作', description: '跑、跳、打滚或趴地，以完整肢体和方向线传达动作；横向姿势也成立。', prompt: 'Action-wide framing: show the whole body and every limb in the requested frozen action, including hands and feet. The pose occupies roughly 70% along its longest axis; allow horizontal, diagonal or curled silhouettes instead of forcing an upright figure. Use a readable side or three-quarter camera matching the action and leave space in its direction. The full-body gesture is the focus; not a portrait, no bust crop, no cropped feet.' },
  { id: 'prop', name: '道具互动', description: '道具能当主角：把大花递到面前，或让小身体努力抱住；接触与大小反差清楚。', prompt: 'Prop-interaction framing: frame the character and one action-defining prop together as a readable unit, occupying about 70–88% of the canvas. Show the hands contacting or holding the prop and enough torso to explain the action. The prop may occupy 25–60% of the unit when an oversized gift or scale contrast is the joke. Use foreground depth for an offering, never let the prop conceal the eyes and mouth.' },
  { id: 'scene', name: '迷你情境', description: '被窝、电脑等一处小环境；缩小人物，留出空间讲清“正在干什么”。', prompt: 'Mini-scene wide framing: show one character within only the minimal setting directly needed by the action, such as a blanket nook or tiny workstation. The entire isolated scene occupies about 70% of the canvas, while the character occupies about 40–50% of the canvas height. Let the posture, object relationship and negative space explain the situation. No scenic room background, no extra characters, not a portrait; keep all setting pieces inside the canvas.' },
  { id: 'peek', name: '边缘探头', description: '从画面边缘歪着挤进来，目光落向你；留白和贴边形成突然出现的互动。', prompt: 'Asymmetric edge-peek framing: place the character at the left or right third, leaning around the single simple occluding object described in the action, leaving the opposite half mostly empty. Use a tilted head, one gripping hand and the intentionally revealed body part. The occluder or trailing hair may meet the canvas edge; keep facial features and the gripping contact clear. The body may be hidden behind the object. Keep the asymmetric layout instead of centering the face.' },
];

export const interactions: Interaction[] = [
  { id: 'observe', name: '自在反应', description: '靠姿态、眼神和反差接梗，也保留安静可爱的停顿；不添加对方的手。', prompt: 'Observation mode: let the viewer recognize the character’s own reaction through posture, eyes and timing. A glance toward the viewer is allowed, but do not invent physical contact or a lens approach. Do not introduce an off-screen viewer hand.' },
  { id: 'approach', name: '扑向你', description: '身体和小手朝观众靠近；用前后大小差表达“来抱一下”，景别仍由你选择。', prompt: 'Approach mode: direct the character’s gesture toward the viewer, with a clear near-to-far relationship between a reaching hand, face and torso. Use inviting eye contact or a delighted closed-eye smile according to the action. At wider staging preserve the complete requested body and express the approach through lean, diagonal motion and hand depth. No off-screen viewer hand is needed.' },
  { id: 'offer', name: '递给你', description: '花、心或小礼物伸到面前；道具承担互动，一眼看懂“这是给你的”。', prompt: 'Offering mode: make the one offered object lead toward the viewer with the character’s connected hands behind it. Use purposeful size contrast and clear depth without covering the eyes or mouth; the expression answers the implied recipient. Retain the selected camera distance and fit the offering within that staging. Do not add a recipient hand.' },
  { id: 'touch', name: '摸摸贴贴', description: '摸头、贴屏或轻轻碰一下；谁在碰、碰在哪里清楚，表情对接触有回应。', prompt: 'Gentle-contact mode: show one clear contact point and a visible soft reaction to it, such as lowered shoulders, a tilted cheek or relaxed eyelids. If the action needs the viewer to touch the character, permit at most one anonymous viewer hand entering from an edge, with its wrist visibly continuing out of frame. That hand is not an extra arm belonging to the character. For the character touching an implied screen or reaching to pat the viewer, use the character’s own connected limb and omit an incoming hand. Do not invent another person or face.' },
  { id: 'squish', name: '软脸压扁', description: '轻捏一侧脸颊、软乎乎压扁；变形要有接触原因，嘴硬和舒服都能很可爱。', prompt: 'Soft-squish mode: make a gentle contact point visibly cause rounded cheek compression or a soft elastic body response. When an external touch is required, permit at most one anonymous viewer hand entering from an edge; show a coherent thumb/finger or palm contact and a wrist continuing out of frame. It is not an extra arm belonging to the character. Keep the deformation playful and painless, with the eyes and mouth still readable and the identity recognizable. If the action uses the character’s own hands or an implied screen, omit the viewer hand.' },
  { id: 'comic', name: '反差发癫', description: '小身体大自信、突然扁掉、一本正经犯傻；一个鲜明笑点就够。', prompt: 'Visual-comedy mode: build one dominant visual joke from the action, such as a tiny proud body, exaggerated collapse or calm eyes paired with an absurd silhouette. Favor asymmetry, pose contrast and precisely held comic timing; do not turn every joke into huge sparkling eyes. Keep the selected composition and use negative space when small scale is the joke. No extra hand or unrelated prop is required.' },
];

// Missing fields in an imported recipe preserve the earlier standalone action.
export function getInteraction(reaction: Pick<Reaction, 'interactionId'>): Interaction {
  return interactions.find(item => item.id === reaction.interactionId) ?? interactions[0];
}

const reactionCompositions: Record<string, CompositionId> = {
  waao: 'closeup', 'head-tilt': 'halfbody', peek: 'peek', 'puffed-cheeks': 'closeup',
  'cheek-squish': 'closeup', cling: 'closeup', hug: 'halfbody', headpat: 'halfbody',
  'puppy-eyes': 'fullbody', shy: 'halfbody', flower: 'prop', 'heart-hold': 'prop',
  deadpan: 'halfbody', 'fake-cry': 'fullbody', wriggle: 'action', 'desk-bang': 'prop',
  rolling: 'action', melt: 'action', smug: 'halfbody', panic: 'action', stunned: 'fullbody',
  popcorn: 'prop', 'cant-stop-laughing': 'action', 'watching-you': 'closeup',
  understood: 'halfbody', okay: 'halfbody', confused: 'halfbody', thinking: 'halfbody',
  nope: 'halfbody', please: 'fullbody', thanks: 'fullbody', sorry: 'fullbody',
  'low-battery': 'fullbody', sleepy: 'scene', hungry: 'prop', running: 'action',
  welcome: 'halfbody', 'proud-of-you': 'prop', victory: 'action', cheer: 'prop',
  waiting: 'fullbody', lurking: 'peek', 'tea-time': 'prop', ready: 'fullbody',
  sulking: 'fullbody', 'blown-away': 'action', blanket: 'scene', busy: 'scene',
  'hug-lunge': 'halfbody', 'receive-headpat': 'halfbody', 'flower-delivery': 'prop',
  'corner-check': 'peek', 'cheek-pinch': 'closeup', 'tiny-boss': 'fullbody',
  'instant-pancake': 'action', 'heart-window': 'closeup',
  'viewer-offer': 'fullbody', 'tiptoe-wave': 'fullbody',
  'tiny-confident': 'fullbody', 'thoughtful-sulk': 'halfbody',
  'smug-challenge': 'halfbody', 'caught-bluff': 'fullbody',
  'little-victory': 'action', 'quiet-softening': 'prop',
  'cookie-alibi': 'halfbody', 'gift-custodian': 'fullbody',
  'lid-deadlock': 'action', 'secret-standby': 'peek',
  'umbrella-bias': 'prop', 'reserved-cushion': 'scene',
};

// Older projects have no staging field. Resolve their stable reaction IDs to
// the new defaults; a user's explicit choice always wins.
export function getComposition(reaction: Pick<Reaction, 'id' | 'compositionId'>): Composition {
  const id = reaction.compositionId ?? reactionCompositions[reaction.id] ?? 'halfbody';
  return compositions.find(item => item.id === id) ?? compositions[1];
}

// These are editorial selections, not a usage ranking. Source IDs indicate a
// related community motif, never permission to copy the source image or design.
function reaction(id: string, name: string, caption: string, category: string, emoji: string, action: string, tags: string[], sourceIds: string[] = [], recommended = false): Reaction {
  return { id, name, caption, category, emoji, action, tags, sourceIds, recommended, compositionId: reactionCompositions[id] ?? 'halfbody' };
}

const cute: Reaction[] = [
  reaction('waao', '哇袄！', '哇袄', '贴脸可爱', '😮', 'Open the eyes wide with bright highlights, make a tiny rounded open mouth, lift the cheeks and hold both small hands beside them in delighted surprise, with shoulders raised eagerly.', ['惊喜', '大头', '接梗'], [], true),
  reaction('head-tilt', '歪头小问号', '诶？', '贴脸可爱', '🤔', 'Tilt the head visibly to one side, lift one eyebrow, keep a tiny half-open mouth, curious direct eye contact and hands resting together beneath the chin.', ['疑惑', '歪头', '无字也懂'], [], true),
  reaction('peek', '偷偷探头', '探头', '贴脸可爱', '👀', 'Lean sideways to peek around a small rounded vertical panel, grip its edge with one small hand and turn one shoulder toward it, with wide curious eyes looking straight at the viewer.', ['入群', '潜水', '探头'], [], true),
  reaction('puffed-cheeks', '鼓成一颗包子', '哼！', '贴脸可爱', '😤', 'Puff both cheeks into round bun shapes, press the lips into a tiny pout, brows slanted down slightly, cross the small arms with a harmless stubborn expression.', ['嘴硬', '鼓脸', '撒娇'], ['phoebe-hub'], true),
  reaction('cheek-squish', '脸颊软乎乎', '软乎乎', '贴脸可爱', '🥹', 'Press both cheeks inward gently using the character’s own small mitten-like hands, make a tiny puckered mouth and smiling crescent eyes, show squishy rounded cheeks.', ['捏脸', '软萌', '大头'], ['phoebe-hub'], true),
  reaction('cling', '贴到镜头上', '贴贴', '贴脸可爱', '💕', 'Tilt the head affectionately and lift one shoulder to nestle the rounded cheek against it, eyes softly closed and smiling tenderly, with one tiny floating heart beside the cheek and the other shoulder tucked in.', ['贴贴', '陪伴', '撒娇'], [], true),
  reaction('hug', '抱抱充电站', '抱抱', '贴脸可爱', '🫂', 'Reach both small arms forward in an open welcoming hug, lean the torso forward with round hopeful eyes and a warm little smile, and spread the hands gently in an inviting gesture.', ['抱抱', '安慰', '邀请'], [], true),
  reaction('headpat', '摸摸就好了', '摸摸', '贴脸可爱', '🫳', 'Extend one small open hand gently toward the viewer for a reassuring head pat, bend the wrist naturally, tilt the head and smile with soft relaxed eyes.', ['安慰', '摸摸', '陪伴'], [], true),
  reaction('puppy-eyes', '眼睛水汪汪', '可以嘛', '贴脸可爱', '🥺', 'Sit on the heels with knees close together and shoulders tucked inward, clasp small hands under the chin and look up with large watery eyes and hopeful raised inner eyebrows. Let the small kneeling posture express the request.', ['拜托', '撒娇', '水汪汪'], [], true),
  reaction('shy', '被夸到冒烟', '才没有', '贴脸可爱', '☺️', 'Turn the blushing face slightly aside while looking back at the viewer, hide the lower cheeks behind both small hands, keep a bashful restrained smile and one tiny steam curl above the head.', ['害羞', '嘴硬', '脸红'], [], true),
  reaction('flower', '给你一朵小花', '给你', '贴脸可爱', '🌷', 'Offer one small simple flower toward the viewer with both hands, keep the flower below the face, smile with bright affectionate eyes and slightly flushed cheeks.', ['送花', '感谢', '喜欢'], ['phoebe-hub'], true),
  reaction('heart-hold', '捧着心来啦', '喜欢你', '贴脸可爱', '💗', 'Hold one plump heart-shaped cushion against the chest with both arms, rest the chin on its upper edge, smile with delighted eyes and softly rosy cheeks.', ['比心', '喜欢', '贴贴'], [], true),
];

const chaos: Reaction[] = [
  reaction('deadpan', '眼神已下班', '就这？', '群聊发疯', '😑', 'Face the viewer with half-lidded flat eyes, tiny straight mouth and completely relaxed shoulders, rest the cheek on one hand with an unimpressed blank stare.', ['眼神死', '无语', '吐槽'], [], true),
  reaction('fake-cry', '小珍珠说来就来', '呜哇哇', '群聊发疯', '😭', 'Make a theatrically wide crying mouth with two oversized streams of tears, keep the body small and upright, hold fists below the cheeks in a harmless exaggerated sob.', ['假哭', '委屈', '发疯'], ['phoebe-hub'], true),
  reaction('wriggle', '阴暗地蠕动一下', '蠕动', '群聊发疯', '🐛', 'Lie belly-down in a compact curved pose, elbows tucked near the cheeks and feet lifted slightly, glance sideways with a determined tiny pout; a single still pose with two short curved motion marks.', ['蠕动', '发疯', '瘫软']),
  reaction('desk-bang', '小手拍桌', '你说啥！', '群聊发疯', '💥', 'Plant both small palms on a low simple tabletop at the instant of an emphatic desk slap, lean forward with wide eyes and an open indignant mouth, use only two small impact rays.', ['拍桌', '震惊', '接梗']),
  reaction('rolling', '滚成一小团', '打滚', '群聊发疯', '🌀', 'Curl sideways on the floor into a small ball, draw both knees toward the chest and both feet to the side of the face, mouth open in playful protest. Hold one frozen rolling pose with hair following the sideways silhouette.', ['打滚', '撒泼', '发疯']),
  reaction('melt', '人已经化了', '化掉了', '群聊发疯', '🫠', 'Slump forward with the chin and both forearms resting on the ground, body compressed into a soft low silhouette, droopy eyelids and a tiny resigned smile, retain recognizable hair and clothing.', ['融化', '瘫软', '无语']),
  reaction('smug', '小小得意一下', '拿捏', '群聊发疯', '😏', 'Raise the chin slightly with one eyebrow lifted and a tiny smug grin, rest one hand at the waist and curl the other beside the cheek, look sideways with playful confidence.', ['得意', '嘴硬', '欠欠的']),
  reaction('panic', '慌得很有礼貌', '等一下！', '群聊发疯', '😵', 'Hold both small palms up toward the viewer in an urgent stop gesture, eyes wide and pupils small, mouth wobbly, lean backward slightly with one large sweat drop.', ['慌张', '等下', '社死']),
  reaction('stunned', '脑子短路两秒', '啊？', '群聊发疯', '😳', 'Stare straight ahead with wide empty eyes and a tiny open mouth, arms hanging loosely, hair slightly raised in surprise, freeze in a stiff stunned pose with no other objects.', ['震惊', '呆住', '接梗'], ['phoebe-hub'], true),
  reaction('popcorn', '瓜先放这里', '继续说', '群聊发疯', '🍿', 'Hold a tiny bowl of popcorn against the chest, lift one kernel toward the mouth, lean forward with intensely curious sparkling eyes and an amused small smile.', ['吃瓜', '围观', '潜水']),
  reaction('cant-stop-laughing', '真的绷不住了', '绷不住了', '群聊发疯', '😂', 'Bend forward laughing with eyes squeezed into crescents, one small hand covering the mouth and the other holding the belly, cheeks raised and one happy tear at the corner of an eye.', ['大笑', '绷不住', '接梗']),
  reaction('watching-you', '盯——', '看着我', '群聊发疯', '🫵', 'Lean forward slightly with a perfectly straight mouth and steady eyes fixed on the viewer, keep both small hands resting below the chin and shoulders still in an intense silent stare.', ['盯人', '大头', '无字也懂']),
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
  reaction('low-battery', '没电小挂件', '没电了', '日常反应', '🪫', 'Sit slumped with loose arms, feet splayed and half-closed eyes, tip the head forward, keep a tiny exhausted mouth and flattened posture, without any battery icon or lettering.', ['没电', '疲惫', '摆烂']),
  reaction('sleepy', '困成一颗团子', '先睡一步', '日常反应', '😴', 'Lie curled sideways across one small plain floor pillow, tuck both knees comfortably and hug the pillow edge, eyes fully closed and mouth relaxed. Let the hair and limbs settle softly into a cozy sleeping pose.', ['困困', '睡觉', '日常']),
  reaction('hungry', '一口幸福', '开饭！', '日常反应', '🍚', 'Hold a small bowl close to the chest with one hand and a rounded spoon near the mouth with the other, puff one cheek after a bite, eyes smiling with uncomplicated delight.', ['干饭', '开心', '日常'], ['phoebe-hub']),
  reaction('running', '小短腿加急', '来啦来啦', '日常反应', '🏃', 'Hold a single energetic running pose with one knee lifted and opposite arm forward, lean toward the destination with bright determined eyes, use two short speed marks behind the feet.', ['来啦', '跑路', '日常'], ['phoebe-hub']),
];

const companion: Reaction[] = [
  reaction('welcome', '小幅度招手', '你来啦', '陪伴营业', '👋', 'Wave one small open hand beside the face, tilt the head slightly and smile with welcoming crescent eyes, keep the other hand resting naturally in front.', ['欢迎', '回应', '陪伴']),
  reaction('proud-of-you', '你超棒的', '超棒！', '陪伴营业', '⭐', 'Lift one simple star-shaped cushion above the head with both hands, smile proudly at the viewer with shining eyes, and brace the feet apart in a balanced encouraging pose.', ['夸夸', '鼓励', '星星']),
  reaction('victory', '小小胜利结算', '赢啦', '陪伴营业', '🏆', 'Spring into one joyful airborne jump, lift both fists into a triumphant V and bend both legs outward into an open star-like silhouette. Close the eyes in delight, let the original hair move naturally, and add a tiny soft landing shadow beneath the feet.', ['胜利', '开心', '庆祝']),
  reaction('cheer', '加油加油呀', '冲呀', '陪伴营业', '📣', 'Hold one small plain megaphone beside the open smiling mouth, lift the other fist encouragingly, look ahead with energetic bright eyes and an upright supportive pose.', ['加油', '鼓励', '营业']),
  reaction('waiting', '乖乖等你', '等你哦', '陪伴营业', '⏳', 'Sit neatly with both knees together and hands resting on them, look toward the viewer with patient round eyes and a tiny expectant smile, keep the pose calm and compact.', ['等候', '陪伴', '期待']),
  reaction('lurking', '安静冒个泡', '我在哦', '陪伴营业', '🫧', 'Hold the lower half of the face behind a small round plain cushion, show curious eyes above it and two small hands gripping its sides, peek gently with a shy attentive gaze.', ['潜水', '陪伴', '探头']),
  reaction('tea-time', '先喝一口', '吨吨吨', '陪伴营业', '☕', 'Cup a small plain mug with both hands and take one quiet sip, soften the eyes into a contented expression, keep the mug below eye level and shoulders relaxed.', ['喝茶', '围观', '休息']),
  reaction('ready', '认真模式启动', '交给我', '陪伴营业', '✨', 'Pull both small fists close to the chest in a determined ready pose, straighten the shoulders, focus the eyes forward and make a tiny confident smile.', ['认真', '开工', '回应']),
  reaction('sulking', '气成河豚', '不理你了', '陪伴营业', '🐡', 'Turn the upper body slightly away while looking back sideways, puff one cheek and cross both small arms, lift the chin in a cute sulking pose without anger effects.', ['闹别扭', '撒娇', '嘴硬']),
  reaction('blown-away', '可爱暴击到了', '受不了了', '陪伴营业', '💘', 'Lean backward a little with both small hands pressed over the heart, eyes dazzled and cheeks blushing, mouth open in delighted disbelief, add one small heart sparkle.', ['心动', '夸夸', '可爱']),
  reaction('blanket', '被窝结界', '不想动', '陪伴营业', '🛌', 'Lie lengthwise in one soft blanket burrito on a tiny floor cushion, with the recognizable head peeking out at one end and toes barely sticking out at the other. The blanket makes a low horizontal mound; keep sleepy half-lidded eyes and a tiny calm smile.', ['被窝', '摆烂', '困困']),
  reaction('busy', '小手正在忙', '稍等一下', '陪伴营业', '💻', 'Sit sideways on a tiny stool at one low desk with a plain open laptop, both hands reaching to the keyboard and feet dangling below. Turn toward the viewer with focused gentle eyes and one sweat drop while keeping the torso angled toward the desk.', ['忙碌', '等下', '开工']),
];

const interactionReactions: Reaction[] = [
  {
    ...reaction('hug-lunge', '接住这只小可爱', '接住我！', '可爱犯规', '🫂', 'Throw both arms open toward the viewer with the nearer mitten-like hand leading, tilt the torso diagonally into an eager hug and let the elbows connect clearly back to the shoulders. Squeeze the eyes into delighted crescents and open a joyful small mouth, as if the recipient has just appeared.', ['扑抱', '接住', '近大远小'], ['whale-static-2026'], true),
    interactionId: 'approach', intensity: 3, intent: '久等的人出现了，兴奋地扑过去；让接收者下意识想伸手接住。',
  },
  {
    ...reaction('receive-headpat', '摸一下就乖了', '再摸一下', '可爱犯规', '🫳', 'Receive a gentle head pat from one anonymous viewer hand resting softly on the crown. Tip the head into the palm, lower both shoulders and let the character’s own hands hang loosely near the chest. Close the eyes into uneven relaxed arcs with a tiny contented smile; flatten only the hair directly under the palm.', ['摸头', '被安慰', '舒服'], [], true),
    interactionId: 'touch', intensity: 2, intent: '刚才还在嘴硬，被轻轻摸头就放松下来；适合安慰后撒娇求继续。',
  },
  {
    ...reaction('flower-delivery', '整朵喜欢都给你', '这朵给你', '可爱犯规', '🌼', 'Offer one comically oversized simple flower eagerly toward the viewer, holding its short thick stem with both connected hands. Brace the shoulders behind the gift and tilt the smiling face to one side of the petals, keeping both eyes and the mouth visible. Make the single bloom much larger than the small hands; the effort of presenting it is the joke.', ['送花', '大礼物', '直球'], [], true),
    interactionId: 'offer', intensity: 3, intent: '想认真夸夸或表达喜欢，把一大朵心意直接递到对方面前。',
  },
  {
    ...reaction('corner-check', '歪进来查岗', '在想我吗', '可爱犯规', '👀', 'Lean sideways around a small rounded vertical panel, grip its edge with one hand and tip the head almost horizontally into the open space. Raise one curious eyebrow, keep the other eyelid half lowered and make a tiny knowing smile, looking directly at the viewer as if catching them secretly smiling.', ['探头', '查岗', '欠欠的'], [], true),
    interactionId: 'approach', intensity: 2, intent: '安静的群聊里突然探出来，带一点被发现了的俏皮互动，邀请对方回话。',
  },
  {
    ...reaction('cheek-pinch', '脸软嘴还硬', '不许捏啦', '可爱犯规', '🥟', 'Let one anonymous viewer hand gently press and pinch just one rounded cheek between a thumb and finger, shifting the soft cheek inward into a visible squishy fold. Tilt the face away slightly while the eyes glance back sideways, one brow raised and the other stubbornly lowered. Make the tiny mouth an off-center pout; the character’s own two hands rest below the chin.', ['软脸', '嘴硬', '接触变形'], [], true),
    interactionId: 'squish', intensity: 3, intent: '关系熟悉时轻轻逗一下：脸颊很软，表情还在努力抗议，接住打趣。',
  },
  {
    ...reaction('tiny-boss', '小小一只超有理', '我就有理', '可爱犯规', '😤', 'Stand as a deliberately tiny compact figure, plant both little feet firmly apart and place both hands on the waist with elbows sticking out. Lift the chin much too proudly for such a small body, use narrow unimpressed eyes, asymmetrically puff one cheek and hold a stubborn tiny mouth. The joke is the contrast between the miniature body and enormous self-confidence; no prop is needed.', ['小小一只', '理直气壮', '反差'], ['whale-static-2026'], true),
    interactionId: 'comic', intensity: 2, intent: '被吐槽时依然理直气壮；用小小身体和超大自信的反差，让对方笑出来。',
  },
  {
    ...reaction('instant-pancake', '啪叽变成一张', '啪叽', '可爱犯规', '🫠', 'Collapse belly-down into a comically flattened soft pancake-like silhouette, with both arms stretched loosely ahead and both small feet turned outward behind. Rest one cheek on the floor, use calm half-lidded eyes and a tiny straight mouth as though this absurd collapse were perfectly normal. Keep the hair ornaments and outfit color blocks readable within the horizontal shape.', ['啪叽', '摆烂', '一本正经发癫'], [], true),
    interactionId: 'comic', intensity: 3, intent: '累了、被可爱击中或事情太离谱时，直接啪叽倒下，用平静的脸制造笑点。',
  },
  {
    ...reaction('heart-window', '安静贴你一下', '贴一下', '可爱犯规', '💕', 'Rest one soft cheek and the character’s own open palm against an implied clear screen, with a slight cheek flattening at the contact and a naturally connected bent wrist. Close the eyes peacefully, keep a tiny relaxed smile and let the other hand rest on the chest. Use no incoming viewer hand, no glass border, no reflections and no extra props; the gentle shared pause is the whole feeling.', ['贴屏', '安心', '安静陪伴'], [], true),
    interactionId: 'touch', intensity: 1, intent: '不用热闹地说什么，安静靠过来陪一下；适合晚安、安心或缓和气氛。',
  },
];

const bodyInteractionReactions: Reaction[] = [
  {
    ...reaction('viewer-offer', '端着小茶来找你', '喝一口嘛', '全身半身互动', '🍵', 'Stand with both feet close together and knees slightly bent, lean forward earnestly and extend one small plain teacup toward the viewer with both connected hands supporting it. Keep the cup below the neckline and turn the elbows outward so the garment opening remains readable. Lift the chin with an expectant little smile and calm attentive eyes; the tiny careful delivery is the affectionate gesture.', ['全身递茶', '照顾你', '等你接住'], [], true),
    interactionId: 'offer', intensity: 2, intent: '把一杯暖茶小心端过来，等对方接住；用完整小身体和伸出的双臂表达照顾。',
  },
  {
    ...reaction('tiptoe-wave', '踮高一点你就看到我', '这里这里', '全身半身互动', '👋', 'Balance eagerly on both tiptoes, stretch one arm high in a broad open-hand wave and swing the other arm sideways for balance. Lean the torso a little to one side, lift the shoulders with effort and look directly toward the viewer with one delighted closed eye and a bright open smile. Let the lifted heels and uneven arms explain the effort of a tiny person trying to be noticed.', ['全身踮脚', '打招呼', '努力被看见'], [], true),
    interactionId: 'approach', intensity: 3, intent: '在人群里努力踮脚招手，迫不及待让对方看到自己；小个子的认真劲让人想回应。',
  },
  {
    ...reaction('tiny-confident', '这么小也能替你撑场', '我罩你呀', '全身半身互动', '😎', 'Stand as a deliberately tiny figure with feet planted wide, one hand pressed confidently to the waist and the other small arm extended sideways as if shielding an unseen friend behind. Push the shoulders back, tilt the chin proudly upward and hold a narrow-eyed perfectly serious expression with one tiny smug smile. The single joke is a very small body making an extremely confident protective promise; do not add another person or prop.', ['全身护短', '小小自信', '反差搞怪'], ['whale-static-2026'], true),
    interactionId: 'comic', intensity: 2, intent: '嘴上说我罩你，实际只有小小一只；认真护短与体型的反差既好笑又有陪伴感。',
  },
  {
    ...reaction('thoughtful-sulk', '小脑袋还在努力讲理', '让我狡辩', '全身半身互动', '🤨', 'Tilt the torso sideways with one forearm folded across the waist, rest the opposite elbow on it and press one small finger thoughtfully against the temple. Turn the face back toward the viewer with one raised eyebrow, one puffed cheek and a tiny off-center pout, as if carefully inventing a very unconvincing argument. Keep both arms and the waist readable so the lopsided thinking posture carries the joke.', ['半身嘴硬', '歪身思考', '欠欠的'], ['whale-static-2026'], true),
    interactionId: 'observe', intensity: 2, intent: '明明没道理，还在认真构思下一句狡辩；用歪身抱臂和偷看对方的眼神接住打趣。',
  },
];

const personaReactions: Reaction[] = [
  {
    ...reaction('smug-challenge', '小小挑衅一下', '就这？', '嘴硬小剧场', '😏', 'Lean the torso toward the viewer while keeping one hand confidently at the waist, extend the other hand palm-up in a tiny bring-it-on gesture with a connected bent elbow. Lift just one eyebrow, lower the eyelids and curl one corner of the mouth into a deliberately self-satisfied grin. The joke is the very grand challenge delivered by someone with a very compact, almost overbalanced stance; keep the eyes attentive to the viewer rather than angry.', ['半身挑衅', '得意过头', '等你接招'], ['whale-static-2026'], true),
    interactionId: 'approach', intensity: 3, intent: '想让对方回一句“你等着”，得意得有点欠，身体前倾和反手邀战带出亲近的打趣。', textMode: 'generated', captionStyleId: 'comic',
  },
  {
    ...reaction('caught-bluff', '刚放完狠话就破功', '才、才没有！', '嘴硬小剧场', '😳', 'Freeze after a boast with both feet awkwardly planted apart and the torso suddenly leaning back, one hand still stubbornly at the waist while the other palm rises to deny what just happened. Turn the blushing face aside but dart the eyes back toward the viewer, raise one eyebrow too high and make a small wavering mouth. Hold one tiny sweat drop near the temple. The emotional reversal is obvious: the pose is still trying to look confident while the face has already given the bluff away.', ['全身嘴硬', '被戳穿', '反差破功'], ['whale-static-2026'], true),
    interactionId: 'comic', intensity: 3, intent: '对方一句话就戳穿了逞强，嘴上否认、眼神露馅；让人想笑着再逗一句。', textMode: 'generated', captionStyleId: 'handwritten',
  },
  {
    ...reaction('little-victory', '赢一点就要炫耀', '哼哼，拿下！', '嘴硬小剧场', '🏆', 'Hop with both feet barely off the ground, tuck the knees unevenly and swing one bent arm overhead in a tiny triumphant fist while the other hand rests grandly at the waist. Throw the chin up with closed satisfied eyes and a restrained smug smile. Let the swinging hair and one short landing mark support the little hop. The comedy is celebrating a very small success as if it were an enormous victory; use no trophy or podium.', ['全身小跳', '小事大赢', '得意'], [], true),
    interactionId: 'comic', intensity: 2, intent: '只赢了一点点也要得意给你看；短促的小跳和仰头笑形成轻松好接的炫耀。', textMode: 'overlay', captionStyleId: 'bubble',
  },
  {
    ...reaction('quiet-softening', '才不是特地留给你的', '顺手给你', '嘴硬小剧场', '🍰', 'Turn the torso slightly away as if trying to seem unconcerned, then extend a small plate holding one simple slice of cake toward the viewer with one connected hand. Rest the other hand near the waist, angle the face away and let the eyes glance quietly back at the recipient. Keep the lips in a tiny nearly-hidden smile with a faint cheek blush and relaxed shoulders. The gentle contradiction is a carefully offered treat delivered while pretending it is no big deal; the cake stays below the face and never hides the neckline.', ['无字关心', '嘴硬心软', '递甜点'], [], true),
    interactionId: 'offer', intensity: 1, intent: '明明是特地留的，却侧过脸装作顺手；不用解释也看得出藏起来的关心。', textMode: 'none', captionStyleId: 'handwritten',
  },
];

export const personas: PersonaPreset[] = [
  { id: 'adult-bratty', name: '嘴硬小恶魔', description: '爱挑衅、爱炫耀，被反将一军就破功；亲近时悄悄心软。', brief: '成年角色。核心动机是想被在意、想赢一点点，又不愿直接承认。平时爱逞强、轻轻挑衅和炫耀，语气短促，自信得有点欠；被对方接招或戳穿时，会先僵住、移开视线，再红着脸嘴硬。喜剧反差是身体还在摆胜利姿势，表情已经露馅。对熟悉的人会偷偷照顾、递甜点、护短，却装作顺手。互动亲近好玩，避免伤人的贬低；安静时也允许直接关心。' },
  { id: 'warm-soft', name: '软乎乎的认真派', description: '认真照顾你，努力过头的小失误也很可爱。', brief: '成年角色。核心动机是让对方安心、被好好照顾；表达温暖直接，短句柔和，喜欢确认对方有没有接住好意。动作认真而略笨拙，常常双手捧物、努力踮脚、伸手等回应。喜剧反差是为一件小事准备得过分周到，最后自己先累成一小团；失败会短暂停顿，再诚恳重来。可以害羞但不总是泪汪汪，沉默陪伴和轻轻点头同样成立。' },
  { id: 'dry-deadpan', name: '淡定吐槽役', description: '脸上已经下班，身体却还在很认真地犯傻。', brief: '成年角色。核心动机是省点力气、保持从容，但看到朋友需要帮忙仍会出手。话少、停顿准确，语气平静，常用一句短评接住荒诞局面。喜剧反差是半睁的眼和毫无波澜的嘴，配上非常努力、尴尬或离谱的身体姿势；先保持两秒镇定，再轻轻塌下来。用眼神、侧身和道具关系讲笑点，避免每次都换成怒吼或巨大闪亮眼睛。' },
];

const miniSceneReactions: Reaction[] = [
  {
    ...reaction('cookie-alibi', '一本正经地露馅', '才没偷吃', '角色小剧场', '🍪', 'Straighten the torso with exaggerated dignity and raise one index finger beside the shoulder as if making a solemn point. Keep the other hand tucked behind the waist, puff just one cheek, hold the lips tightly together and glance sideways at the viewer with one raised eyebrow. Let the stiff shoulders betray a very unconvincing attempt to act innocent.', ['偷吃露馅', '嘴硬否认', '半身小剧场'], [], true),
    interactionId: 'comic', intensity: 2, intent: '被熟悉的人抓包，仍要郑重其事地否认；让对方一眼看穿，又忍不住想继续逗。', textMode: 'generated', captionStyleId: 'handwritten',
    miniScene: { enabled: true, setup: '偷吃点心刚被对方发现，角色还想装出完全无辜的样子。', reveal: '嘴巴抿得紧紧的，嘴角却粘着几颗明显的饼干屑；背在腰后的手也没藏好那块咬过的饼干。表情越郑重，露馅越好笑。', prop: '一块咬过的简单饼干，加几颗小图也看得清的碎屑。可采用相容的角色专属形状；不加盘子或其他零食。' },
  },
  {
    ...reaction('gift-custodian', '保管着就不想还了', '替你保管', '角色小剧场', '🎁', 'Sit with both feet planted forward and the knees turned slightly outward, curve both connected forearms snugly inward in a possessive protective embrace. Turn one shoulder away from the viewer, lower the chin and close the eyes into two satisfied little arcs, with an almost imperceptible happy smile. The compact seated silhouette looks much too comfortable to let go.', ['护食式保管', '抱紧心意', '全身小剧场'], [], true),
    interactionId: 'comic', intensity: 2, intent: '喜欢得不肯松手，还要给自己找一个冠冕堂皇的理由；适合收到好东西或接住对方的心意。', textMode: 'overlay', captionStyleId: 'bubble',
    miniScene: { enabled: true, setup: '对方想拿回礼物，角色却一本正经地说是在替对方好好保管。', reveal: '双臂把三只软圆的心形礼物抱枕紧紧搂在腿上，手指还在悄悄收紧。满足的小表情暴露了：这位保管员一个也不想还。', prop: '三只小巧柔软的心形礼物抱枕，抱成一团放在领口以下。沿用参考角色配色，最多点缀少量既有饰件图案。' },
  },
  {
    ...reaction('lid-deadlock', '轻轻松松使出全力', '小事一桩', '角色小剧场', '🫙', 'Plant both feet far apart, bend the knees and lean the torso diagonally backward with visibly braced shoulders. Hold both cupped hands in front of the waist and turn them in opposite directions with naturally connected elbows. Squeeze one eye shut, clamp the tiny mouth into a determined line and lift the opposite brow as if still trying to look casual.', ['逞强卡住', '求助前一秒', '完整动作'], [], true),
    interactionId: 'comic', intensity: 3, intent: '明明已经使出全力，还要假装只是热身；适合任务卡住、轻敌后求助或逗对方接手。', textMode: 'generated', captionStyleId: 'comic',
    miniScene: { enabled: true, setup: '角色自信地接下替对方开罐子的任务，还坚持说这件事轻轻松松。', reveal: '上面的手拼命拧罐盖，下面的手稳住罐身，盖子却纹丝不动。脸还想装随意，整个身体早已使出了全力。', prop: '一个朴素的小罐子，双手稳稳握住，拧紧的螺旋盖要大而清楚。不加标签、工具或其他物件。' },
  },
  {
    ...reaction('secret-standby', '等到了还要装偶遇', '只是路过', '角色小剧场', '📖', 'Lean sideways with one shoulder leading, tuck the elbows close to the torso and hold the hands loosely in front of the waist. Turn the face back toward the viewer with suddenly attentive open eyes, lifted inner eyebrows and lips just beginning to smile. Keep the body trying to face away while the expression has already brightened at the viewer’s arrival.', ['装作偶遇', '悄悄等候', '探头小剧场'], [], true),
    interactionId: 'observe', intensity: 2, intent: '等的人终于出现，身体还在装作恰巧经过，眼睛却已经亮了；适合重新上线和久等后的招呼。', textMode: 'overlay', captionStyleId: 'handwritten',
    miniScene: { enabled: true, setup: '其实已经在附近等了好一会儿，却想把见面装成一次偶遇。', reveal: '假装看书，连手里的小书都拿反了，还从书侧偷偷探看对方。封面上醒目的简单图案倒着，目光也一直跟着来的人。', prop: '一本摊开的小书，封面用不含文字、上下不对称的简单图案，让拿反一眼可见。用书本本身形成探头遮挡，不加门框。' },
  },
  {
    ...reaction('umbrella-bias', '把偏心藏在顺路里', '顺路而已', '角色小剧场', '☂️', 'Turn the torso slightly aside and extend one arm toward the viewer’s side with a naturally bent elbow, while the other hand rests low near the waist. Tilt the head the opposite way and look calmly away with a small restrained smile. Let the relaxed shoulders and deliberately off-center arm gesture express quiet care rather than a dramatic declaration.', ['偷偷关心', '偏心照顾', '无字也懂'], [], true),
    interactionId: 'observe', intensity: 1, intent: '嘴上不提照顾，行动却明显偏向对方；适合关心朋友、缓和别扭或安静地说我在。', textMode: 'none', captionStyleId: 'round',
    miniScene: { enabled: true, setup: '明明是专程陪对方走一段，却装作只是碰巧顺路。', reveal: '伞明显偏向看图人的一侧，角色自己的少量头发反而露在伞外。仅用三滴雨点说明这份偏心；原服装保持不变且干燥。', prop: '一把简单撑开的伞，向画外的看图人倾斜，露在伞外的头发旁加三滴独立雨点。不画雨景背景或另一个人。' },
  },
  {
    ...reaction('reserved-cushion', '自己困了也给你留着', '给你留的', '角色小剧场', '🪑', 'Sit with both legs relaxed to one side, lean the torso into a sleepy sideways slump and keep one arm extended protectively along the ground beside the body. Rest the other hand loosely in the lap, lower the head and let the eyes close almost completely, retaining a tiny calm smile. The outstretched arm remains deliberately in place even as the rest of the pose grows drowsy.', ['安静等你', '留一个位置', '小情境'], [], true),
    interactionId: 'observe', intensity: 1, intent: '没有催促，也没有热闹表态，只把身旁的位置一直留给对方；适合晚归、陪伴和邀请坐近一点。', textMode: 'none', captionStyleId: 'handwritten',
    miniScene: { enabled: true, setup: '把身边舒服的位置留给对方，安静等着，也不想催促。', reveal: '自己已经困得点头，一只手却仍护着身旁空坐垫靠近自己的那一边。空着的位置让人看懂：还在等你过来坐。', prop: '角色身旁只放一个小空坐垫，可采用相容的角色专属形状。不加其他座位、家具或房间背景。' },
  },
];

// Recommendations only: saved per-image caption settings always take priority.
const textRecommendations: Record<string, Pick<Reaction, 'textMode' | 'captionStyleId'>> = {
  'thoughtful-sulk': { textMode: 'overlay', captionStyleId: 'handwritten' },
  'tiny-confident': { textMode: 'generated', captionStyleId: 'comic' },
  'cheek-pinch': { textMode: 'none', captionStyleId: 'round' },
  'receive-headpat': { textMode: 'none', captionStyleId: 'round' },
  blanket: { textMode: 'none', captionStyleId: 'handwritten' },
  deadpan: { textMode: 'generated', captionStyleId: 'brush' },
  rolling: { textMode: 'overlay', captionStyleId: 'handwritten' },
  'flower-delivery': { textMode: 'overlay', captionStyleId: 'round' },
};

const originalReactions = [...cute, ...chaos, ...daily, ...companion];
const previousReactions = [...originalReactions, ...interactionReactions];
const v4Reactions = [...previousReactions, ...bodyInteractionReactions];
const v5Reactions = [...v4Reactions, ...personaReactions].map(item => ({ ...item, ...textRecommendations[item.id] }));
const v6Reactions = [...v5Reactions, ...miniSceneReactions];
const playfulReactions: Reaction[] = [
  {
    ...reaction('wink-promise', '秘密只告诉你', '只告诉你', '俏皮暧昧', '😉', 'Give the viewer one deliberate friendly wink, lift one eyebrow and hold one index finger loosely beside the cheek as if sharing a small secret. Keep a closed-mouth playful smile and relaxed shoulders. Let the eye contact and hand gesture carry the entire beat.', ['秘密眨眼', '俏皮接话', '心动'], []),
    compositionId: 'closeup', interactionId: 'observe', intensity: 2, intent: '用一个只有彼此懂的小表情接话，像偷偷分享好消息。', textMode: 'generated', captionStyleId: 'handwritten',
  },
  {
    ...reaction('chin-challenge', '托腮等你接招', '敢接招吗', '俏皮暧昧', '😏', 'Rest the chin lightly on the back of one hand, with the other forearm resting on the near edge of a small plain table. Angle the head, raise one eyebrow and give a tiny confident smile as though inviting the viewer to a playful contest. Show connected wrists and relaxed shoulders, with the tabletop low enough to keep the gesture clear.', ['托腮', '小小挑衅', '等你回应'], []),
    compositionId: 'halfbody', interactionId: 'comic', intensity: 2, intent: '邀请对方接梗或来比一比，小小得意又想等到回应。', textMode: 'overlay', captionStyleId: 'handwritten',
  },
  {
    ...reaction('come-closer', '给你留一步距离', '过来一下', '俏皮暧昧', '🤍', 'Stand upright with both feet clearly visible, turn one shoulder slightly toward the viewer and extend one hand palm-up in a gentle invitation to join the character. Keep the other hand naturally at the side and a bright, slightly bashful smile. Use the complete small-body silhouette and open welcoming gesture to express the invitation.', ['邀请', '靠近一点', '全身'], []),
    compositionId: 'fullbody', interactionId: 'approach', intensity: 1, intent: '想让对方坐近一点或一起做件小事，带一点害羞的邀请。', textMode: 'overlay', captionStyleId: 'bubble',
  },
  {
    ...reaction('hidden-heart', '心意藏不住', '偷偷喜欢', '俏皮暧昧', '💛', 'Stand with the full body visible and both hands behind the back, hiding one small heart-shaped gift that peeks clearly beyond the side of the waist. Tilt the head away while looking back at the viewer with warm eyes and a restrained smile. One toe points shyly inward without twisting the legs; the conspicuous hidden gift reveals the affection.', ['藏礼物', '嘴硬心软', '无字也懂'], []),
    compositionId: 'fullbody', interactionId: 'observe', intensity: 1, intent: '想送出心意却还在犹豫，藏着的小礼物已经替她说了。', textMode: 'none', captionStyleId: 'round',
  },
  {
    ...reaction('whisper-peek', '凑过来讲悄悄话', '听我说', '俏皮暧昧', '🤫', 'Peek from behind one simple vertical edge with the head and one shoulder visible. Cup one naturally connected hand beside the mouth in a familiar whisper gesture, keep the lips in a small ordinary speaking shape and the eyes bright with friendly anticipation. Leave the opposite side mostly empty as the space for the listener.', ['悄悄话', '边缘探头', '小秘密'], []),
    compositionId: 'peek', interactionId: 'observe', intensity: 1, intent: '邀请对方听一个小秘密，用悄悄靠近的动作带出亲近感。', textMode: 'none', captionStyleId: 'handwritten',
  },
  {
    ...reaction('fan-fluster', '嘴硬藏进小扇子', '你犯规了', '俏皮暧昧', '🪭', 'Sit upright with the entire body, both shoes and neatly gathered legs visible. Hold one small plain hand fan just below the nose so the smiling eyes and bright blush remain clear. Peek sideways over the fan with raised inner brows as if a kind compliment has interrupted an attempt to stay composed. Keep the free hand relaxed on the lap and use a compact, ordinary seated pose.', ['被夸脸红', '小扇子', '嘴硬破功'], []),
    compositionId: 'fullbody', interactionId: 'comic', intensity: 2, intent: '收到一句让人心动的夸奖，想装镇定却把脸红藏进小扇子。', textMode: 'generated', captionStyleId: 'comic',
  },
];
const reactions = [...v6Reactions, ...playfulReactions];

export const catalog: Catalog = {
  reactions,
  compositions,
  interactions,
  captionStyles,
  personas,
  styles: [
    { id: 'cream-chibi', name: '奶油精致 Q 版', description: '软软圆脸、细腻眼睛、干净赛璐璐。想可爱，也想一眼认出是你。', color: '#F6D9AB', prompt: 'Refined 2D anime chibi illustration, roughly two-head-tall base design with pose-driven squash and stretch, soft round cheeks, expressive detailed eyes, clean chocolate-brown linework, restrained crisp cel shading, warm cream highlights and soft peach blush. Retain the character’s exact hair, eye and outfit colors; cream is a lighting accent, not a recoloring instruction. Consistent drawing finish across varied body silhouettes, polished compact sticker finish.' },
    { id: 'cheeky-bighead', name: '欠欠大头反应', description: '大脑袋、小短腿、表情放大；全身也能很欠很可爱。', color: '#F3B6BE', prompt: 'Playful 2D big-head reaction sticker, roughly one-and-a-half-head-tall base design with expressive squash and stretch, oversized wide rounded face, tiny compact torso and mitten-like hands, bold clean dark outline, simple flat cel colors, exaggerated brows and mouth, expressive eyes preserving their original color. Soft coral blush as a small accent, mischievous comic timing, original character design. Big-head describes anatomy, not a mandatory close-up camera; framing follows the selected staging.' },
    { id: 'blob-doodle', name: '糯米团子简笔', description: '团成一颗、几笔就懂。动作夸张，缩成聊天小图也清楚。', color: '#C9D7BB', prompt: 'Minimal hand-drawn 2D blob chibi sticker, compact bean-shaped body, very large rounded head, tiny stubby limbs, slightly organic dark brown contour, flat colors with almost no shading, simplified readable eyes and mouth. Preserve the exact hair silhouette, eye color, key accessories and the outfit’s main color blocks. Soft sage accents used only for small decorative marks; high legibility at small chat size, consistent line weight.' },
  ],
  packs: [
    { id: 'interaction12', name: '可爱犯规 12', description: '扑抱、摸头、递大花、软脸和理直气壮的小小一只；强互动穿插安静陪伴，7 种构图。原创编辑精选，非使用量排名。', reactionIds: ['hug-lunge', 'receive-headpat', 'flower-delivery', 'corner-check', 'cheek-pinch', 'tiny-boss', 'instant-pancake', 'heart-window', 'waao', 'rolling', 'blanket', 'thanks'] },
    { id: 'body-interaction12', name: '全身半身互动 12', description: '6 张全身＋6 张半身：踮脚找你、认真递茶、小个子护短和嘴硬思考，让双臂与身体一起传情。原创编辑精选，非热度排名。', reactionIds: ['viewer-offer', 'tiptoe-wave', 'tiny-confident', 'thoughtful-sulk', 'tiny-boss', 'waiting', 'thanks', 'hug-lunge', 'receive-headpat', 'head-tilt', 'shy', 'smug'] },
    { id: 'bratty12', name: '嘴硬小剧场 12', description: '挑衅→破功→小小得意→偷偷心软；4 张原生字、4 张后期字、4 张无字，混搭全身半身与道具。配合性格简要，演出你自己的角色。原创编辑精选。', reactionIds: ['smug-challenge', 'caught-bluff', 'little-victory', 'quiet-softening', 'thoughtful-sulk', 'tiny-confident', 'cheek-pinch', 'receive-headpat', 'blanket', 'deadpan', 'rolling', 'flower-delivery'] },
    { id: 'mini-theater12', name: '角色小剧场 12', description: '6 个可关闭的小处境，穿插 6 张原有可爱：抱紧心意、偷吃露馅、逞强卡住与偷偷关心。用性格和专属物件画出自己的梗。', reactionIds: ['cookie-alibi', 'gift-custodian', 'lid-deadlock', 'secret-standby', 'umbrella-bias', 'reserved-cushion', 'hug-lunge', 'cheek-pinch', 'little-victory', 'quiet-softening', 'waao', 'thoughtful-sulk'] },
    { id: 'mixed12', name: '百变可爱 12', description: '从贴脸到全身，从跑跳到被窝：7 种构图交错，先试这套。编辑精选，非热度排名。', reactionIds: ['waao', 'hug', 'running', 'peek', 'flower', 'low-battery', 'desk-bang', 'blanket', 'victory', 'rolling', 'puffed-cheeks', 'busy'] },
    { id: 'cute12', name: '贴脸可爱 12', description: '偏好大头和软萌互动时选这套，也穿插半身、跪坐和道具。不是使用量排行榜。', reactionIds: cute.map(item => item.id) },
    { id: 'chaos12', name: '群聊发疯 12', description: '眼神死、假哭、拍桌、蠕动；一眼能接住情绪的反应精选。', reactionIds: chaos.map(item => item.id) },
    { id: 'daily24', name: '日常好用 24', description: '在可爱和群聊反应里加入收到、谢谢、干饭、没电；编辑按聊天场景配齐。', reactionIds: ['waao', 'head-tilt', 'peek', 'puffed-cheeks', 'cling', 'hug', 'puppy-eyes', 'flower', 'deadpan', 'fake-cry', 'stunned', 'cant-stop-laughing', ...daily.map(item => item.id)] },
    { id: 'all48', name: '经典反应库 48', description: '保留原有四类和完整配方；每张仍可修改构图、互动与文案。', reactionIds: originalReactions.map(item => item.id) },
    { id: 'all56', name: '全部反应 56', description: '经典 48 张加上 8 张互动新作；自由组合强反应、幽默和安静可爱。建议先试少量。', reactionIds: previousReactions.map(item => item.id) },
    { id: 'all60', name: '全部反应 60', description: '保留前 56 张，再加 4 张半身与全身互动。每张都可自由修改构图、张力和文案。', reactionIds: v4Reactions.map(item => item.id) },
    { id: 'all64', name: '全部反应 64', description: '保留前 60 张，加上挑衅、露馅、小小得意与安静心软；文字路径可逐张调整，角色性格简要也可自由编辑。', reactionIds: v5Reactions.map(item => item.id) },
    { id: 'all70', name: '全部反应 70', description: '完整保留原有 64 张，再加 6 个可开关的小处境；单张选择无字、后期字或随图生成，按角色性格自由组合。', reactionIds: v6Reactions.map(item => item.id) },
    { id: 'playful6', name: '俏皮暧昧 6', description: '秘密眨眼、托腮邀约、藏不住的心意与被夸破功；用眼神、手势和小道具传情，可逐张选择，文字也能关闭。', reactionIds: playfulReactions.map(item => item.id) },
    { id: 'all76', name: '全部反应 76', description: '原有 70 张加上 6 张可选的俏皮暧昧；用日常反应、可爱互动和轻轻的心动自由搭配。', reactionIds: reactions.map(item => item.id) },
  ],
  sources: [
    { id: 'whale-static-2026', title: '2026 小鲸鱼 / DeepSeek 社区静态图案例', url: 'https://www.vgover.com/news/227900', checkedAt: '2026-09-09', evidence: '页面标注 2026-07-31；本次实际查看其中 5 张 JPEG 静态图，包括前景指向角色的手、仰脸叉腰的理直气壮反应、放大伸手与斜头半身，以及同一角色切换主客关系。提炼接触因果、近大远小和预期反转，不复制角色、画面或文字。摸头、软脸等新作是原创设计延伸；这些案例不能证明最高传播量或 QQ 使用排名。' },
    { id: 'phoebe-hub', title: 'Phoebe Hub · 菲比社区表情样本', url: 'https://kato-shoko705.github.io/Phoebe-Hub/', checkedAt: '2026-09-08', evidence: '公开社区库及搜索索引可见 2026 年 6–7 月的跑步、蹦跶、坐姿、被窝、干饭、抱星、捏脸等静态和动态条目。用于策划身体姿态、道具和情境的变化，不仅替换脸部。站内“最热”不能代表 QQ 使用量，页面依赖脚本，未声称核实实时总数或排名。' },
    { id: 'taffy-official', title: '永雏塔菲本人 · 35 张表情包发布', url: 'https://www.bilibili.com/opus/648285615126740998', checkedAt: '2026-09-08', evidence: '2022-04-12 的本人发布页面；本次实际查看了“散步”的完整肢体剪影，以及“嗯打游戏”的手柄、屏幕与半身关系。用于理解同一画风里改变景别、姿态和道具的做法。这是历史视觉参考，不是 2026 热度证据；本项目没有复制或打包原图。' },
    { id: 'taffy-2026', title: '塔菲表情包分享 · 2026 年社区案例', url: 'https://www.bilibili.com/video/BV18zzkBPEwR/', checkedAt: '2026-09-08', evidence: '创作者于 2026-01-24 发布个人收藏分享，说明这类角色表情仍有整理与传播活动。收藏规模属于作者自述，视频互动不等于表情使用频次；未据此给具体反应排名。' },
    { id: 'taffy-community', title: 'TaffySticker · 跨平台表情分享案例', url: 'https://t.me/s/TaffySticker?before=75', checkedAt: '2026-09-08', evidence: '社区明确分享 QQ 动图和可跨平台导入的图片/GIF 资源，用于参考整套导出的使用方式。此为延续性案例，不能视为 2026 新梗或热度证据，也不提供素材再授权。' },
    { id: 'niji-guide', title: 'Niji 7 官方提示词指南', url: 'https://nijijourney.com/blog/niji-7-prompting', checkedAt: '2026-09-08', evidence: '官方 2026-01-26 指南强调具体视觉描述，并展示 --raw 和风格参考用法；本工具整合角色三视图与头部细节的提示词结构，由用户在官方服务出图后导入。' },
    { id: 'niji-style', title: 'Niji 官方 Style Explorer / Creator', url: 'https://nijijourney.com/blog/style-creator', checkedAt: '2026-09-08', evidence: '官方 2026-07-08 更新介绍 Niji 7 风格探索与创建功能；风格参考影响画面风格，不承诺锁定角色身份。' },
  ],
};
