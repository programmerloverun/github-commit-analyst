# GitHub Commit Analyst — IntelliJ IDEA Plugin

在 IntelliJ IDEA 右侧工具窗口中分析 GitHub 提交历史。

## 功能

- **工具窗口集成** — View → Tool Windows → Commit Analyst
- **GitHub 认证** — 用户名 + Personal Access Token
- **多仓库分析** — 分析名下所有仓库（包括私有仓库和开源贡献）
- **后台线程** — API 请求在后台线程执行，不阻塞 UI
- **统计展示** — 提交数、新增/删除行数、仓库分布

## 安装

下载 [最新 ZIP](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.0.0-idea)：

1. IntelliJ IDEA → Settings → Plugins → 齿轮图标 → "Install Plugin from Disk..."
2. 选择 `github-commit-analyst-1.0.0.zip`
3. 重启 IDE

## 兼容性

- IntelliJ IDEA 2024.1+
- 依赖内置 GitHub 插件

## 使用

1. 打开右侧工具窗口：View → Tool Windows → Commit Analyst
2. 输入 GitHub 用户名和 Token（需要 `repo` 权限）
3. 点击 "Fetch Repos" 获取仓库列表
4. 勾选要分析的仓库
5. 点击 "Analyze" 查看提交统计

## 开发

```bash
./gradlew buildPlugin    # 构建插件
```

构建产物位于 `build/distributions/github-commit-analyst-1.0.0.zip`

## 技术栈

- **Kotlin** — 插件语言
- **IntelliJ Platform SDK** — ToolWindowFactory, Swing UI
- **OkHttp + Gson** — HTTP 请求和 JSON 解析
- **Gradle** — 构建系统

## 其他版本

- [macOS 侧边栏工具](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.1.0-sidebar)
- [VS Code 插件](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.0.0-vscode)

## License

MIT
