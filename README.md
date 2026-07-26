# GitHub Commit Analyst — VS Code Extension

在 VS Code 侧边栏中分析 GitHub 提交历史。通过 GitHub OAuth 一键登录。

## 功能

- **活动栏集成** — 专属视图容器，显示在 VS Code 活动栏
- **GitHub OAuth** — 使用 VS Code 内置 GitHub 认证，无需手动输入 Token
- **多仓库分析** — 分析名下所有仓库（包括私有仓库和开源贡献）
- **增量缓存** — 首次分析后只拉取新提交，后续分析速度大幅提升
- **统计可视化** — 提交数、新增/删除行数、仓库分布

## 安装

下载 [最新 VSIX](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.0.0-vscode)：

```bash
code --install-extension github-commit-analyst-vscode-1.0.0.vsix
```

或在 VS Code 中：`Cmd+Shift+P` → "Extensions: Install from VSIX..." → 选择下载的 `.vsix` 文件

## 使用

1. 点击活动栏的 **GitHub Commit Analyst** 图标
2. 点击 **Sign in with GitHub** 授权
3. 选择要分析的仓库和时间范围
4. 点击 **Analyze** 查看结果

## 开发

```bash
npm install
npm run compile    # 编译 TypeScript
npx @vscode/vsce package  # 打包 vsix
```

## 技术栈

- **VS Code Extension API** — WebviewViewProvider
- **TypeScript** — 扩展后端
- **Octokit** — GitHub REST API
- **Vanilla JS + CSS** — Webview 前端

## 其他版本

- [macOS 侧边栏工具](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.1.0-sidebar)
- [IntelliJ IDEA 插件](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.0.0-idea)

## License

MIT
