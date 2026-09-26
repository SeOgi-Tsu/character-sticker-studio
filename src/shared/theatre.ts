import type { MotionTemplate } from './video';
import { everydayTheatreTemplates } from './everyday-theatre';
import { comedyTheatreTemplates } from './comedy-theatre';
import { personalityTheatreTemplates } from './personality-theatre';
import { chatReactionTheatreTemplates } from './chat-reactions-theatre';

export const theatreEdition=2;
export const theatreScenes={
  screen:{
    scene:'A miniature character stands on a real walnut desktop facing the viewer, with a softly blurred cozy computer room behind. Keep the desk clear around the character. The viewer is directly on the other side of the image plane.',
    pose:'Both {{grip}}s are raised beside the chin in a comically determined guard, elbows separated, knees flexed, one foot half a step behind the other. The character leans forward with a half-lidded mischievous stare and a small confident grin.',
    framing:'Character-eye-level frontal medium-full shot, both shoes visible, character initially about 75 percent of frame height. Leave space above the head and in front of both fists for a sudden approach toward the lens.',
  },
  rug:{
    scene:'The small character sits on an oatmeal-colored living-room rug in front of a blurred low fabric sofa. A small tissue box stays far behind at image left. Both sides and the foreground are clear rug space.',
    pose:'Sit with legs extended loosely forward, knees relaxed and shoe soles angled toward the viewer; both {{grip}}s rest on the rug beside the legs, completely free. Lean forward in a stubborn huff, shoulders raised, cheeks puffed and glossy eyes looking up at the viewer. No flowing tears yet.',
    framing:'Straight-on character-eye-level full-body shot. The seated character initially occupies about 70 percent of frame height. Leave clear rug on both sides for a side roll and enough foreground for the feet to kick without leaving the frame. Keep costume coverage intact.',
  },
  cookie:{
    scene:'The miniature character stands on a warm café tabletop beside an empty ceramic saucer at image left, holding its only large round chocolate-chip cookie. Preserve the cookie actual size, texture and distinctive chips from the reference. The café behind is softly blurred.',
    pose:'Hold the intact cookie with both {{grip}}s in front of the torso, just below the chin. Keep the face fully visible above it; one foot is half a step ahead of the other, knees loose. The torso angles slightly toward image right while the face peeks mischievously back toward the viewer. No bite or loose crumbs yet.',
    framing:'Character-eye-level full-body shot, both shoes visible. The character initially occupies about 68 percent of frame height. Leave open tabletop toward image right for three quick running steps. The plate and cookie are within reach and have clear contact geometry.',
  },
  taunt:{
    scene:'The miniature character stands on the wide flat armrest of a sage-green fabric sofa. A softly blurred bookshelf and warm wooden wall are behind. Keep the sofa weave, support surface and daylight consistent. The viewer is close to the front of the armrest.',
    pose:'One {{grip}} rests at the hip, while the other is raised beside the cheek in a tiny teasing finger-heart gesture, adapted to the existing limb structure. The character leans slightly toward the lens with a raised chin, half-lidded eyes and a smug sideways smile. Both feet stay securely on the armrest; this is a relaxed teasing stance, not a fighting guard.',
    framing:'Eye-level slightly three-quarter medium-full view with both shoes visible. Leave clear space above and in front of the face for a forward lean and one viewer fingertip. Start far enough away that the later approach visibly changes the facial scale.',
  },
  laugh:{
    scene:'The small character sits diagonally on a blue-gray living-room rug, holding one round mustard-yellow plush cushion upright against the front of the torso and lap. The rug to image right is clear for a side roll. A coffee-table leg and folded cream blanket stay softly blurred behind; there is no tissue box.',
    pose:'Sit upright with the legs together, relaxed toward image left. One {{grip}} covers only the lower edge of a barely suppressed grin, while the other supports the yellow cushion against the body. The shoulders hunch and cheeks puff in an effort not to laugh; the body curls inward and tips slightly toward image right. Keep the face visible and the costume coverage unchanged.',
    framing:'Character-eye-level full-body composition with the held round cushion and both shoes visible. Leave a clear landing area to image right, wider than the character body, for the later side roll onto the rug. Once released, the cushion stays near the starting position as a stable landmark of real body travel.',
  },
  offer:{
    scene:'The miniature character stands front-on on a sunlit picnic café table. A red-and-cream gingham cloth covers image left and leafy garden bokeh fills the background. The character holds one intact heart-shaped strawberry-frosted butter cookie, with pale pink icing and a golden baked edge. No other food or plate is present.',
    pose:'Hold the intact heart cookie in both {{grip}}s just below the chin and in front of the torso, with the face fully visible. Both feet are together and grounded; raise the shoulders and tilt the head into a suspiciously sweet offering smile directed at the viewer. There is no running stance, bite mark or broken piece yet.',
    framing:'Steady frontal character-eye-level full-body view with both shoes visible and free foreground space for the cookie to approach the lens. Keep the face, both grips and heart silhouette clearly readable; the bright garden setting is distinct from an indoor snack-heist scene.',
  },
};
const motion='Use snappy pose-to-pose anime comedy: a brief anticipation, a fast committed action and an abrupt readable reaction. Let the entire body participate through knees, hips, torso and shoulders. Brief drawn squash, stretch and single-frame motion smears may accent speed, returning immediately to the approved silhouette. Do not replace locomotion with a stationary torso wiggle.';
const noPartner='Only the main character is visible; the viewer is implied by direct eye contact with the lens.';
export const originalTheatreTemplates:MotionTemplate[]=[
  {
    id:'theatre-screen-combo', name:'贴脸连环拳，打疼了还嘴硬', category:'屏幕互动', emoji:'✊', caption:'还敢不敢！',
    hook:'先冲上来一通乱拳，最后偷偷甩手，假装一点也不疼。',
    scene:theatreScenes.screen.scene,pose:theatreScenes.screen.pose,
    beats:[
      'Compress the knees and draw both elbows back in one short wind-up, locking eyes with the viewer. The smile turns into comically overconfident determination.',
      'Drive off the rear foot and take one committed step toward the lens. Unleash a rapid alternating burst of about eight left-right straight jabs directly into the image plane, not into the air beside it. Each fist enlarges through strong foreshortening, contacts the same invisible near-lens plane, compresses for one or two frames, then snaps back as the other launches. The hips and shoulders counter-rotate with every jab. Keep the eyes visible between strikes. Finish with one slightly overcommitted jab.',
      'Abruptly stop. The last striking {{grip}} pulls back and shakes twice beside the body as if it stung. The eyes squeeze shut for one exposed little wince, then snap open on realizing the viewer noticed. No bruises or injury.',
      'Hide the sore {{grip}} behind the back, put the other at the hip and lift the chin into a stubborn fake-victory grin. One tiny shake is still visible behind the hip. Hold this obvious attempt to save face; do not return to the original guard.',
    ],
    sound:'A rapid cluster of soft punchy cartoon contact thumps synchronized to the jabs, quick sleeve swishes and one tiny rubbery squeak at the overcommitted hit. No speech, vocalization or music.',
    check:'拳头必须冲向镜头并有回弹；最后甩手嘴硬是笑点。不能做成左右摆手、慢动作或全程遮脸。',loop:false,
    theatre:{edition:2,motive:'想用气势压过群友，却舍不得承认自己吃亏。',trigger:'把观众当成面前正在拌嘴的人。',payoff:'打得最凶的那只手，最后偷偷藏到背后。',labels:['蓄力瞪你','高速打屏幕','手疼露馅','藏手装赢'],ends:[.09,.53,.75,1],camera:'Hold the camera position and lens through the shot, with a very short 1–2 percent recoil on actual fist impacts only; settle immediately between hits. No continuous background wobble, cuts or flashes.',secondaryActor:noPartner,actionStyle:motion,framing:theatreScenes.screen.framing,gif:[.07,.95]},
  },
  {
    id:'theatre-taunt-poke',name:'凑脸笑你，被戳一下就乖',category:'屏幕互动',emoji:'☞',caption:'你干嘛啦',
    hook:'笑得越来越嚣张，你轻轻一戳，她立刻从欠揍变委屈。',scene:theatreScenes.taunt.scene,pose:theatreScenes.taunt.pose,
    beats:[
      'Keep one {{grip}} at the hip, open the raised teasing gesture into two tiny inward beckons, then point toward the viewer and tip the chin upward in a deliberately cheeky challenge.',
      'Take one springy step forward and bend toward the lens. The face grows visibly larger through the actual approach. Break into an exaggerated silent mocking laugh, eyes narrowing into happy curves, shoulders and curled appendages following the forward motion. Hold one confident look directly at the viewer.',
      'One realistic adult viewer hand enters from the near-lens upper-right edge, with only one index finger extended. Gently poke the center of the character forehead once. The face compresses slightly in a drawn squash and the body rocks back one short step; the pointing limb drops in surprise. The finger immediately withdraws along the same path. The poke is light and leaves no injury.',
      'The character immediately stands very straight with both {{grip}}s clasped in front, cheeks puffed and eyes briefly wide. Look away with pink cheeks, then steal one sideways glance back at the viewer. Hold the suddenly well-behaved pose; the face is visibly trying to stay defiant.',
    ],sound:'Light desk footfalls and cloth swishes, one soft rubbery pop synchronized to the forehead poke, then a quiet settling rustle. No speech or vocalization.',check:'只允许一只连着手掌的观众手；“嚣张大脸→突然站好”的反差必须明显。',loop:false,
    theatre:{edition:2,motive:'想招惹你，又特别在意你有没有接招。',trigger:'观众用一根手指轻轻戳破她的气势。',payoff:'前一秒贴脸嘲笑，下一秒双手放好、偷偷看你。',labels:['指着你挑衅','凑到眼前笑','被轻戳一下','立刻站好'],ends:[.1,.46,.65,1],camera:'Keep a steady eye-level camera. The increasing face size comes from the character moving toward the viewer, not a camera zoom. Let the forehead poke read clearly without cutting.',secondaryActor:'One adult viewer hand appears only for the single forehead poke, entering from the camera-side upper-right edge. Keep the forefinger attached to one coherent hand and wrist. No other person or hand appears.',actionStyle:motion,framing:theatreScenes.taunt.framing,gif:[.08,1]},
  },
  {
    id:'theatre-fountain-bawl',name:'嘴硬半秒，突然哭成水龙头',category:'破防大哭',emoji:'💦',caption:'你还不哄我！',
    hook:'嘴上还在逞强，下一拍已经踢腿大哭；中途还要偷看你哄不哄。',scene:theatreScenes.rug.scene,pose:theatreScenes.rug.pose,
    beats:[
      'Lift the chin into one last stubborn pout. The lower lip trembles, brows buckle upward and the glossy eyes squeeze shut in a very short wind-up.',
      'Explode into an enormous open-mouth silent bawl. Two stylized streams of tears arc from the outer corners of the eyes and break into large readable droplets beside the body; keep the face visible between them. Rock the upper body with three emphatic sobbing pulses while alternately kicking the feet forward and thumping the rug with both {{grip}}s. The kicks and torso pulses form one coherent tantrum, not separate floating limbs. Keep the character seated and the rug stable.',
      'Cut all body motion sharply. Shut the mouth, leave one eye closed and open only the other to peek straight at the viewer. The last few already-emitted droplets finish falling while the new streams stop. Hold the shameless checking-for-attention look for a clear beat.',
      'Realize the peek was seen, squeeze both eyes shut and launch one more even larger crying pulse, both feet kicking forward together before settling. End on the big readable crying face with both {{grip}}s grounded, not a neutral smile. For a mechanical character, tears are cartoon display effects rather than fluid leaking from components.',
    ],sound:'A fast cluster of soft rug thumps and exaggerated cartoon water plips, abrupt near-silence during the one-eye peek, then one final thump with a short watery flutter. No voiced crying, speech or music.',check:'大哭要张嘴、踢腿、整个人起伏；偷看时必须突然刹住。泪水不是盖住整张脸的一片水幕。',loop:false,
    theatre:{edition:2,motive:'想被哄，又不肯直接说“我想要你在意”。',trigger:'观众没有立刻哄她，她决定把委屈表演给你看。',payoff:'哭得惊天动地，偷看你的那一秒却能马上停住。',labels:['最后嘴硬','踢腿爆哭','单眼偷看','加倍哭给你看'],ends:[.08,.57,.75,1],camera:'Keep a static low eye-level full-body view so the foot kicks, arm thumps and readable crying face are visible together. The exaggerated movement belongs to the character and tears, not to the whole image.',secondaryActor:noPartner,actionStyle:motion,framing:theatreScenes.rug.framing,gif:[.05,1]},
  },
  {
    id:'theatre-laugh-roll',name:'笑到打滚，被发现秒装乖',category:'笑到失控',emoji:'✦',caption:'我什么都没笑',
    hook:'先笑翻在地上蹬腿，察觉你看过来，立刻端端正正坐好。',scene:theatreScenes.laugh.scene,pose:theatreScenes.laugh.pose,
    beats:[
      'The suppressed grin fails: the mouth corners twitch behind the raised {{grip}}, the cheeks inflate once, and the character trembles with one short effort to hold back laughter.',
      'Break into a huge silent laugh, head tipped back, eyes in delighted curves. Release the yellow cushion forward onto the rug, where it lands once and stays. Clap the now-free {{grip}}s together once, fold forward at the waist, then lean too far to image right and lose seated balance.',
      'Roll onto the right side on the rug in one clear arc, both bent legs kicking twice while one {{grip}} holds the belly and the other braces on the rug. Hair, ears or existing appendages drag and catch up naturally; keep the outfit covering the same areas. The whole body moves across the rug instead of rotating as a rigid sticker.',
      'Suddenly notice the viewer. Freeze for a tiny beat, push off the rug with the grounded limb and pop back upright into a prim seated posture. Place both {{grip}}s neatly on the knees, close the mouth and stare innocently at the viewer while the last curl or appendage is still settling. Hold the fake-serious face.',
    ],sound:'One quick clap, soft fabric and rug scuffs during the roll, two muffled heel taps, then a tiny settling rustle in the sudden stillness. No vocalized laughter or speech.',check:'真的侧倒、蹬腿、撑地坐回；装乖要突然停，不能全程只是肩膀上下抖。',loop:false,
    theatre:{edition:2,motive:'想笑话别人，但还想保住自己优雅无辜的形象。',trigger:'笑到失控后，突然发现观众正看着她。',payoff:'身体刚滚完，脸已经一本正经；头发还没来得及停。',labels:['憋不住笑','笑翻过去','侧躺蹬腿','弹回去装乖'],ends:[.08,.35,.7,1],camera:'Keep a stable full-body view with clear rug on both sides. Do not pan during the short roll; the character must travel within the composition. No camera rotation.',secondaryActor:noPartner,actionStyle:motion,framing:theatreScenes.laugh.framing,gif:[.07,1]},
  },
  {
    id:'theatre-cookie-heist',name:'偷吃就跑，藏了个寂寞',category:'偷吃翻车',emoji:'🍪',caption:'不是我吃的',
    hook:'咬一大口撒腿就跑，发现你盯着她，饼干往背后一藏——还露半块。',scene:theatreScenes.cookie.scene,pose:theatreScenes.cookie.pose,
    beats:[
      'Glance from the viewer to the cookie, lift it briefly and take one conspicuous bite from its upper-left rim. Leave a persistent crescent bite and one visible crumb at a mouth corner. Both grips support the same cookie.',
      'Turn toward image right and bolt across the clear tabletop with three quick, bouncy running steps while hugging the bitten cookie. Feet alternately plant and push off; the body translates about a quarter of the frame width with real acceleration. Keep the stolen cookie solid and the bite mark unchanged.',
      'Catch the viewer staring and brake abruptly with a forward foot plant and a brief backward lean. Transfer the same cookie behind the back into one {{grip}}, but leave its upper bitten edge obviously protruding beside the shoulder. The free limb comes forward.',
      'Stand still with puffed cheeks from the bite and give a tiny unconvincing innocent wave toward the viewer. The mouth-corner crumb remains as evidence. Sneak one look at the cookie sticking out, attempt to tuck it lower, then freeze with an embarrassed smile when it is still visible.',
    ],sound:'One crisp cookie crunch, three quick tabletop footfalls, a short rubbery stopping squeak and a faint fabric rustle. No speech or vocalization.',check:'必须有咬痕、三步位移、急刹、藏不住的证据；抱着饼干原地扭不算完成。',loop:false,
    theatre:{edition:2,motive:'馋又爱面子，第一反应是把证据藏起来。',trigger:'吃完才发现，观众从头到尾都在看。',payoff:'饼干露出半块，嘴边还有渣，她却拼命装无辜。',labels:['偷咬一大口','抱着撒腿跑','急刹藏背后','证据全露着'],ends:[.15,.48,.68,1],camera:'At eye level, begin a short truck right after the first running step, moving about one fifth of the frame width to keep the character inside the shot. Let the plate recede toward image left with correct parallax. Settle the camera before the innocent-wave payoff. The character really runs across the tabletop; do not substitute sliding scenery, frozen feet or a zoom.',secondaryActor:noPartner,actionStyle:motion,framing:theatreScenes.cookie.framing,gif:[0,1]},
  },
  {
    id:'theatre-cookie-bait',name:'骗你张嘴，最后又心软',category:'嘴硬贴贴',emoji:'♡',caption:'才不是让着你',
    hook:'心形饼干递到你嘴边又收回自己咬，得意完却心软，把最大的一块给你。',scene:theatreScenes.offer.scene,pose:theatreScenes.offer.pose,
    beats:[
      'Look directly at the viewer, raise the cookie and tilt the head into a suspiciously sweet inviting smile. Shift weight forward as if about to share.',
      'Extend the same cookie toward the lens until it is visibly close and enlarged by perspective; stop for a tiny tempting beat. Just before the implied viewer can take it, whip both {{arm}}s back and take one cheeky bite. Lift the chin in a delighted got-you grin. Keep the bite mark visible.',
      'Notice the viewer again. The triumphant grin falters, the eyes soften and the character looks briefly guilty. Break one small piece from the same cookie with both {{grip}}s: now there are exactly one large remaining piece and one tiny piece, with matching broken edges.',
      'Hide the tiny piece against the body in one {{grip}} while pushing the much larger remainder toward the viewer with the other. Look away with a stubborn little pout, but keep the offering limb steadily extended. End with the generous offering clearly closer to the lens and the secretly caring expression still readable.',
    ],sound:'A quick sleeve swish, one crisp bite, a small cookie snap and soft movement as the larger piece is offered. No speech, vocalization or music.',check:'“假投喂→真偏心”是转折；始终同一块饼干，掰开以后只有大小两块。',loop:false,
    theatre:{edition:2,motive:'先逗你一下，又忍不住把更好的留给你。',trigger:'看见你真的想吃，恶作剧的小得意变成心虚。',payoff:'嘴上那张脸还在嫌弃，伸给你的却是最大一块。',labels:['装乖邀请','抽回自己吃','心软掰开','大块留给你'],ends:[.1,.45,.68,1],camera:'Keep the camera fixed at character eye level. The cookie grows in the frame only when the arms extend toward the lens. Do not zoom, cut away or obscure the face for the whole gag.',secondaryActor:noPartner,actionStyle:motion,framing:theatreScenes.offer.framing,gif:[.07,1]},
  },
];

export const theatreTemplates:MotionTemplate[]=[...originalTheatreTemplates,...everydayTheatreTemplates,...comedyTheatreTemplates,...personalityTheatreTemplates,...chatReactionTheatreTemplates];
