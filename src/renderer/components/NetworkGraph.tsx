import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { RepoInfo, RepoStats } from '../types'
import { type Lang, t } from '../i18n'

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3572a5',
  Go: '#00add8', Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', Swift: '#f05138', Kotlin: '#a97bff',
  PHP: '#4f5d95', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
  Vue: '#41b883', Scala: '#c22d40', Dart: '#00b4ab',
  default: '#58a6ff'
}

interface NodeData {
  fullName: string; name: string; owner: string
  commits: number; stars: number; language: string
}

interface PositionedNode extends NodeData {
  x: number; y: number; r: number; color: string
}

interface Props {
  repoStats: RepoStats[]; repos: RepoInfo[]; username: string; lang: Lang
}

type MetricMode = 'stars' | 'commits'

const SVG_SIZE = 640
const CX = 320
const CY = 320
const CENTER_R = 46

export default function NetworkGraph({ repoStats, repos, username, lang }: Props) {
  const [metric, setMetric] = useState<MetricMode>('commits')
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: PositionedNode } | null>(null)
  const [positions, setPositions] = useState<PositionedNode[]>([])
  const [animationPhase, setAnimationPhase] = useState(0)
  const animFrame = useRef<number>(0)

  // Build merged node data
  const nodes = useMemo(() => {
    const repoMap = new Map(repos.map(r => [r.fullName, r]))
    const merged: NodeData[] = []
    for (const rs of repoStats) {
      const repo = repoMap.get(rs.fullName)
      if (!repo || repo.stars <= 0) continue
      merged.push({
        fullName: rs.fullName, name: repo.name, owner: repo.owner,
        commits: rs.commits, stars: repo.stars, language: repo.language
      })
    }
    return merged
  }, [repoStats, repos])

  // Compute organic layout positions
  useEffect(() => {
    if (nodes.length === 0) return
    const m = (n: NodeData) => metric === 'commits' ? n.commits : n.stars
    const vals = nodes.map(m)
    const maxV = Math.max(...vals, 1)
    const minV = Math.min(...vals, 1)
    const logMax = Math.log(maxV + 1)
    const logMin = Math.log(minV + 1)

    const norm = (v: number) => maxV === minV ? 0.5 : (Math.log(v + 1) - logMin) / (logMax - logMin)

    // Sort to place large nodes first (they anchor the layout)
    const sorted = [...nodes].sort((a, b) => m(b) - m(a))
    const placed: PositionedNode[] = []
    const innerR = 100, outerR = 260

    sorted.forEach((node, i) => {
      const t = norm(m(node))
      // Higher metric → smaller radius (closer)
      const targetR = outerR - t * (outerR - innerR)
      const size = 6 + t * 18
      const color = LANG_COLORS[node.language] || LANG_COLORS.default

      // Find angle that minimizes overlap with already-placed nodes
      let bestAngle = (2 * Math.PI * i) / sorted.length
      let bestOverlap = Infinity

      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = attempt === 0
          ? (2 * Math.PI * i) / sorted.length - Math.PI / 2
          : ((2 * Math.PI * i) / sorted.length + (Math.random() * 0.6 - 0.3)) - Math.PI / 2
        const testX = CX + targetR * Math.cos(angle)
        const testY = CY + targetR * Math.sin(angle)
        let maxOverlap = 0
        for (const p of placed) {
          const dx = testX - p.x
          const dy = testY - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const overlap = (size + p.r + 14) - dist
          if (overlap > maxOverlap) maxOverlap = overlap
        }
        if (maxOverlap < bestOverlap) {
          bestOverlap = maxOverlap
          bestAngle = angle
        }
        if (maxOverlap <= 0) break
      }

      placed.push({
        ...node,
        x: CX + targetR * Math.cos(bestAngle),
        y: CY + targetR * Math.sin(bestAngle),
        r: size,
        color
      })
    })

    setPositions(placed)
  }, [nodes, metric])

  // Intro animation
  useEffect(() => {
    let start: number | null = null
    const animate = (ts: number) => {
      if (!start) start = ts
      setAnimationPhase(Math.min((ts - start) / 800, 1))
      if (ts - start < 800) animFrame.current = requestAnimationFrame(animate)
    }
    animFrame.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrame.current)
  }, [positions])

  // Generate background particles
  const particles = useMemo(() => {
    const pts: { x: number; y: number; r: number; opacity: number; delay: number }[] = []
    for (let i = 0; i < 80; i++) {
      const seed = (i * 7919 + 137)
      const angle = ((seed % 6283) / 1000)
      const dist = 80 + (seed % 240)
      pts.push({
        x: CX + dist * Math.cos(angle),
        y: CY + dist * Math.sin(angle),
        r: 0.5 + (seed % 20) * 0.1,
        opacity: 0.1 + (seed % 5) * 0.04,
        delay: (seed % 3000) / 1000
      })
    }
    return pts
  }, [])

  const handleNodeHover = useCallback((node: PositionedNode | null, e?: React.MouseEvent) => {
    if (!node || !e) {
      setHoveredNode(null)
      setTooltip(null)
      return
    }
    setHoveredNode(node.fullName)
    const svg = (e.currentTarget as SVGElement).closest('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    setTooltip({
      x: (node.x / vb.width) * rect.width + rect.left,
      y: (node.y / vb.height) * rect.height + rect.top,
      node: { ...node, color: node.color }
    })
  }, [])

  if (nodes.length === 0) return null

  const maxMetric = Math.max(...nodes.map(n => metric === 'commits' ? n.commits : n.stars), 1)

  return (
    <div className="chart-container" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3>{t('networkGraph', lang)}</h3>
        <div className="lang-switch">
          <button className={`lang-btn ${metric === 'commits' ? 'active' : ''}`}
            onClick={() => setMetric('commits')}>{t('byCommits', lang)}</button>
          <button className={`lang-btn ${metric === 'stars' ? 'active' : ''}`}
            onClick={() => setMetric('stars')}>{t('byStars', lang)}</button>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          style={{ width: '100%', maxHeight: 560, cursor: 'default' }}>

          <defs>
            {/* Glow filters */}
            <filter id="kgGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="kgGlowStrong" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Center aurora gradients */}
            <radialGradient id="kgAura1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1f6feb" stopOpacity={0.12} />
              <stop offset="70%" stopColor="#1f6feb" stopOpacity={0.02} />
              <stop offset="100%" stopColor="#1f6feb" stopOpacity={0} />
            </radialGradient>
            <radialGradient id="kgAura2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.18} />
              <stop offset="50%" stopColor="#58a6ff" stopOpacity={0.04} />
              <stop offset="100%" stopColor="#58a6ff" stopOpacity={0} />
            </radialGradient>

            {/* Line gradients - created per edge for color transitions */}
            {positions.map((node, i) => (
              <linearGradient key={`ge-${i}`} id={`kgEdge-${i}`} x1="0%" y1="0%" x2="100%" y2="0"
                gradientUnits="userSpaceOnUse"
                gradientTransform={`rotate(${Math.atan2(node.y - CY, node.x - CX) * 180 / Math.PI} ${CX} ${CY})`}>
                <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.25} />
                <stop offset="100%" stopColor={node.color} stopOpacity={0.45} />
              </linearGradient>
            ))}
            {positions.map((node, i) => (
              <radialGradient key={`gn-${i}`} id={`kgNodeGlow-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={node.color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={node.color} stopOpacity={0} />
              </radialGradient>
            ))}

            <clipPath id="kgAvatarClip">
              <circle cx={CX} cy={CY} r={CENTER_R} />
            </clipPath>
          </defs>

          {/* Dark background */}
          <rect width={SVG_SIZE} height={SVG_SIZE} fill="transparent" />

          {/* Center aurora */}
          <circle cx={CX} cy={CY} r={200} fill="url(#kgAura1)" />
          <circle cx={CX} cy={CY} r={100} fill="url(#kgAura2)" />

          {/* Decorative orbit rings */}
          <circle cx={CX} cy={CY} r={175} fill="none" stroke="#1f6feb" strokeWidth={0.3}
            strokeDasharray="2 8" opacity={0.15} />
          <circle cx={CX} cy={CY} r={220} fill="none" stroke="#30363d" strokeWidth={0.3}
            strokeDasharray="1 6" opacity={0.12} />

          {/* Background particles */}
          {particles.map((p, i) => (
            <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={p.r}
              fill="#8b949e" opacity={p.opacity * animationPhase}>
              <animate attributeName="opacity"
                values={`${p.opacity * 0.5};${p.opacity * 1.5};${p.opacity * 0.5}`}
                dur={`${2.5 + (i % 5) * 0.4}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Edges - curved lines from center to each node */}
          {positions.map((node, i) => {
            const isHovered = hoveredNode === node.fullName
            const faded = hoveredNode !== null && !isHovered
            // Compute bezier control point for curve
            const dx = node.x - CX
            const dy = node.y - CY
            const dist = Math.sqrt(dx * dx + dy * dy)
            const perpX = -dy / dist * dist * 0.15
            const perpY = dx / dist * dist * 0.15
            const midX = CX + dx / 2
            const midY = CY + dy / 2
            return (
              <g key={`edge-${i}`} opacity={faded ? 0.12 : 1} style={{ transition: 'opacity 0.4s ease' }}>
                {/* Thin shadow line */}
                <path
                  d={`M ${CX} ${CY} Q ${midX + perpX} ${midY + perpY} ${node.x} ${node.y}`}
                  fill="none" stroke="#0d1117" strokeWidth={isHovered ? 5 : 2.5}
                  strokeLinecap="round" opacity={0.4}
                />
                {/* Main colored line */}
                <path
                  d={`M ${CX} ${CY} Q ${midX + perpX} ${midY + perpY} ${node.x} ${node.y}`}
                  fill="none"
                  stroke={isHovered ? node.color : `url(#kgEdge-${i})`}
                  strokeWidth={isHovered ? 2.2 : 1}
                  strokeLinecap="round"
                  style={{ transition: 'all 0.4s ease' }}
                />
              </g>
            )
          })}

          {/* Node glow circles (behind main nodes) */}
          {positions.map((node, i) => {
            const isHovered = hoveredNode === node.fullName
            const faded = hoveredNode !== null && !isHovered
            return (
              <circle key={`nglow-${i}`} cx={node.x} cy={node.y}
                r={isHovered ? node.r * 2.5 : node.r * 1.6}
                fill={`url(#kgNodeGlow-${i})`}
                opacity={faded ? 0.15 : 1}
                style={{ transition: 'all 0.4s ease' }} />
            )
          })}

          {/* Repo nodes */}
          {positions.map((node, i) => {
            const isHovered = hoveredNode === node.fullName
            const faded = hoveredNode !== null && !isHovered
            return (
              <g key={`node-${i}`}
                opacity={faded ? 0.3 : 1}
                style={{ cursor: 'pointer', transition: 'opacity 0.4s ease' }}
                onClick={() => window.api.openExternal(`https://github.com/${node.fullName}`)}
                onMouseEnter={(e) => handleNodeHover(node, e as any)}
                onMouseLeave={() => handleNodeHover(null)}>

                {/* Pulsing ring on hover */}
                {isHovered && (
                  <circle cx={node.x} cy={node.y} r={node.r + 5} fill="none"
                    stroke={node.color} strokeWidth={1.5} opacity={0.6}>
                    <animate attributeName="r" from={node.r + 3} to={node.r + 16}
                      dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0"
                      dur="1.4s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Main node disc */}
                <circle cx={node.x} cy={node.y} r={node.r}
                  fill={node.color} opacity={0.88}
                  stroke="#0d1117" strokeWidth={isHovered ? 3 : 2}
                  filter={isHovered ? 'url(#kgGlowStrong)' : 'url(#kgGlow)'}
                  style={{ transition: 'all 0.3s ease' }} />

                {/* Specular highlight */}
                <ellipse cx={node.x - node.r * 0.28} cy={node.y - node.r * 0.28}
                  rx={node.r * 0.38} ry={node.r * 0.28}
                  fill="white" opacity={0.18}
                  style={{ transition: 'all 0.3s ease' }} />

                {/* Node label */}
                <text x={node.x} y={node.y + node.r + 15}
                  textAnchor="middle"
                  fill={isHovered ? '#f0f6fc' : '#8b949e'}
                  fontSize={isHovered ? 13 : 10.5}
                  fontWeight={isHovered ? 600 : 400}
                  fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                  style={{ transition: 'all 0.3s ease' }}>
                  {node.name.length > 15 ? node.name.slice(0, 13) + '..' : node.name}
                </text>
              </g>
            )
          })}

          {/* ===== CENTER: User avatar with decoration ===== */}
          {/* Outer decorative ring with orbit dots */}
          <circle cx={CX} cy={CY} r={CENTER_R + 16} fill="none"
            stroke="#1f6feb" strokeWidth={0.5} opacity={0.2} />
          <circle cx={CX} cy={CY} r={CENTER_R + 10} fill="none"
            stroke="#58a6ff" strokeWidth={0.8} opacity={0.18} />

          {/* Rotating orbit dot */}
          <g>
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`}
              dur="12s" repeatCount="indefinite" />
            <circle cx={CX} cy={CY - CENTER_R - 10} r={3}
              fill="#58a6ff" opacity={0.7} filter="url(#kgGlow)" />
          </g>
          <g>
            <animateTransform attributeName="transform" type="rotate"
              from={`120 ${CX} ${CY}`} to={`480 ${CX} ${CY}`}
              dur="8s" repeatCount="indefinite" />
            <circle cx={CX} cy={CY - CENTER_R - 10} r={2}
              fill="#1f6feb" opacity={0.5} />
          </g>

          {/* Avatar border */}
          <circle cx={CX} cy={CY} r={CENTER_R + 5} fill="#0d1117" />
          <circle cx={CX} cy={CY} r={CENTER_R + 5} fill="none"
            stroke="#21262d" strokeWidth={2} />

          {/* Avatar image */}
          <image href={`https://github.com/${username}.png`}
            x={CX - CENTER_R} y={CY - CENTER_R}
            width={CENTER_R * 2} height={CENTER_R * 2}
            clipPath="url(#kgAvatarClip)"
            preserveAspectRatio="xMidYMid slice" />

          {/* Avatar ring glow */}
          <circle cx={CX} cy={CY} r={CENTER_R} fill="none"
            stroke="#1f6feb" strokeWidth={2.5} opacity={0.75}
            filter="url(#kgGlow)" />

          {/* Count badge above avatar */}
          <rect x={CX - 22} y={CY - CENTER_R - 22} width={44} height={22} rx={11}
            fill="#161b22" stroke="#1f6feb" strokeWidth={1} opacity={0.9} />
          <text x={CX} y={CY - CENTER_R - 7}
            textAnchor="middle" fill="#58a6ff" fontSize={12} fontWeight={700}
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">
            {nodes.length}
          </text>

          {/* Username */}
          <text x={CX} y={CY + CENTER_R + 30}
            textAnchor="middle" fill="#f0f6fc" fontSize={14} fontWeight={700}
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">
            {username}
          </text>
        </svg>

        {/* Tooltip popup */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x - 100, SVG_SIZE - 220),
            top: Math.max(8, tooltip.y - tooltip.node.r - 80),
            width: 200,
            background: 'rgba(22, 27, 34, 0.95)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${tooltip.node.color}44`,
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            color: '#c9d1d9',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${tooltip.node.color}15`,
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: 600, color: '#f0f6fc', marginBottom: 6, fontSize: 13,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tooltip.node.owner}/{tooltip.node.name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 4 }}>
              <span>★ <strong style={{ color: '#d29922' }}>{tooltip.node.stars.toLocaleString()}</strong></span>
              <span>⬤ <strong style={{ color: '#f0f6fc' }}>{tooltip.node.commits}</strong> commits</span>
            </div>
            {tooltip.node.language && (
              <span style={{ fontSize: 11, color: '#8b949e' }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                  background: tooltip.node.color, marginRight: 5 }} />
                {tooltip.node.language}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#8b949e' }}>
          {t('closerMeansMore', lang)}
        </span>
        <span style={{ fontSize: 11, color: '#8b949e' }}>
          {t('nodeSize', lang)}
        </span>
      </div>
    </div>
  )
}
