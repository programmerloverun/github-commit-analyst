# GitHub Commit Analyst

分析 GitHub 提交历史的工具，提供三种形态：

| 版本 | 说明 | 下载 |
|------|------|------|
| **macOS 侧边栏工具** | 屏幕右侧悬浮，白色透明玻璃态，自动隐藏 | [DMG 下载](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.1.0-sidebar) |
| **VS Code 插件** | 活动栏集成，GitHub OAuth 一键登录 | [VSIX 下载](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.0.0-vscode) |
| **IntelliJ IDEA 插件** | 右侧工具窗口，原生 Swing UI | [ZIP 下载](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.0.0-idea) |

## 效果预览

### macOS 侧边栏工具

<p align="center">
  <img src="https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/main/docs/images/sidebar-overview.png" width="32%" alt="主界面" />
  <img src="https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/main/docs/images/sidebar-repos.png" width="32%" alt="仓库选择" />
  <img src="https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/main/docs/images/sidebar-stats.png" width="32%" alt="分析结果" />
</p>

### VS Code 插件

<p align="center">
  <img src="https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/main/docs/images/vscode-main.png" width="48%" alt="主界面" />
  <img src="https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/main/docs/images/vscode-stats.png" width="48%" alt="分析结果" />
</p>

## 功能

- **多仓库分析** — 分析名下所有仓库（包括私有仓库和开源贡献）
- **增量缓存** — 首次分析后只拉取新提交，后续速度提升 10 倍
- **时间范围筛选** — 预设（今年/去年/近 6 个月等）或自定义日期
- **可视化图表** — 贡献热力图、星空网络图、每日柱状图
- **自动检测凭证** — 读取 `gh` CLI token 和 git config 用户名
- **中英文双语** — 根据系统语言自动切换

## 分支

- **[main](https://github.com/programmerloverun/github-commit-analyst)** — 桌面应用版本
- **[sidebar-tool](https://github.com/programmerloverun/github-commit-analyst/tree/sidebar-tool)** — macOS 侧边栏工具
- **[vscode-plugin](https://github.com/programmerloverun/github-commit-analyst/tree/vscode-plugin)** — VS Code 扩展
- **[idea-plugin](https://github.com/programmerloverun/github-commit-analyst/tree/idea-plugin)** — IntelliJ IDEA 插件

## License

MIT
