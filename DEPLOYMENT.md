# Railway 部署排障记录

本文记录 MyCode 部署到 Railway 的完整过程与踩坑修复，供后续部署/复现参考。

## 最终部署架构

- **构建**：多阶段 `Dockerfile`（`oven/bun:1` 镜像），纯 Bun 运行时，不依赖 Node
- **平台配置**：`railway.json` 指定 `builder: DOCKERFILE`
- **启动流程**（镜像内置 CMD，`Start Command` 必须留空）：
  1. `db:push` 同步 Prisma schema 到数据库
  2. 启动 server（`bun packages/server/dist/index.js`），监听 `PORT` 环境变量

```
[deploy] syncing database...
Loaded Prisma config from prisma.config.ts.
🚀 Your database is now in sync with your Prisma schema. Done in ...
[deploy] database ready, starting server...
[mycode-server] starting on port 3000
```

## 问题与修复（按出现顺序）

### 1. `db:generate` / postinstall 报错 exit 1

**现象**：`error: script "db:generate" exited with code 1`、`postinstall script from "@mycode/server" exited with 1`

**根因**：Prisma 7 的 `prisma-client` 生成器使用 WASM（`externref`），需要 Node 20+ 或 Bun 运行时；而 `bunx prisma` 默认用本机 Node（本机 Node 16 / Railway 的 Node 18）执行，报 `CompileError: WebAssembly.Module(): invalid value type 'externref'`。

**修复**：所有 prisma 命令强制 Bun 运行时：

```jsonc
// packages/database/package.json
"db:generate": "bunx --bun prisma generate",
"db:push": "bunx --bun prisma db push",
"db:migrate": "bunx --bun prisma migrate deploy"
```

### 2. Nixpacks 报 Node.js 18 EOL

**现象**：`error: Node.js 18.x has reached End-Of-Life and has been removed`（Nix 构建错误）

**根因**：Nixpacks 的 Bun provider 会在环境里附带 Node 18，而 Node 18 已从 nixpkgs 移除。

**修复**：弃用 Nixpacks，改用 Dockerfile（`railway.json` 中 `builder: DOCKERFILE`），全程 `oven/bun` 镜像。

### 3. `File '../../tsconfig.base.json' not found`

**现象**：构建时 `db:generate` 失败

**根因**：Docker 镜像中未复制根目录的 `tsconfig.base.json`，而 `packages/database/tsconfig.json` 通过 `extends` 引用它，Prisma 加载配置时解析失败。

**修复**：构建与运行两个阶段都复制该文件：

```dockerfile
COPY package.json bun.lock tsconfig.base.json ./
```

### 4. `db:push` 报 `unknown or unexpected option: --skip-generate`

**现象**：`db:push` 打印 usage 帮助后 exit 1

**根因**：Prisma 7 已移除 `db push` 的 `--skip-generate` 参数（runtime engine 已移除，无需跳过生成）。

**修复**：移除该参数。

### 5. OAuth 登录报 `redirect_uri does not match`

**现象**：CLI 登录时 Clerk 返回 `invalid_request` / redirect_uri 不匹配

**根因**：
1. 本地 `.env` 的 `API_URL` 漏写 `https://` 前缀，导致 redirect_uri 畸形
2. Clerk 的 OAuth Application 未预注册 `https://<domain>/auth/callback`

**修复**：
- `.env` 中补全 `API_URL=https://mycodeserver-production.up.railway.app`
- Clerk Dashboard → OAuth Applications → 在 Redirect URLs 注册 `https://<domain>/auth/callback`

### 6. 所有接口报 500 `Internal server error`

**现象**：新建会话、会话列表、发消息全部 500，日志提示 `The table 'public.Session' does not exist`

**根因**：`mycode/server` 服务的 **Start Command 被误配为构建/开发命令**（如 `bun run --filter=@mycode/server build`），容器内从未执行 `db:push`，数据库没有建表。

**修复**：清空 Start Command，由 Dockerfile 内置 CMD 负责 `db:push && server`；并为 server 增加启动日志（`[mycode-server] starting on port ...`）便于确认。

### 7. `/health` 超时 / 502，无运行日志

**现象**：部署状态绿灯但所有请求 502，Runtime Logs 空白

**根因**：同上——Start Command 是构建命令，构建完成进程即退出，容器内没有监听端口的进程。Railway 判定"启动成功"（进程 exit 0），但无服务可响应。

**修复**：与问题 6 相同；增加 `[deploy]` 标记日志，启动链路上任何一步失败都能在日志中定位。

## 部署清单（正确姿势）

1. 项目根目录包含 `Dockerfile`、`.dockerignore`、`railway.json`（`builder: DOCKERFILE`）
2. Railway 添加 **Postgres 插件**，并在 server 服务 **Reference** 其 `DATABASE_URL`
3. server 服务 Variables 配置：`ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` / `GLM_API_KEY` / `OPENAI_API_KEY`（至少一个）、Clerk 密钥组
4. **Start Command 留空**（使用镜像内置 CMD）
5. Clerk OAuth Application 注册生产域名回调：`https://<domain>/auth/callback`
6. 本地 `.env`：`API_URL=https://<domain>`（带 `https://` 前缀）

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `Dockerfile` | 多阶段构建（bun install → db:generate → server build → 运行时） |
| `.dockerignore` | 排除 `node_modules`、`packages/*/generated` 等，缩小构建上下文 |
| `railway.json` | 指定 Dockerfile 构建器 |
| `packages/database/prisma.config.ts` | Prisma 配置；`DATABASE_URL` 缺失时回退占位符，保证构建期 `generate` 可运行 |
