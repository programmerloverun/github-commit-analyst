export type Lang = 'zh' | 'en'

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    title: 'GitHub 提交分析',
    subtitle: '跨仓库代码提交趋势分析',
    username: 'GitHub 用户名',
    token: 'GitHub Token（可选，提高 API 限额）',
    tokenPlaceholder: 'ghp_...',
    fetchRepos: '获取仓库列表',
    fetchingRepos: '正在获取仓库列表...',
    detectHint: '凭据自动从 gh CLI 和 git config 检测，也可手动输入。',
    detecting: '正在从 gh CLI / git config 检测凭据...',
    selectAll: '全选',
    deselectAll: '取消全选',
    analyze: '分析 {count} 个仓库',
    analyzing: '正在分析...',
    forceRefresh: '强制全量刷新',
    fetchingStats: '正在从 {count} 个仓库获取提交数据，请耐心等待...',
    reposFound: '个仓库',
    noRepos: '未找到该用户的公开仓库。',
    userNotFound: '用户 "{name}" 未找到。',
    rateLimit: 'API 频率限制。请提供 GitHub Token 或稍后重试。',
    back: '← 切换用户',
    summary: '{username} 的提交记录，涉及 {count} 个仓库',
    totalCommits: '总提交数',
    linesAdded: '新增行数',
    linesDeleted: '删除行数',
    netChange: '净变化',
    dailyChart: '每日代码变更',
    cumulativeChart: '累计代码趋势',
    additions: '新增',
    deletions: '删除',
    totalAdditions: '累计新增',
    totalDeletions: '累计删除',
    analysis: '数据分析',
    analyzedRepos: '分析的仓库数',
    avgLinesPerCommit: '平均每提交行数',
    addDelRatio: '新增/删除比',
    avgCommitsPerDay: '日均提交数',
    dateRange: '日期范围',
    mostActiveDay: '最活跃日',
    peakAddDay: '新增峰值日',
    peakDelDay: '删除峰值日',
    date: '日期',
    commits: '提交',
    allTime: '全部',
    thisYear: '今年',
    lastYear: '去年',
    last6Months: '最近半年',
    last3Months: '最近三月',
    thisMonth: '本月',
    lastMonth: '上月',
    custom: '自定义',
    customRange: '自定义范围',
    startDate: '开始',
    endDate: '结束',
    noData: '没有提交数据。',
    emptyHint: '输入 GitHub 用户名，分析其所有公开仓库的提交历史。',
    fetchingReposFor: '正在获取 {name} 的仓库列表...',
    private: '私有',
    contributed: '开源贡献',
    own: '我的仓库',
    changeUser: '切换用户',
    language: '语言',
    commitLineChanges: '提交行数变化',
    sortBy: '排序',
    sortStarsDesc: 'Star 数 ↓',
    sortStarsAsc: 'Star 数 ↑',
    sortNameAsc: '名称 A-Z',
    sortNameDesc: '名称 Z-A',
    sortUpdatedDesc: '最近更新',
    sortUpdatedAsc: '最早更新',
    networkGraph: '贡献网络图',
    byStars: '按 Star 数',
    byCommits: '按提交次数',
    closerMeansMore: '越近表示越多',
    nodeSize: '节点大小表示相对数量',
    filterRange: '筛选范围',
    from: '从',
    to: '到',
    beginning: '有记录以来',
    now: '现在'
  },
  en: {
    title: 'GitHub Commit Analyst',
    subtitle: 'Cross-repo commit trend analysis',
    username: 'GitHub Username',
    token: 'GitHub Token (optional, for higher rate limits)',
    tokenPlaceholder: 'ghp_...',
    fetchRepos: 'Fetch Repositories',
    fetchingRepos: 'Fetching Repositories...',
    detectHint: 'Credentials auto-detected from gh CLI and git config. Or enter manually.',
    detecting: 'Detecting credentials from gh CLI / git config...',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    analyze: 'Analyze {count} repos',
    analyzing: 'Analyzing...',
    forceRefresh: 'Force Full Refresh',
    fetchingStats: 'Fetching commit stats across {count} repositories...',
    reposFound: 'repositories found',
    noRepos: 'No public repositories found.',
    userNotFound: 'User "{name}" not found.',
    rateLimit: 'API rate limit exceeded. Provide a GitHub token or try later.',
    back: '← Change user',
    summary: 'Commits for {username} across {count} repositories',
    totalCommits: 'Total Commits',
    linesAdded: 'Lines Added',
    linesDeleted: 'Lines Deleted',
    netChange: 'Net Change',
    dailyChart: 'Daily Line Changes',
    cumulativeChart: 'Cumulative Lines',
    additions: 'Additions',
    deletions: 'Deletions',
    totalAdditions: 'Total Additions',
    totalDeletions: 'Total Deletions',
    analysis: 'Analysis',
    analyzedRepos: 'Repositories',
    avgLinesPerCommit: 'Avg Lines/Commit',
    addDelRatio: 'Add/Delete Ratio',
    avgCommitsPerDay: 'Avg Commits/Day',
    dateRange: 'Date Range',
    mostActiveDay: 'Most Active Day',
    peakAddDay: 'Peak Additions Day',
    peakDelDay: 'Peak Deletions Day',
    date: 'Date',
    commits: 'Commits',
    allTime: 'All Time',
    thisYear: 'This Year',
    lastYear: 'Last Year',
    last6Months: 'Last 6 Months',
    last3Months: 'Last 3 Months',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    custom: 'Custom',
    customRange: 'Custom Range',
    startDate: 'Start',
    endDate: 'End',
    noData: 'No commit data found.',
    emptyHint: 'Enter a GitHub username to analyze commit history across all repositories.',
    fetchingReposFor: 'Fetching repositories for {name}...',
    private: 'Private',
    contributed: 'OSS Contrib',
    own: 'My Repos',
    changeUser: 'Change user',
    language: 'Language',
    commitLineChanges: 'Commit Line Changes',
    sortBy: 'Sort',
    sortStarsDesc: 'Stars ↓',
    sortStarsAsc: 'Stars ↑',
    sortNameAsc: 'Name A-Z',
    sortNameDesc: 'Name Z-A',
    sortUpdatedDesc: 'Recent',
    sortUpdatedAsc: 'Oldest',
    networkGraph: 'Contribution Network',
    byStars: 'By Stars',
    byCommits: 'By Commits',
    closerMeansMore: 'Closer = more',
    nodeSize: 'Node size = relative volume',
    filterRange: 'Filter range',
    from: 'from',
    to: 'to',
    beginning: 'beginning',
    now: 'now'
  }
}

export function detectLocale(): Lang {
  try {
    // Use system locale from navigator, not IP (prevents VPN spoofing)
    const lang = navigator.language || ''
    if (lang.startsWith('zh')) return 'zh'
    // Also use timezone as fallback for geo detection
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.startsWith('Asia/')) return 'zh'
  } catch {}
  return 'en'
}

export function t(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  let text = translations[lang]?.[key] || translations.en[key] || key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

export function loadLang(): Lang {
  try {
    const saved = localStorage.getItem('gh-lang')
    if (saved === 'zh' || saved === 'en') return saved
  } catch {}
  return detectLocale()
}

export function saveLang(lang: Lang) {
  localStorage.setItem('gh-lang', lang)
}
