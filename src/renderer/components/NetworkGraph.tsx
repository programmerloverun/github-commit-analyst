import { useState, useMemo, useCallback } from 'react'
import type { RepoInfo, RepoStats } from '../types'
import { type Lang, t } from '../i18n'

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#58a6ff', JavaScript: '#f0c040', Python: '#79c0ff',
  Go: '#6edbb0', Rust: '#f778ba', Java: '#ffa657', 'C++': '#f97583',
  C: '#9ea2a8', Ruby: '#ff7b72', Swift: '#ff9b5c', Kotlin: '#c084fc',
  PHP: '#8899d4', HTML: '#ff9870', CSS: '#79c0ff', Shell: '#7ee787',
  Vue: '#56d364', Scala: '#f97583', Dart: '#5ccfe6',
  default: '#e6e6e6'
}

interface NodeData {
  fullName: string; name: string; owner: string
  commits: number; stars: number; language: string
}

interface PositionedNode extends NodeData {
  x: number; y: number; r: number; color: string; ring: number
}

interface Props {
  repoStats: RepoStats[]; repos: RepoInfo[]; username: string; lang: Lang
}

type MetricMode = 'stars' | 'commits'

const SVG_SIZE = 800
const CX = 400
const CY = 400
const CENTER_R = 52
const NODE_R = 10
const MIN_GAP = 10
const RING_GAP = NODE_R * 2 + MIN_GAP + 14
const START_GAP = 80

