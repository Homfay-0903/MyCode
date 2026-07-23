<div align="center">

<br />
<br />

<h1>MyCode</h1>

<p>基于终端的AI编程助手</p>

<p>在本地项目中规划、聊天和构建，采用Bun驱动的CLI、Hono API、Prisma ORM、Clerk认证和AI SDK流式传输。</p>

<br />

</div>

<br />

## 功能特性

- **终端AI聊天** - 在终端中直接运行AI编程助手，采用OpenTUI和React界面
- **规划和构建模式** - 使用只读规划工具或启用写入、编辑和Shell执行工具进行实现
- **流式响应** - 通过AI SDK流式传输模型输出，并持久化会话历史
- **本地项目工具** - 在当前项目内读取文件、列出目录、glob搜索、grep搜索、写入文件、编辑文件和运行Shell命令
- **多模型支持** - 支持Anthropic、OpenAI、GLM和DeepSeek聊天模型
- **持久化会话** - 通过Prisma在Postgres中存储认证用户会话和消息
- **Clerk OAuth** - 通过基于浏览器的Clerk OAuth流程认证CLI

## 环境要求

- [Bun](https://bun.sh) 运行时
- PostgreSQL数据库（如Neon）
- [Clerk](https://clerk.com) OAuth应用配置
- AI模型API密钥（GLM或DeepSeek）

## 快速开始

### 1. 克隆和安装

```bash
git clone
cd mycode
bun install
```

### 2. 配置环境变量

复制示例配置文件：

```bash
cp .env.example .env
```

填写必需的环境变量：

```bash
# 服务器配置
API_URL=http://localhost:3000

# 数据库
DATABASE_URL=<your-postgresql-connection-string>

# AI模型API密钥（至少配置一个）
GLM_API_KEY=<your-glm-api-key>
DEEPSEEK_API_KEY=<your-deepseek-api-key>

# Clerk认证
CLERK_FRONTEND_API=<clerk-frontend-api-url>
CLERK_OAUTH_CLIENT_ID=<oauth-client-id>
CLERK_OAUTH_CLIENT_SECRET=<oauth-client-secret>
CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
CLERK_SECRET_KEY=<clerk-secret-key>
JWT_SECRET=jwt-secret
```

### 3. 生成数据库客户端

```bash
bun run --cwd packages/database db:generate
```

### 4. 启动服务器

```bash
bun run dev:server
```

API运行在 `http://localhost:3000`

### 5. 启动CLI

在另一个终端中：

```bash
bun run dev:cli
```

构建并链接本地CLI二进制文件：

```bash
bun run link:cli
mycode
```

## 项目结构

```
packages/
├── cli/                    # OpenTUI + React终端客户端
│   ├── bin/                # mycode可执行文件
│   └── src/
│       ├── components/     # 终端UI组件、对话框、消息
│       ├── hooks/          # 聊天和UI钩子
│       ├── layouts/        # 根终端布局
│       ├── lib/            # API客户端、认证、OAuth、本地工具执行
│       ├── providers/      # 对话框、键盘、提示、主题、toast提供者
│       └── screens/        # 首页、新会话、会话屏幕
├── database/               # Prisma模式、生成的客户端、数据库导出
├── server/                 # Hono API，用于认证、计费、会话和聊天
└── shared/                 # 共享的Zod模式、AI工具契约和模型定义
```

## 可用命令

| 命令                                          | 说明                         |
| --------------------------------------------- | ---------------------------- |
| `bun run dev:cli`                             | 启动CLI（监听模式）          |
| `bun run dev:server`                          | 启动Hono服务器（热重载）     |
| `bun run build:cli`                           | 构建CLI包                    |
| `bun run link:cli`                            | 构建并链接`mycode`可执行文件 |
| `bun run --cwd packages/database db:generate` | 生成Prisma客户端             |

## 包说明

| 包                 | 说明                                |
| ------------------ | ----------------------------------- |
| `@mycode/cli`      | 终端UI和客户端工具执行              |
| `@mycode/server`   | Hono API、AI流式传输、认证检查      |
| `@mycode/database` | Prisma客户端和数据库模式            |
| `@mycode/shared`   | 共享的Zod模式、AI工具契约和模型定义 |
