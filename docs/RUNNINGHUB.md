# RunningHub 连接与恢复

工坊支持 RunningHub **AI 应用**与 **ComfyUI 工作流**的原生任务协议。也支持第三方提供的 OpenAI Images/Edits 兼容接口与 Gemini generateContent 原生接口；仅兼容聊天接口、返回网页或自定义 JSON 的代理不一定可用。

## 配置步骤

1. 在 RunningHub 选择能实际接收参考图、输出单张图片的应用或工作流，先确认节点与可访问权限。
2. 工坊「模型与连接」选择 RunningHub，站点填写 `https://www.runninghub.ai` 或 `https://www.runninghub.cn`，不附加 `/v1` 或其他路径。
3. 填写自己的 API Key 和应用/工作流 ID。长 ID 必须完整保留为文字，不能转成 JavaScript 数字。
4. 从该资源的「API 调用」示例或工作流 API JSON 取得真实节点 ID 与字段名。设置提示词节点、参考图节点、其他必填节点值；下方数字只说明格式，不能通用复制。
5. 输出索引从 `0` 开始，选择结果列表中的图片。每个任务只保存所选的一张输出；工作流本身如果生成多张，费用和输出数量仍由该工作流决定。
6. 先选一张表情试跑，确认人物、构图、透明背景与所选输出正确，再批量生成。

例如，一个实际工作流可能使用节点 `6` 的 `text` 接收提示词，节点 `12` 的 `image` 接收参考图，节点 `3` 的 `seed` 接收 `42`；另一工作流的这些值可能完全不同。额外节点值以字符串填写，最多 32 个，不能与提示词/参考图节点的同一字段重复。图片宽高、采样器、批量数、模型等由工作流或额外节点控制，工坊通用「尺寸」值不会覆盖它们。

有角色参考图时，工坊会上传实际 PNG，并将平台返回的文件名填入参考图节点。母版和表情缺少参考图节点时，在提交前报错；不会悄悄改成纯文字生成。正确映射只确保输入送到了节点，人物一致性还取决于应用的参考图能力。角色设计、Q 版母版、表情可以分别选择合适的资源，不要求一套工作流包办全部阶段。

## 任务恢复与计费边界

- 生成任务只提交一次，不对提交自动重试。收到远程任务 ID 后立即保存到本地数据库，再开始查询。
- 提交返回 HTTP 408、409、5xx，或平台内部异常、已运行/排队及未知业务错误码时，按「结果不明」处理；只有已知参数、权限等拒绝才标记确定失败。查询响应若携带不同任务 ID，会拒绝取图并保留原 ID。[官方错误码说明](https://www.runninghub.cn/runninghub-api-doc-cn/doc-8287338)
- 查询约每 2.5 秒一次，单次本地等待最多 30 分钟。网络或下载失败保留任务 ID；「恢复查询」继续取回同一任务，不再发起生成。
- 重启后，已有远程 ID 的处理中或状态不明任务自动恢复查询；没有远程 ID 的不明任务保持不明，需先核对 RunningHub 平台记录。
- 「停止等待」只停止本地排队/查询，不向平台宣称已取消运行，不保证停止计费。已有 ID 的任务仍能恢复查询。
- 已有 ID 且尚未成功取回的任务不能点普通重试来再次提交。确实想重新出图，可从表情选项新建任务；这会产生新的平台生成请求。
- 设置在入队时保存快照，恢复沿用原站点、原凭据与节点配置，不会因当前表单切换而把任务 ID 或凭据送到另一个站点。若原密钥已失效、输出索引填错或下载链接过期，需在 RunningHub 平台核对并手动导入结果。

`POST /api/jobs/:id/resume` 的请求体为 `{}`，只接受 `provider=runninghub`、存在 `remoteTaskId` 且状态为 `unknown`/`failed` 的任务；返回原任务，随后进入队列。生成成功后的新一轮重做会创建新任务，并清除原任务 ID。

## 已核实的协议

核验日期：2026-09-09。此版本固定使用以下协议，不把 RunningHub 标准模型专用端点当成应用/工作流端点：

| 操作 | 请求 | 关键字段 |
| --- | --- | --- |
| 上传参考图 | `POST /openapi/v2/media/upload/binary` | Bearer 认证；multipart `file`；接收 `data.fileName` 或英文文档的 `data.filename` |
| 提交 AI 应用 | `POST /task/openapi/ai-app/run` | `apiKey`, `webappId`, `nodeInfoList` |
| 提交工作流 | `POST /task/openapi/create` | `apiKey`, `workflowId`, `nodeInfoList` |
| 查询同一任务 | `POST /openapi/v2/query` | Bearer 认证；`taskId`；解析 `status`, `results[].url`, `outputType` |

官方来源：[文件上传](https://www.runninghub.cn/runninghub-api-doc-cn/api-425749007)、[AI 应用提交](https://www.runninghub.ai/runninghub-api-doc-en/api-425761096)、[工作流提交](https://www.runninghub.cn/runninghub-api-doc-cn/api-425749013)、[工作流集成说明](https://www.runninghub.ai/runninghub-api-doc-en/doc-8287472)、[V2 结果查询](https://www.runninghub.ai/runninghub-api-doc-en/api-425767807)。运行前仍需检查自己资源页给出的权限、节点和版本要求。

密钥只保存在私有服务端设置/任务快照，不包含在 Bootstrap、配方或 ZIP 中。平台错误正文不会直接回显；图片下载不发送 API 密钥，拒绝私网地址与重定向。部署时保持数据目录私有，并按主 README 配置访问口令。

## 验证范围

`tests/runninghub.test.ts` 使用真实本机 HTTP 服务验证上传 multipart、app/workflow 请求体、节点映射、单次提交、持久化顺序、查询中断、手动恢复、重启恢复、取消、无参考节点拒绝、参数校验和凭据隔离。结果下载沿用 `tests/provider.test.ts` 验证过的 DNS 固定与无凭据下载器；RH 测试注入结果字节，不访问云端付费任务。

尚未使用用户凭据完成真实 RunningHub 付费端到端验证。请以首次单张实跑结果确认所选资源适配性。ComfyUI 本机直连仍是预留能力，本节实现的是 RunningHub 上的 ComfyUI 工作流调用。