export default function NetworkGraph({ repoStats, repos, username, lang }: Props) {
  const [metric, setMetric] = useState<MetricMode>('commits')
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: PositionedNode } | null>(null)

  const nodes = useMemo(() => {
    const repoMap = new Map(repos.map(r => [r.fullName, r]))
    const merged: NodeData[] = []
    for (const rs of repoStats) {
      const repo = repoMap.get(rs.fullName)
      if (!repo) continue
      merged.push({
        fullName: rs.fullName, name: repo.name, owner: repo.owner,
        commits: rs.commits, stars: repo.stars, language: repo.language
      })
    }
    return merged
  }, [repoStats, repos])

  // Starfield layout: nodes seeded with golden-angle spiral, then jittered and collision-resolved
  const positions = useMemo(() => {
    if (nodes.length === 0) return []

    const m = (n: NodeData) => metric === 'commits' ? n.commits : n.stars
    const sorted = [...nodes].sort((a, b) => m(b) - m(a))
    const maxVal = Math.max(...sorted.map(m), 1)
    const minDist = NODE_R * 2 + MIN_GAP
    const maxR = Math.min(CX, CY) - NODE_R - 4
    const startR = CENTER_R + START_GAP

    // Seeded random
    let seed = 1
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return (seed - 1) / 2147483646
    }

    const placed: PositionedNode[] = []
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // ~137.5°

    for (let i = 0; i < sorted.length; i++) {
      const node = sorted[i]
      // Higher-ranked nodes tend to be closer to center, but with strong jitter
      const rankFrac = i / Math.max(sorted.length - 1, 1)
      // Use sqrt to push more nodes toward midrange (natural density falloff)
      const baseR = startR + Math.sqrt(rankFrac) * (maxR - startR)
      // Wide jitter band — radius varies by ±35%
      const jitterR = baseR * (0.7 + rand() * 0.6)
      const clampedR = Math.max(startR, Math.min(maxR, jitterR))
      // Golden-angle spiral + random jitter
      const angle = i * goldenAngle + (rand() * 1.2 - 0.6)

      placed.push({
        ...node,
        x: CX + clampedR * Math.cos(angle),
        y: CY + clampedR * Math.sin(angle),
        r: NODE_R,
        color: LANG_COLORS[node.language] || LANG_COLORS.default,
        ring: 0
      })
    }

    // Collision resolution — push apart overlapping nodes
    for (let iter = 0; iter < 20; iter++) {
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const dx = placed[j].x - placed[i].x
          const dy = placed[j].y - placed[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < minDist && dist > 0.001) {
            const push = (minDist - dist) / 2
            const nx = dx / dist
            const ny = dy / dist
            placed[i].x -= nx * push
            placed[i].y -= ny * push
            placed[j].x += nx * push
            placed[j].y += ny * push
          }
        }
        // Keep within bounds
        placed[i].x = Math.max(NODE_R + 4, Math.min(CX * 2 - NODE_R - 4, placed[i].x))
        placed[i].y = Math.max(NODE_R + 4, Math.min(CY * 2 - NODE_R - 4, placed[i].y))
        // Also keep out of the avatar zone
        const dxc = placed[i].x - CX
        const dyc = placed[i].y - CY
        const dc = Math.sqrt(dxc * dxc + dyc * dyc)
        if (dc < startR && dc > 0.001) {
          placed[i].x = CX + (dxc / dc) * startR
          placed[i].y = CY + (dyc / dc) * startR
        }
      }
    }

    return placed
  }, [nodes, metric])

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

  return (
    <div className="chart-container">
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
          style={{ width: '100%', maxHeight: 700, cursor: 'default' }}>

          <defs>
            <filter id="ngGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="ngAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1f6feb" stopOpacity={0.1} />
              <stop offset="70%" stopColor="#1f6feb" stopOpacity={0.02} />
              <stop offset="100%" stopColor="#1f6feb" stopOpacity={0} />
            </radialGradient>
            <clipPath id="ngAvatarClip">
              <circle cx={CX} cy={CY} r={CENTER_R} />
            </clipPath>
          </defs>

          {/* Background */}
          <rect width={SVG_SIZE} height={SVG_SIZE} fill="transparent" />

          {/* Center aura */}
          <circle cx={CX} cy={CY} r={180} fill="url(#ngAura)" />

          {/* Edges */}
          {positions.map((node, i) => {
            const isHovered = hoveredNode === node.fullName
            const faded = hoveredNode !== null && !isHovered
            return (
              <line key={`edge-${i}`}
                x1={CX} y1={CY} x2={node.x} y2={node.y}
                stroke={isHovered ? node.color : '#484f58'}
                strokeWidth={isHovered ? 1.4 : 0.6}
                opacity={faded ? 0.06 : isHovered ? 0.8 : 0.2}
                style={{ transition: 'all 0.3s ease' }}
              />
            )
          })}

          {/* Repo nodes */}
          {positions.map((node, i) => {
            const isHovered = hoveredNode === node.fullName
            const faded = hoveredNode !== null && !isHovered
            return (
              <g key={`node-${i}`}
                opacity={faded ? 0.25 : 1}
                style={{ cursor: 'pointer', transition: 'opacity 0.3s ease' }}
                onClick={() => window.api.openExternal(`https://github.com/${node.fullName}`)}
                onMouseEnter={(e) => handleNodeHover(node, e as any)}
                onMouseLeave={() => handleNodeHover(null)}>

                {/* Hover ring */}
                {isHovered && (
                  <circle cx={node.x} cy={node.y} r={NODE_R + 5} fill="none"
                    stroke={node.color} strokeWidth={1.2} opacity={0.5} />
                )}

                {/* Glow underneath */}
                <circle cx={node.x} cy={node.y} r={NODE_R + 4}
                  fill={node.color} opacity={isHovered ? 0.35 : 0.18}
                  style={{ transition: 'all 0.2s ease' }} />
                {/* Main dot */}
                <circle cx={node.x} cy={node.y} r={NODE_R}
                  fill={node.color} opacity={1}
                  stroke="rgba(255,255,255,0.2)" strokeWidth={1}
                  style={{ transition: 'all 0.2s ease' }} />

                {/* Label */}
                <text x={node.x} y={node.y + NODE_R + 14}
                  textAnchor="middle"
                  fill={isHovered ? '#f0f6fc' : '#8b949e'}
                  fontSize={isHovered ? 12 : 10}
                  fontWeight={isHovered ? 600 : 400}
                  fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                  style={{ transition: 'all 0.2s ease' }}>
                  {node.name.length > 14 ? node.name.slice(0, 12) + '..' : node.name}
                </text>
              </g>
            )
          })}

          {/* Center avatar */}
          <circle cx={CX} cy={CY} r={CENTER_R + 4} fill="#0d1117" />
          <circle cx={CX} cy={CY} r={CENTER_R + 4} fill="none" stroke="#21262d" strokeWidth={1.5} />
          <image href={`https://github.com/${username}.png`}
            x={CX - CENTER_R} y={CY - CENTER_R}
            width={CENTER_R * 2} height={CENTER_R * 2}
            clipPath="url(#ngAvatarClip)"
            preserveAspectRatio="xMidYMid slice" />
          <circle cx={CX} cy={CY} r={CENTER_R} fill="none"
            stroke="#1f6feb" strokeWidth={2} opacity={0.7} filter="url(#ngGlow)" />

          {/* Repo count badge */}
          <rect x={CX - 18} y={CY - CENTER_R - 20} width={36} height={18} rx={9}
            fill="#161b22" stroke="#30363d" strokeWidth={1} />
          <text x={CX} y={CY - CENTER_R - 7}
            textAnchor="middle" fill="#8b949e" fontSize={11} fontWeight={600}
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">
            {nodes.length}
          </text>

          {/* Username */}
          <text x={CX} y={CY + CENTER_R + 26}
            textAnchor="middle" fill="#f0f6fc" fontSize={13} fontWeight={700}
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">
            {username}
          </text>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x - 90, SVG_SIZE - 200),
            top: Math.max(8, tooltip.y - NODE_R - 75),
            width: 180,
            background: 'rgba(22, 27, 34, 0.96)',
            border: `1px solid ${tooltip.node.color}44`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: '#c9d1d9',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: 600, color: '#f0f6fc', marginBottom: 4, fontSize: 12,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tooltip.node.name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <span>★ <strong style={{ color: '#d29922' }}>{tooltip.node.stars.toLocaleString()}</strong></span>
              <span style={{ color: '#8b949e' }}>{tooltip.node.commits} commits</span>
            </div>
            {tooltip.node.language && (
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: tooltip.node.color, marginRight: 4, verticalAlign: 'middle' }} />
                {tooltip.node.language}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
