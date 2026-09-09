# 部署、持久化与恢复

工作室需要持续运行的 Node.js 后端，负责 SQLite、素材、供应商密钥、队列和导出。当前是单个拥有者使用的个人工作室，没有多租户账号隔离、配额和权限体系。GitHub Pages 等静态托管不能单独运行完整应用。

## 本机 Node.js

使用 Node.js 22.13 或更新的兼容版本，在仓库根目录执行：

```sh
npm ci
npm run build
npm start
```

默认访问 http://127.0.0.1:4317，数据保存在仓库的 data/。需要自定义配置时复制模板；已有 .env 应保留：

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Linux/macOS 可用 `cp -n .env.example .env`。图片供应商地址、模型和 API 密钥在界面的“模型与连接”保存；.env 只负责应用启动参数，不自动替代供应商设置。开发方式见 [DEVELOPMENT.md](DEVELOPMENT.md)。

## 启动参数

| 环境变量 | 行为 |
| --- | --- |
| HOST | 默认 127.0.0.1；STUDIO_HOST 优先 |
| PORT | 默认 4317、范围 1–65535；STUDIO_PORT 优先 |
| DATA_DIR | 默认包目录下 data/；STUDIO_DATA_DIR 优先 |
| STUDIO_TOKEN | 访问口令；非 loopback 监听必须非空，否则启动退出 |
| STUDIO_ALLOWED_HOSTS | 逗号分隔的额外主机名，不含协议或路径；本机名称始终允许 |
| STUDIO_ALLOWED_ORIGINS | 逗号分隔的完整 Origin，包含协议与需要的端口 |

本机监听接受 127.0.0.1/localhost/::1。改成 0.0.0.0、局域网或其他地址时必须设置口令。公开访问经 HTTPS 反向代理，不把口令写进 URL、README、截图或公开日志。

## Docker Compose

下面命令对应仓库现有 Dockerfile/compose.yaml，仍需在目标机器验证容器运行，不能用 Node.js 构建通过代替容器验证。

准备 .env，在本机填入足够长的随机 STUDIO_TOKEN；Compose 会拒绝空值。为稳定备份卷名，示例固定项目名：

```sh
docker compose -p sticker-studio up --build -d
docker compose -p sticker-studio ps
docker compose -p sticker-studio logs --tail=100 studio
```

打开 http://127.0.0.1:4317 并输入口令。日志可能包含自己的操作信息，分享前应检查。

- 容器内监听 0.0.0.0:4317，因此即使主机仅绑定本机端口也要求口令。
- 主机发布为 127.0.0.1:4317:4317，默认不对局域网或公网开放。
- 服务以 node 用户运行，数据目录为 /app/data。
- Compose 逻辑卷名是 studio-data；上述项目名对应实际卷 sticker-studio_studio-data。
- 重启策略为 unless-stopped；字体随镜像分发，classic 另有 Noto CJK 回退。

```sh
docker compose -p sticker-studio stop studio
docker compose -p sticker-studio start studio
```

普通 docker compose down 保留命名卷；down -v 会删除数据卷，不用于正常维护或升级。

## 反向代理

推荐同一 Origin 提供页面、/api 与 /assets-local，后端仍只暴露到本地端口。在 .env 加入自己的域名，例如：

```dotenv
STUDIO_ALLOWED_HOSTS=studio.example.com
STUDIO_ALLOWED_ORIGINS=https://studio.example.com
```

本机 Node.js 会读取它们。现有 Compose 只显式传入监听、端口、数据路径和口令，**只在 .env 增加白名单不会自动传入容器**。创建 compose.override.yaml：

```yaml
services:
  studio:
    environment:
      STUDIO_ALLOWED_HOSTS: ${STUDIO_ALLOWED_HOSTS}
      STUDIO_ALLOWED_ORIGINS: ${STUDIO_ALLOWED_ORIGINS}
```

然后重新创建服务：

```sh
docker compose -p sticker-studio up -d
```

代理应保留公共 Host，转发整个应用路径，允许足够的响应时间和至少 22 MiB 的 JSON 上传。HTTPS 证书与代理配置由部署者管理。应用没有启用 Express trust proxy；TLS 在代理终止时，不要假定后端会自动设置 Cookie Secure，可在代理层为 studio_session 添加该标记。

Host/Origin 白名单与访问口令独立：未允许的域名返回 403，缺少口令返回 401。不要用关闭检查代替修正代理配置。应用不是面向任意外站的开放 CORS 服务。

## 备份

数据目录包含 studio.sqlite、可能存在的 WAL/SHM 文件和 assets/ 原图。数据库保存项目、设置、任务与请求去重记录，旧任务快照可能仍含供应商密钥。备份整个目录，并单独保存 .env；仅有配方或图片 ZIP 不能恢复完整工作室。

当前没有应用层数据库加密。数据目录、命名卷和备份的访问权限应与密钥相同，备份放在仓库外，不上传源码 Release 或提交 Git。

备份前核对活跃任务并正常停止应用，让数据库和素材保持一致。本机运行可在停止后复制整个 DATA_DIR；不要只复制仍打开的 SQLite 主文件。

以下命令只读挂载命名卷，复制备份到仓库外的上级目录。每次使用新的目标文件名，保留上一份备份：

```sh
docker compose -p sticker-studio stop studio
docker run --name sticker-studio-backup --mount source=sticker-studio_studio-data,target=/data,readonly node:22-bookworm-slim tar -C /data -czf /tmp/studio-data.tgz .
docker cp sticker-studio-backup:/tmp/studio-data.tgz ../studio-data-before-upgrade.tgz
docker rm sticker-studio-backup
docker compose -p sticker-studio start studio
```

若采用不同 Compose 项目名，卷名前缀也不同，先用 docker volume ls 确认。备份失败时保留原卷，检查失败命令后再继续。

## 升级与恢复

升级前记录当前应用版本并备份。取得目标源码版本后执行：

```sh
docker compose -p sticker-studio up --build -d
docker compose -p sticker-studio ps
docker compose -p sticker-studio logs --tail=100 studio
```

命名卷会保留。先确认登录、已有项目和原图正常，再提交新生成任务。本机 Node.js 同样保留数据与 .env，安装锁定依赖、重新构建后启动。

恢复建议使用新卷，避免覆盖唯一一份现存数据。以下示例创建独立的 sticker-studio-restored 项目，先停旧服务释放端口：

```sh
docker compose -p sticker-studio stop studio
docker volume create sticker-studio-restored_studio-data
docker create --name sticker-studio-restore --mount source=sticker-studio-restored_studio-data,target=/data node:22-bookworm-slim sh -c "tar -xzf /tmp/studio-data.tgz -C /data && chown -R node:node /data"
docker cp ../studio-data-before-upgrade.tgz sticker-studio-restore:/tmp/studio-data.tgz
docker start -a sticker-studio-restore
docker rm sticker-studio-restore
docker compose -p sticker-studio-restored up --build -d
```

只在解压成功后启动还原项目，并使用与备份兼容的应用版本及对应 .env。旧卷保留用于核对或回退，删除卷不是恢复步骤。

启动后，普通被中断的生成任务标记为 unknown；被中断且已有远程 ID 的 RunningHub 任务恢复查询而不重复提交，已完成的任务不重跑。尚未提交的 queued 任务会继续执行，因此还原备份可能恢复排队工作，启动前应核对服务商记录和备份时的队列状态。停止本地等待不代表远程 GPU 或计费停止，详见 [API_CONTRACT.md](API_CONTRACT.md)。
