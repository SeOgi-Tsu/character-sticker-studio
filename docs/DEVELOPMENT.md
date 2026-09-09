# 开发与贡献

工作室是独立的 Node.js 应用：React/Vite 提供界面，Express 管理项目、队列和素材，SQLite 保存运行数据，Sharp 处理 PNG 与文字。运行不依赖其他仓库。

## 本地开发

使用 Node.js 22.13 或更新的兼容版本，在仓库根目录执行：

```sh
npm ci
npm run dev
```

开发界面为 `http://127.0.0.1:5178`，API 为 `http://127.0.0.1:4317`。Vite 将 `/api` 和 `/assets-local` 代理到 API；修改后端端口时同步 [vite.config.ts](../vite.config.ts)。生产运行与环境变量见 [DEPLOYMENT.md](DEPLOYMENT.md)。

```sh
npm run typecheck
npm test
npm run build
npm start
```

`build` 包含 TypeScript 检查和 Vite 构建；`start` 用 `tsx` 执行服务端并提供 `dist/`。`npm ci` 遵循锁文件；新增依赖时同时更新 `package.json` 和 `package-lock.json`。

## 代码位置

| 位置 | 职责 |
| --- | --- |
| [src/App.tsx](../src/App.tsx) | 项目切换、保存、生成/导入、导航和顶层状态 |
| `src/components/` | 引导、角色/母版候选、表情编辑、设置与导出界面 |
| `src/lib/` | HTTP 客户端、浏览器偏好、角色引用变更和任务操作辅助 |
| [src/shared/types.ts](../src/shared/types.ts) | 前后端共用类型 |
| [src/shared/catalog.ts](../src/shared/catalog.ts) | 反应、画风、构图、互动、选集和人格预设 |
| [src/shared/prompts.ts](../src/shared/prompts.ts) | 角色图、母版、表情及 Niji 提示词 |
| [src/shared/typography.ts](../src/shared/typography.ts) | 文字模式、字体元数据和默认配色 |
| [server/app.ts](../server/app.ts) | 校验、API、队列、去重和恢复 |
| [server/provider.ts](../server/provider.ts) | 三类供应商传输、结果下载与错误分类 |
| [server/images.ts](../server/images.ts) | 素材规范化、排字、原尺寸输出和联系表 |
| [server/store.ts](../server/store.ts) | SQLite JSON 记录与事务 |
| `public/fonts/` | 可分发中文字体、许可证与来源哈希 |
| `tests/` | 临时数据库、图片和本地供应商夹具 |
| `data/` | 默认运行数据，不属于源码，不提交 |

API 字段、替换语义、上限和恢复行为见 [API_CONTRACT.md](API_CONTRACT.md)。增加字段时同步维护共享类型、服务端校验、提示词和界面，避免加入未被实际消费的设置。

## 测试与实际联调

默认测试使用临时数据目录、生成的小图片、注入的 ImageProvider 或本地 HTTP 服务器，不需要真实 API 密钥，也不会调用付费图片模型。`createApp({dataDir,autoStart:false,provider})` 可控制夹具队列；供应商边界的网络/时间依赖也可注入。

测试结束先关闭 HTTP 服务和 SQLite，再清理已确认属于该夹具的临时目录。重点验证用户可观察行为：

- 新角色不继承其他项目资料，改变参考或画风正确使旧母版失效。
- 校验失败不写入数据，配方往返保留用户字段与禁用内容。
- 同一请求编号不重复提交，不明结果不自动重试，已知远程 ID 恢复查询。
- 中文字体实际生效，原生字不重复叠加，原尺寸/矩形比例/透明像素保留。
- 参考图顺序正确，公开响应和导出不含服务端密钥。

实际供应商联调是独立步骤：使用自己有权调用的接口、隔离数据目录和测试图，先确认模型与节点映射，再做小批量验证。真实调用可能计费，不应加入默认测试或 CI，也不要读取个人数据库中的密钥作为测试夹具。

当前 CI 在 Ubuntu 和 Windows 运行安装、测试和构建，没有 Docker 构建任务。Dockerfile 的存在不代表容器已在某个目标环境完成验证。

## 提示词与兼容性

