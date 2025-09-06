# FAJ - Find A Job

> 一个功能强大的CLI简历生成工具，支持AI内容优化和多格式导出 / A powerful CLI resume builder with AI enhancement and multi-format export

## 简介 / Introduction

FAJ 是一个交互式的命令行工具，帮助开发者快速创建专业的简历。它可以分析你的GitHub项目和本地代码，使用AI来优化简历内容，并支持多种导出格式。

FAJ is an interactive CLI tool that helps developers create professional resumes. It can analyze your GitHub projects and local code, use AI to enhance content, and export to multiple formats.

## 功能特点 / Features

- 🎯 **交互式界面** - 简单的菜单驱动，无需记忆命令
- 🤖 **AI内容优化** - 使用AI润色工作经历和项目描述
- 📊 **项目分析** - 自动分析GitHub仓库或本地代码
- 🌍 **多语言支持** - 支持中文、英文等多种语言
- 📄 **多种导出格式** - HTML、PDF、Markdown、JSON
- 🎓 **多个教育经历** - 支持添加多个学历信息
- 🔐 **加密配置存储** - 配置文件使用AES加密保护敏感信息
- 📝 **专业模板** - 内置专业的简历模板，A4纸张适配

## 快速开始 / Quick Start

### 安装 / Installation

```bash
# 克隆项目 / Clone repository
git clone https://github.com/yourusername/faj.git
cd faj

# 安装依赖 / Install dependencies  
npm install

# 构建项目 / Build project
npm run build

# 链接到全局 / Link globally
npm link
```

### 使用方法 / Usage



#### 交互式模式 / Interactive Mode

运行交互式菜单：
```bash
faj
```

然后按照菜单操作 / Then follow the interactive menu:

```
📄 Your Resume Summary

What would you like to do?
❯ 👀 View Resume      - 查看简历
  ➕ Add Content      - 添加内容（工作经历、项目、教育等）
  ✏️  Edit Content    - 编辑已有内容
  📤 Export Resume    - 导出简历（HTML/PDF/Markdown/JSON）
  🔧 Settings         - 设置（AI配置、个人信息、语言）
  🔄 Sync/Refresh     - 同步刷新数据
```

## 主要功能 / Main Functions

### 1. 添加内容 / Add Content
- **工作经历** - 添加公司、职位、时间、工作内容
- **项目经验** - 分析GitHub或本地项目，自动提取技术栈
- **教育背景** - 支持添加多个学历信息（本科、硕士、博士等）
- **技能** - 按类别管理技术技能

### 2. AI增强 / AI Enhancement  
- 自动润色工作经历描述
- 优化项目介绍
- 支持多种AI提供商：
  - Google Gemini
  - OpenAI GPT
  - Anthropic Claude
  - DeepSeek
  - Azure OpenAI

### 3. 导出简历 / Export Resume
- **HTML** - 精美的网页格式，A4纸张适配，可直接打印
- **Markdown** - 适合GitHub展示
- **JSON** - 结构化数据，便于集成

## 配置管理 / Configuration

### 加密配置存储 / Encrypted Configuration Storage

FAJ 使用加密的配置文件存储敏感信息：

```bash
# 配置文件位置 / Config file location
~/.faj/config.json  # 使用AES加密 / Encrypted with AES
```

### AI配置 / AI Configuration

通过交互式菜单配置AI提供商：

```bash
# 运行FAJ后，选择 Settings > Configure AI
faj interactive
# Then: Settings → Configure AI
```

支持的AI提供商 / Supported AI providers:
- Google Gemini (推荐/Recommended)
- OpenAI GPT
- DeepSeek

### 环境变量支持 / Environment Variables

虽然推荐使用加密配置，但仍支持环境变量以保持向后兼容：

```bash
# 仅用于向后兼容 / For backward compatibility only
export FAJ_AI_PROVIDER=gemini
export FAJ_GEMINI_API_KEY=your-key-here
export FAJ_OPENAI_API_KEY=your-key-here
```

## 数据存储 / Data Storage

所有数据安全保存在本地 / All data is securely stored locally:
- 配置目录 / Config directory: `~/.faj/`
- 加密配置 / Encrypted config: `~/.faj/config.json`
- 简历数据 / Resume data: `~/.faj/data/resume.json`
- 个人资料 / Profile: 存储在加密配置中

## 项目结构 / Project Structure

```
faj/
├── src/           # 源代码 / Source code
├── dist/          # 编译输出 / Build output
├── public/        # 静态资源 / Static resources
│   └── fonts/     # 字体文件 / Font files
├── docs/          # 文档 / Documentation
└── bin/           # 可执行文件 / Executable
```

## 开发 / Development

```bash
# 开发模式 / Development mode
npm run dev

# 构建 / Build
npm run build

# 代码检查 / Lint
npm run lint
```

## 使用示例 / Examples

### 添加工作经历 / Add Work Experience
```bash
faj 
# 选择: Add Content → Work Experience
# 输入公司名称、职位、时间段等信息
# AI会自动帮你优化描述
```

### 分析GitHub项目 / Analyze GitHub Project
```bash
faj 
# 选择: Add Content → Project
# 输入: https://github.com/username/repo
# 自动提取技术栈和项目描述
```

### 导出专业简历 / Export Professional Resume
```bash
faj
# 选择: Export Resume → HTML
# 生成精美的HTML简历，支持直接打印
```

## 常见问题 / FAQ

**Q: 需要付费吗？/ Is it free?**  
A: 工具本身免费，但AI功能需要你自己的API密钥 / The tool is free, but AI features require your own API key

**Q: 支持哪些AI？/ Which AI providers are supported?**  
A: Google Gemini、OpenAI GPT、DeepSeek

**Q: 数据安全吗？/ Is my data safe?**  
A: 所有数据都在本地加密存储，API密钥使用AES加密，不会上传到任何服务器 / All data is encrypted locally, API keys are AES encrypted, nothing is uploaded to servers

**Q: 如何添加多个学历？/ How to add multiple degrees?**  
A: 在交互式菜单中可以添加多个教育经历，支持本科、硕士、博士等 / You can add multiple education entries in interactive mode, supporting bachelor's, master's, PhD, etc.

## License

MIT

---

Made with ❤️ for developers who need a quick resume