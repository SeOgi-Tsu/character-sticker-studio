# 验证记录

日期：2026-09-08，Windows 11 / Node 22.21.1。

## 已执行

- `npm test`：23 项通过。真实本地 HTTP fixture 验证 OpenAI multipart 参考图请求与 Gemini inlineData 请求；覆盖密钥不外泄、请求去重、状态不明不自动重提、重启恢复、参考图冻结/选择、删除自定义表情后的旧图导出、指定尺寸 PNG、ZIP 内容与中文加字。
- `npm run build`：TypeScript 与 Vite 生产构建通过。
- 通过真实运行的 `/api/assets`、项目保存与外部结果导入接口，导入用户提供的 Margaret 参考图及 4 张实际生成的样图。
- 浏览器桌面与 390×844 手机尺寸检查：页面、样图、选项与底部生成操作显示正常；手机点选编辑后直接进入编辑区，隐藏侧栏不进入焦点顺序。
- 浏览器保存“啊？”文案后，成功提示与有字预览正常；Niji `detail` 显示正/侧/背＋头部/服饰细节，`turnaround` 显示三视图；输入无效 Style Reference 时显示可恢复的字段错误，不崩溃。
- 未配置 API 时，点击样张生成正确打开设置并提示配置；没有创建假成功任务。
- 浏览器成品页展示 4 项真实导入记录。服务端实际导出 Margaret 四图 ZIP，解析得到 4 张原图、4 张 512×512 无字图、4 张有字图、配方与预览联系表；目视检查中文字形和配图。
- 浏览器捕获的 error/warn 日志为空。

## 出图来源

Margaret 样图由 Codex 内置 image_gen 实际生成，以用户参考图为依据，然后通过工坊的外部导入接口载入。不是配置好的第三方 API 测试结果。第一张模拟棋盘格背景候选未作为成品导入；成品为明确标记的白底 PNG。完整生成提示词保存在用户本机忽略的 `data/samples/generation-manifest.json`。

## 仍需真实环境验证

- 用户尚未填写图片供应商密钥，因此未进行用户云端图片 API 的真实付费联调；已验证两种协议的本地契约。
- 本机未提供 Docker 命令，本次没有执行容器构建。Docker/Compose 配置和中文字体安装已提供；Windows/macOS/Linux 跨系统声明属于支持目标，不能当作三平台已全部实测。
- GitHub Actions 已提供 Windows/Ubuntu 测试构建矩阵，尚未发布或触发远程运行。
- 未在 QQ 客户端发送成品，也未申请 QQ 商城上架；尺寸仅是可选聊天导出格式。
- ComfyUI 为适配器设计预留，动态 GIF 为后续阶段。

## 独立源码复现

已把源码 ZIP 解压到新的 `artifacts/verify-source/` 目录。私有目录/密钥检查为 0 项；在新目录执行 `npm ci --offline` 安装 269 个依赖，`npm run build` 成功，`npm test` 23/23 通过。React 与 Express 的模块解析路径均位于新目录自身的 node_modules。

新目录另以 4318 端口启动，首页 HTTP 200；bootstrap 返回 1 个初始项目、48 个反应、0 个资产、0 个任务、无 API Key，确认个人图片与配置没有混入源码包。验证实例已停止；用户主工坊保留在 4317 端口。