`buildStickerPrompt(character,reaction,style,caption?)`、`buildAnchorPrompt`、`buildCharacterPrompt` 和 `buildNijiPrompt` 都是纯字符串构建。省略表情 Caption 参数维持无字生成；任务 API 先解析项目显式设置或反应建议，再传给构建器。

新增反应使用稳定、唯一的 ID，保证选集引用均能解析。选择选集不得覆盖用户文案、动作或人物资料。目录来自 Bootstrap，不应在组件中硬编码全库数量。

原图控制身份，服装服从 reference/custom 的明确依据。人格和道具标志只影响表演及适配道具，不得引入冲突的换装权限。小剧场关闭或全空时不增加场景方向；它描述一张静止图，不暗中变为多格分镜。

Niji 工坊仅构建提示词并导入官方生成文件，没有自动调用 Niji 的后端接口。修改提示词时检查：未启用新字段的普通方案是否保留原行为，以及无字/原生字指令是否矛盾。

## 字体与原尺寸渲染

round/bubble/comic 使用 ZCOOL KuaiLe，handwritten 使用 Long Cang，brush 使用 Zhi Mang Xing。Sharp Pango 通过绝对 fontfile 路径加载随项目分发的 TTF；仅写 SVG font-family 不能加载它们。浏览器预览通过 @font-face 使用同一批字体。classic 保留系统中文黑体回退，Docker 镜像安装 Noto CJK。

来源、固定上游版本和 SHA256 见 [字体目录](../public/fonts/README.md)。更换字体应同时维护文件、元数据和原始 OFL 通知；字体许可独立于代码许可，不应删除或改写权利声明。

Images.render 默认以保存后的原 PNG 为基准。无有效叠字或已原生带字时直接返回存储字节；有后期文字时按短边的 512 基准计算字号，按实际宽高定位和换行。原尺寸不缩放、不补方、不放大。

原尺寸合成只融合文字 Alpha 非零的像素，避免整图预乘/反预乘使半透明背景颜色舍入。PNG 会重新编码，但文字外像素不因此改变。描边采用保留抗锯齿的圆形最大值扩张，按圆的每一行做滑动最大值，避免大字号下逐像素遍历整个圆面积。显式数值尺寸保留正方形适配输出，联系表始终只是浏览索引。

## 供应商扩展与 ComfyUI

适配器实现 `ImageProvider.generate(GenerationInput): Promise<Buffer>`。输入包含冻结设置、提示词、第一/第二参考、AbortSignal，以及可选远程任务 ID 和持久化回调。适配器必须区分已经提交、结果未知和明确失败，说明如何查询原任务与下载结果；不要在编辑失败后自动删掉参考重试。

**ComfyUI 直连尚未实现。** 当前设置只接受已有三类供应商，不能仅填地址就运行任意 ComfyUI 工作流。未来直连至少需要：

1. API 格式工作流、模型/LoRA/自定义节点清单及版本信息。
2. prompt、原始参考、可选母版、seed、宽高节点的显式映射与最终输出节点。
3. 校验映射、上传、提交、持久化远程 ID、恢复查询和下载输出。

可研究的目标链路是 `/upload/image` → `/prompt` → `/history/:prompt_id` → `/view`，请求字段须按目标 ComfyUI 版本验证；这些不是本项目已提供的端点。取消应区分删除排队项、中止远程工作流和停止本地查询，未知提交不得自动重发。

接入前需扩展共享设置类型、服务端校验、适配器和界面，用夹具证明失败隔离、引用正确、错误节点明确报错和重启恢复，再进行获授权的小规模真实联调。

## 提交与源码包

提交围绕一个可审阅的问题，说明行为变化与验证结果。保留稳定 ID 和兼容字段；不要混入运行素材、数据清理或无关配置变更。

```sh
git status --short
git diff --check
git diff --stat
npm test
npm run build
node scripts/package-source.mjs
```

打包输出为 artifacts/character-sticker-studio-source.zip，按源码目录白名单收集并包含字体和许可证。发布前同时检查 ZIP 与 Git 跟踪文件；删除当前文件不等于从历史移除了它。不要提交 .env、SQLite、密钥、个人图片或运行日志，私有仓库也不应作为凭据备份。.gitignore 和 .dockerignore 不会自动修复已经跟踪的敏感文件。
