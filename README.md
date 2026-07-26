# GitHub Commit Analyst — Sidebar Tool

macOS 侧边栏工具，悬浮在屏幕右侧，白色透明玻璃态可透视桌面。一键分析 GitHub 提交历史。

![Sidebar Screenshot](https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/sidebar-tool/docs/images/sidebar-overview.png)

## 效果预览

| 整体效果 | 仓库选择 | 分析结果 |
|:---:|:---:|:---:|
| ![overview](https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/sidebar-tool/docs/images/sidebar-overview.png) | ![repo](https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/sidebar-tool/docs/images/sidebar-repos.png) | ![stats](https://raw.githubusercontent.com/programmerloverun/github-commit-analyst/sidebar-tool/docs/images/sidebar-stats.png) |

## 功能特性

- **侧边栏形态** — 380px 宽，屏幕右侧悬浮，始终置顶
- **透明玻璃态** — 白色半透明磨砂玻璃效果，可透过看到桌面
- **自动隐藏** — 失焦后滑出屏幕（仅留 20px 标签），鼠标触碰右边缘自动展开
- **全局快捷键** — `Cmd+Shift+G` 切换显示/隐藏
- **多仓库分析** — 分析名下所有仓库（包括私有仓库和开源贡献）
- **增量缓存** — 首次分析后只拉取新提交，速度提升 10 倍
- **时间范围筛选** — 预设（今年/去年/近 6 个月等）或自定义日期
- **可视化图表** — 每日柱状图、贡献热力图、星空网络图、提交列表
- **自动检测凭证** — 读取 `gh` CLI 的 token 和 git config 的用户名
- **中英文双语** — 根据系统语言自动切换

## 安装

从 [Releases](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.1.0-sidebar) 下载最新 DMG：

1. 下载 `GitHub Commit Analyst-1.0.0-arm64.dmg`
2. 双击安装到 Applications
3. 首次启动后按 `Cmd+Shift+G` 呼出侧边栏

> 由于未签名，首次打开时需要在「系统设置 → 隐私与安全性」中允许打开。

## 使用

1. 侧边栏会自动检测 `gh` CLI 的认证信息
2. 如未检测到，手动输入 GitHub 用户名和 Token（需要 `repo` 权限）
3. 选择要分析的仓库，设置时间范围
4. 点击 **Analyze** 查看提交统计

## 开发

```bash
npm install
npm run dev        # 开发模式热重载
npm run build      # 生产构建
npm run package    # 打包 DMG 安装包
```

## 技术栈

- **Electron 43** — 跨平台桌面框架
- **React 19 + TypeScript** — UI
- **Vite** — 构建工具 (electron-vite)
- **Recharts** — 图表可视化
- **Octokit** — GitHub REST API
- **electron-builder** — 打包分发

## 其他版本

- [VS Code 插件](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.0.0-vscode)
- [IntelliJ IDEA 插件](https://github.com/programmerloverun/github-commit-analyst/releases/tag/v1.0.0-idea)

## License

MIT
