# 绒绒工坊 · Character Sticker Studio

从一句角色设定或一张立绘，制作属于自己的静态表情包。

独立运行的 WebUI，支持角色与 Q 版母版候选、76 个可编辑反应、批量生成、逐张排字和原始分辨率导出。无需安装 VCP 或 Codex。

## 快速开始

需要 **Node.js 22.13+**，CI 使用 Node.js 22。

```sh
git clone https://github.com/SeOgi-Tsu/character-sticker-studio.git
cd character-sticker-studio
npm ci
npm run build
npm start
```

打开 [http://127.0.0.1:4317](http://127.0.0.1:4317)。首次引导可选择「我有角色图」或「从零描述角色」，也可以跳过后从「使用指南」重新打开。

在「模型与连接」填写你的图片供应商、Base URL、模型与 API Key，才能生成新图片。上传、编辑配方和查看已有结果无需调用图片服务。

## 制作流程

1. **准备角色**：上传立绘／三视图，或描述外观、服装与性格后生成候选。
2. **选定母版**：选择画风并生成 Q 版母版，也可直接导入现成图片。不满意就再生成，旧候选保留。
3. **挑选表情**：选择动作、构图与互动；可填写角色人格、专属小道具或一张图的小剧场。
4. **处理文字**：每张单独选无字、后期排字或随图生成，支持六种字样。
5. **打包带走**：默认保留每张生图的原始宽高，后期文字在原尺寸绘制。需要时再主动选择小尺寸。

原生文字已经画进图片，修改或去除需要重新生成；后期文字可以直接改动或关闭。详细操作见 [使用指南](docs/USER_GUIDE.md)。

## 图片服务

| 方式 | 当前支持 |
| --- | --- |
| OpenAI-compatible Images | 文生图与 multipart 参考图编辑；可配置第三方地址和模型 |
| Gemini generateContent | 文字与内联参考图生成 |
| RunningHub | AI 应用／工作流、参考图节点映射、任务查询与恢复 |
| Niji 7 | 生成立绘／三视图提示词，在官方平台出图后手动导回 |

供应商需要实际支持对应协议和参考图输入。连接方式见 [图片服务配置](docs/PROVIDERS.md)；RunningHub 节点示例见 [RunningHub 指南](docs/RUNNINGHUB.md)。

本机 ComfyUI 直连和动态 GIF 生成尚未实现。当前交付格式为 PNG 和 ZIP。

## 部署与数据

- 默认只监听本机。部署到服务器或供手机访问时，按 [部署指南](docs/DEPLOYMENT.md) 配置工作室口令、HTTPS 与允许的域名。
- 角色、图片、密钥及生成历史保存在服务端数据目录。备份、升级和迁移也见部署指南。
- 这是共享同一数据空间的个人工作室，需要 Node/Docker 后端，不能仅使用 GitHub Pages 静态托管。
- 仓库与源码包不包含私人角色图片、运行数据或真实密钥。

## 文档导航

| 文档 | 适合谁 |
| --- | --- |
| [使用指南](docs/USER_GUIDE.md) | 制作角色、表情与导出成品 |
| [图片服务配置](docs/PROVIDERS.md) | 接入第三方图片 API |
| [RunningHub 指南](docs/RUNNINGHUB.md) | 配置应用／工作流节点 |
| [部署指南](docs/DEPLOYMENT.md) | 安装、备份、升级与自托管 |
| [开发指南](docs/DEVELOPMENT.md) | 理解源码、测试与扩展方式 |
| [API 规范](docs/API_CONTRACT.md) | 接入自己的前端或自动化工具 |
| [设计与来源说明](docs/REFERENCE_NOTES.md) | 维护反应库和参考资料 |

## 开发与贡献

```sh
npm run dev
npm test
npm run build
node scripts/package-source.mjs
```

开发前端端口为 5178，后端默认端口为 4317。测试使用本地 fixture，不消耗真实图片 API 额度。

欢迎参考 [贡献指南](CONTRIBUTING.md) 提交问题和改进。当前版本 **0.9.1**，变化见 [更新记录](CHANGELOG.md)。

## 许可

代码采用 [MIT](LICENSE)。三款随包字体采用各自的 [SIL Open Font License](public/fonts/README.md)。角色、生成图片和第三方素材的授权独立于代码许可证。
