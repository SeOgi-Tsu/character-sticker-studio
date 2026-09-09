# API 与数据契约

本页描述当前实现。共享字段以 [types.ts](../src/shared/types.ts) 为准，校验和状态转换以 [server/app.ts](../server/app.ts) 为准。开发与部署见 [DEVELOPMENT.md](DEVELOPMENT.md)、[DEPLOYMENT.md](DEPLOYMENT.md)。

## 请求、鉴权与错误

请求体使用 JSON；响应通常为 JSON，图片和整包导出分别为 PNG、ZIP。错误响应为 `{ "error": "可读说明" }`。

| 状态 | 常见含义 |
| --- | --- |
| 400 | 字段、节点、图片或请求格式无效 |
| 401 | 缺少访问口令或口令不正确 |
| 403 | Host、Origin 或跨站请求被拒绝 |
| 404 | 项目、任务、素材或接口不存在 |
| 409 | 请求编号冲突、任务状态不允许操作、没有可导出的图片 |
| 413 | 上传文件或 JSON 请求体过大 |
| 500 | 服务端未分类错误，响应不回显内部异常详情 |

启用 STUDIO_TOKEN 后，除登录外的 /api/* 与 /assets-local/* 都需要鉴权。客户端可发送 Authorization: Bearer 访问口令，或 POST /api/login `{token}` 取得 studio_session Cookie。Cookie 使用 HttpOnly、SameSite=Strict，有效期七天；Secure 取决于服务端识别的请求协议。口令和供应商密钥不能放在 URL 中。

Host 使用主机名白名单；Origin 必须同源或在允许列表内，Sec-Fetch-Site: cross-site 会被拒绝。该机制不是开放 CORS API。空数据库启动时创建通用空白初始项目，已有数据库不因启动而重置。

## 接口清单

| 方法与路径 | 输入 / 输出 |
| --- | --- |
| POST /api/login | `{token}` → `{ok:true}` 及会话 Cookie |
| GET /api/health | `{ok:true}`；启用口令时也需要鉴权 |
| GET /api/bootstrap | `{projects,catalog,settings,assets,jobs}` |
| GET /api/settings | 安全供应商设置及 hasApiKey |
| PUT /api/settings | 保存设置，返回去除密钥的设置 |
| POST /api/projects | 项目可编辑字段 → 新 Project |
| PUT /api/projects/:id | 项目可编辑字段 → 校验后的 Project |
| GET /api/projects/:id/recipe | 可迁移项目配方 |
| POST /api/projects/import | `{version:1,project,...}` → 新项目，移除外部素材 ID |
| POST /api/assets | `{filename,dataUrl,provenance?}` → Asset |
| GET /assets-local/:id.png | 保存后的原始 PNG |
| POST /api/jobs | 创建生成任务 → `{jobs:Job[]}` |
| GET /api/jobs?projectId=... | Job[]；省略项目参数返回全部任务 |
| GET /api/jobs/:id | Job |
| POST /api/jobs/import | 已有素材 → 成功的外部导入任务，不运行图片供应商 |
| POST /api/jobs/:id/cancel | 停止排队或本地等待 → Job |
| POST /api/jobs/:id/retry | `{requestId}` → 新 Job |
| POST /api/jobs/:id/resume | 恢复已知 RunningHub 任务查询 → Job |
| GET /api/jobs/:id/render?size=original&caption=1 | 按当前文字设置输出 PNG |
| GET /api/projects/:id/export?size=original&captions=1 | 项目表情 ZIP |

## 项目与反应字段

Project 包含 id、name、character、styleId、selectedIds、customReactions、overrides、captions、createdAt、updatedAt。ID 和时间由服务端管理，更新请求不能覆盖它们。

顶层未提供字段沿用原值；提供的 character、overrides、captions 或 customReactions 会替换对应对象或数组，不执行深度合并。修改角色应提交完整角色对象，修改单张应保留映射中的其他条目。验证失败不写入项目。

除 Caption.text 单独说明外，文字长度按 JavaScript UTF-16 code units 计算。

| 字段 | 校验及语义 |
| --- | --- |
| 项目 name、角色 name | 各最多 100 |
| 角色 description/identity/outfit/personality | 各最多 4000 |
| 角色 outfitMode? | reference（默认）或 custom |
| 角色 referenceAssetId?/anchorAssetId? | 指向已保存素材；完整角色对象中省略字段可清除选定引用 |
| 角色 memePersona? | 最多 1200，控制表演、动机、语气与反差，不覆盖身份或服装依据 |
| 角色 signatureMotifs? | 最多 400，只装饰动作已经需要的道具，空值不增加道具 |
| selectedIds、生成请求 reactionIds | 原输入数组最多 200 项，去重并保留首次顺序；选中项必须存在 |
| customReactions | 最多 64 个，ID 不得与内置或其他自定义反应重复 |
| 反应 name/caption/category/emoji | 各最多 100；action 最多 3000 |
| 反应 tags | 最多 20 个字符串，每个最多 100 |
| 反应 compositionId?/interactionId? | 必须存在于目录对应列表中 |
| 反应 intensity? | 整数 1、2、3；省略时提示词按 2 处理 |
| 反应 intent? | 最多 160，描述观众感受，不是绘制文字 |
| 反应 textMode?/captionStyleId? | 默认建议；明确保存的 captions[id] 优先 |

可编辑反应字段也支持 overrides[id]。overrides/captions 中不存在的反应 ID 被忽略。可用画风、构图、互动、选集和反应以 bootstrap.catalog 为准，不应按某个选集名称推断全库数量。界面选择选集只改变 selectedIds，不清除用户覆盖项、人物或文字设置。

可选 miniScene 必须是完整对象 `{enabled:boolean,setup:string,reveal:string,prop:string}`；后三项上限分别为 240、240、160，可留空。关闭时保留内容，但不注入小剧场方向；省略或全空也不注入。它表达一个静止瞬间，仍服从镜头、手势、服装和文字模式。

前端 applyProjectChange 在换画风或角色参考图时清除选定母版；相同参考、普通文字编辑、选用母版不会误清除，素材与历史不删除。这是前端工作流规则，直接使用 API 的客户端需自行执行，服务端不会代替客户端使旧母版失效。

## 三种文字模式

Caption 包含 text/enabled/color/stroke/position/fontSize，可选 mode/styleId/rotation。

| 字段 | 契约 |
| --- | --- |
| mode | none、overlay、generated；缺省 overlay |
| enabled | 布尔值；false 或 mode:none 均优先解析为不加字 |
| text | 最多 48 个 Unicode code points，含换行 |
| color/stroke | 六位十六进制色值；校验缺省为 #ffffff、#3b2332 |
| position | top/bottom/left/right；缺省 bottom |
| fontSize | 12–120，缺省 52；以画布短边 512 像素为相对尺寸基准 |
| rotation | 有限数值 −20 至 20；缺省 0 |
| styleId | classic/round/handwritten/brush/bubble/comic |

- none：生成无字原图，本地不叠字，已保存文案仍保留。
- overlay：生成无字原图，下载时按当前字体、颜色、位置排字，原文件不覆盖。
- generated：准确文案与字样方向进入提示词；空白文案在创建任务前拒绝。模型实际拼写和布局需要人工检查。

Job.textMode/generatedText 在创建时冻结，表示实际生成意图；generatedText 不是 OCR 或文字正确性的证明。已有 textMode:generated 的图片永远不叠第二层文字。选择 none、caption=0 或关闭 ZIP 加字，都不会擦除已画进原图的文字；需要用新设置另建生成任务，retry 则保留旧快照。

无文字元数据的旧任务按可后期排字原图兼容。新默认由 defaultCaptionFor(reaction) 提供；明确保存的 Caption 未指定字样时保持 classic。字样预设只改变 styleId/color/stroke/fontSize/rotation，不覆盖当前文字、模式或位置。

## 供应商与引用顺序

provider 支持 openai、gemini、runninghub；基础字段为 baseUrl/model/size/concurrency/apiKey。并发为 1–4、默认 2，调度采用当前并发设置。baseUrl 必须 HTTPS，仅 localhost/127.0.0.1/[::1] 可用 HTTP；不得含账号、密码、查询参数或片段。

| 类型 | 请求行为 |
| --- | --- |
| OpenAI 兼容 | 有参考图用 /images/edits，否则 /images/generations；单参考使用 image，双参考按顺序使用 image[] |
| Gemini 原生 | /models/:model:generateContent；文本后按顺序放 PNG inlineData |
| RunningHub | 站点根地址，不带 API 路径；上传、提交并查询指定应用/工作流 |

OpenAI size 允许 256x256/512x512/1024x1024/1536x1024/1024x1536/1792x1024/1024x1792/auto；Gemini 允许 1K/2K/4K/1024x1024/1536x1024/1024x1536/auto。Gemini 像素尺寸用于推导宽高比，图像档位缺省 1K。这些是供应商请求参数，最终像素尺寸由返回结果决定，与下载 size 不同。

RunningHub 配置包含 kind（app/workflow）、resourceId、promptNode、可选 referenceNode/styleReferenceNode、extraNodes、outputIndex。节点为 `{nodeId,fieldName,fieldValue?}`；资源和节点 ID 是 1–40 位十进制数字字符串，不能转换成 Number。fieldName 为 1–100 位字母、数字、点、下划线或短横线，首字符不能是点或短横线；节点 ID/字段名组合不可重复。extraNodes 最多 32 个，其 fieldValue 必须是字符串、最多 12000；outputIndex 为 0–15。生成任务存在第一参考图时必须配置 referenceNode。model 规范为 app:资源ID 或 workflow:资源ID。

角色图可不带参考，母版生成必须有原始 referenceAssetId。表情任务的顺序为：

1. reference 服装模式且有原始参考：第一张是原始身份/服装图，第二张是不同 ID 的母版，只控制绘制风格。
2. custom 模式或没有原始参考：优先母版，否则原始参考；服装遵从明确的换装依据。
3. RunningHub 未配置第二参考节点时只上传第一张，保持原图优先，不用母版替换它。

不因编辑失败自动降级为无参考文生图，也不自动重试提交。每个任务可以包含上传和查询请求，但只有一次生成提交。

PUT /api/settings 中空白/省略 apiKey 只在供应商及规范化地址未改变时保留旧密钥；改供应商或地址会清除旧密钥，除非同时提供新密钥。clearApiKey:true 显式清除当前配置。读取设置返回 hasApiKey，不返回密钥。

## 任务、去重与恢复

创建请求为 `{projectId,kind,reactionIds?,requestId}`，kind 为 character/anchor/sticker。表情省略 reactionIds 时使用选中列表；其他类型忽略列表。服务端校验配置与素材，冻结提示词、参考 ID、供应商设置和文字模式，返回 queued。成功不会自动把新图设为角色或母版参考，仍需选用。

requestId 在工作室内持久化、跨操作共用。相同编号及签名返回已有任务；同编号但项目、类型、反应列表（含顺序）不同，或用于另一操作，返回 409。任务与编号登记在同一事务内。修改方案后要重新生成，应使用新编号；旧编号不会使旧任务采用新配置。

| 状态 | 含义及操作 |
| --- | --- |
| queued | 等待提交；普通排队任务取消后为 cancelled |
| running | 正在提交或等待；取消只停止本地等待，转为 unknown |
| succeeded | 素材已保存，可选用或下载 |
| failed | 已确定失败，修正后显式重试 |
| unknown | 结果不明，可能已生成或计费，先核对远程记录 |
| cancelled | 普通排队任务已取消，未提交图片服务 |

retry 创建新任务，保留旧提示词、参考和原生文字快照，使用当前供应商配置；不覆盖旧结果。队列中的任务及外部导入不能重试。已知 RunningHub 远程 ID 且尚未成功的任务应使用 resume，不能用 retry 重复提交。

RunningHub 收到 remoteTaskId 后先持久化再查询。resume 仅允许已知远程 ID、状态为 unknown/failed 且未活跃的任务，用保存配置查询原任务。取消这种任务只停止本地查询，不表示远程取消。

重启时，已知远程 ID 的运行中/不明 RunningHub 任务恢复查询；其他被中断的运行任务标记 unknown，不自动重复提交；仍为 queued 的任务继续排队。普通云端等待最长约四分钟，RunningHub 约三十分钟，超时不等于远程失败。

供应商密钥与任务配置快照仅存于服务端 SQLite，不进入 Bootstrap、公开 Job 或配方。修改/清除当前密钥不会追溯清除旧快照；数据目录和备份仍可能含旧密钥，当前没有应用层数据库加密。

## 导入与原尺寸导出

上传接受 PNG/JPEG/WebP/AVIF/GIF 静态首帧，dataUrl 为 base64。上传文件最大 15 MiB、JSON 请求体最大 22 MiB、解码图像最多 4000 万像素；供应商返回图片另有 40 MiB 上限。保存为 PNG，Asset 记录 id/url/filename/width/height/hasAlpha/provenance?；素材 URL 返回这个保存后的文件。

外部任务导入体为 `{projectId,assetId,kind,reactionId?,name?,provenance?,textMode?,generatedText?}`。素材需先上传，表情须有合法 reactionId；provenance 最多 20000，可保存实际提示词。任务为 succeeded、provider/model 为 imported，不运行供应商。表情 textMode 缺省 overlay，其他类型缺省 none；已带字图必须明确传 generated。generatedText 可省略，但仅允许用于 generated，最多 48 code points，不自动 OCR。

下载省略 size 等同 original：保留保存后 PNG 的原始宽高，不缩放、不补方、不放大。无有效后期文字时直接返回原 PNG 字节；有叠字时按短边缩放字号、按真实宽高排版，文字外像素不变。显式 size=128/256/512/1024 输出对应正方形，等比适配并用透明空白补齐；其他值（包括空字符串）拒绝。单图 caption=0 关闭后期文字，省略或其他值使用当前配置。聊天缩略图可请求 512，不改变下载原图。

ZIP 选择每个反应最新的成功表情任务，导出整个项目的成功反应，不仅限当前 selectedIds；没有成功表情则返回 409。

| ZIP 路径 | 内容 |
| --- | --- |
| originals/ | 始终存在，保存后的原始 PNG |
| resized/ | 仅显式数值尺寸；不是保证无字的副本 |
| captioned/ | 仅 captions=1；遵从当前模式和原生字标记 |
| contact-sheet.png | 小尺寸索引，不代表交付图片质量 |
| recipe.json | 配方、导出设置与结果来源 |

配方为 `{version:1,project,references}`，移除项目 ID/时间及角色素材 ID，references 只保留用途和文件名。ZIP 另加 `export:{size,originalResolution}` 和 results；结果包含 name/reactionId/prompt/provider/model/filename/width/height/hasAlpha/textMode/generatedText?，宽高为源图尺寸。配方导入容忍附加元数据，但只创建项目，不重建素材或任务历史，图片须单独导入。

## 浏览器状态

| localStorage Key | 内容 |
| --- | --- |
| character-sticker-studio:guide:v1 | 成功开始或主动关闭引导后写入字符串 1 |
| character-sticker-studio:active-project:v1 | 最后选中、创建或导入的项目 ID |

偏好按 origin 隔离。项目 ID 失效则回到 Bootstrap 第一个项目，再依据已选参考/母版进入角色、母版或表情页面。存储属性访问、读写失败不阻止操作，但偏好可能无法跨刷新保留。

引导只创建独立项目，不生成图片：先保存当前编辑，新角色仅使用输入名字与简介，不继承当前项目的其他资料或素材。失败保留输入、不写已看标志；成功或主动关闭才写入。引导名字最多 80、简介最多 2000，这不替代项目 API 的字段上限。
