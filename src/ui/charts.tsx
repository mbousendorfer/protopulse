import { useId, useState } from 'react'

// Minimal SVG charts. Main series in brand coral (or the authoring agent's colour via `color`), comparisons neutral, status colours only for status data.

const ext = (xs: number[]) => {
  const min = Math.min(...xs), max = Math.max(...xs)
  return { min, max: max === min ? min + 1 : max }
}

export function Spark({ data, w = 120, h = 32, tone = 'ink', fill = true, label, color: custom }: { data: number[]; w?: number; h?: number; tone?: 'ink' | 'alert' | 'ok'; fill?: boolean; label?: string; color?: string }) {
  const id = useId()
  if (data.length < 2) return null
  const { min, max } = ext(data)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / (max - min)) * (h - 4)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
  const color = tone === 'alert' ? 'var(--alert)' : tone === 'ok' ? 'var(--ok)' : custom ?? 'var(--chart)'
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label ?? 'Trend'} style={{ maxWidth: w, display: 'block' }}>
      {fill && <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>}
      {fill && <path d={`${d}L${w},${h}L0,${h}Z`} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  )
}

type Series = { name: string; data: number[]; dashed?: boolean; tone?: 'ink' | 'faint' | 'signal'; color?: string }

/** Line chart with x labels, optional comparison series, and a hover readout. */
export function LineChart({ series, labels, h = 200, format = (v: number) => v.toLocaleString('en-GB'), label }: {
  series: Series[]; labels: string[]; h?: number; format?: (v: number) => string; label: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = h, padL = 44, padR = 12, padT = 12, padB = 24
  const all = series.flatMap(s => s.data)
  const { max } = ext([0, ...all])
  const top = niceMax(max)
  const n = labels.length
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR)
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB)
  const ticks = [0, top / 2, top]
  const stroke = (s: Series) => s.color ?? (s.tone === 'faint' ? 'var(--ink-3)' : 'var(--chart)')
  return (
    <figure className="rel">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} onMouseLeave={() => setHover(null)}
        onMouseMove={e => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          setHover(Math.max(0, Math.min(n - 1, Math.round(((px - padL) / (W - padL - padR)) * (n - 1)))))
        }}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)">{format(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % Math.ceil(n / 8) === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)">{l}</text>
        ))}
        {series.map(s => (
          <path key={s.name} fill="none" stroke={stroke(s)} strokeWidth={2} strokeDasharray={s.dashed ? '4 4' : undefined} strokeLinejoin="round"
            d={s.data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')} />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="var(--line-loud)" />
            {series.map(s => s.data[hover] !== undefined && <circle key={s.name} cx={x(hover)} cy={y(s.data[hover])} r="3.5" fill={stroke(s)} stroke="var(--panel)" strokeWidth="2" />)}
          </g>
        )}
      </svg>
      {hover !== null && (
        <figcaption className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b className="mono">{labels[hover]}</b>
          {series.map(s => s.data[hover] !== undefined && <span key={s.name}>{s.name}: <b className="num">{format(s.data[hover])}</b></span>)}
        </figcaption>
      )}
      {series.length > 1 && (
        <div className="legend">
          {series.map(s => <span key={s.name}><i style={{ borderTop: `2px ${s.dashed ? 'dashed' : 'solid'} ${stroke(s)}` }} />{s.name}</span>)}
        </div>
      )}
    </figure>
  )
}

function niceMax(v: number) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

/** Horizontal bars, one row per item, value labelled in text. */
export function HBars({ items, format = (v: number) => `${v}`, highlight, color = 'var(--chart)' }: { items: { label: string; value: number; sub?: string }[]; format?: (v: number) => string; highlight?: string; color?: string }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="hbars" style={{ ['--bar' as string]: color }}>
      {items.map(it => (
        <div key={it.label} className={`hbar ${highlight === it.label ? 'hl' : ''}`}>
          <span className="ellipsis">{it.label}</span>
          <span className="track"><i style={{ width: `${(it.value / max) * 100}%` }} /></span>
          <b className="num">{format(it.value)}</b>
        </div>
      ))}
    </div>
  )
}

/** Vertical bars with labels. */
export function Bars({ data, labels, h = 120, label, format = (v: number) => `${v}`, color = 'var(--chart)' }: { data: number[]; labels: string[]; h?: number; label: string; format?: (v: number) => string; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="vbars" role="img" aria-label={label} style={{ height: h, ['--bar' as string]: color }}>
      {data.map((v, i) => (
        <div key={i} className="vbar" title={`${labels[i]}: ${format(v)}`}>
          <i style={{ height: `${(v / max) * 100}%` }} />
          <span className="mono">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

/** Day × hour heatmap. values[day][slot] from 0 to 1. */
export function Heatmap({ values, rows, cols, label, best }: { values: number[][]; rows: string[]; cols: string[]; label: string; best?: [number, number] }) {
  return (
    <div className="heat" role="img" aria-label={label} style={{ gridTemplateColumns: `40px repeat(${cols.length}, minmax(0, 1fr))` }}>
      <span />
      {cols.map(c => <span key={c} className="mono faint hc">{c}</span>)}
      {rows.map((r, ri) => [
        <span key={r} className="mono faint hr">{r}</span>,
        ...values[ri].map((v, ci) => (
          <i key={`${r}${ci}`} title={`${r} ${cols[ci]}: ${Math.round(v * 100)}`} className={best && best[0] === ri && best[1] === ci ? 'best' : ''}
            style={{ background: `color-mix(in srgb, var(--chart) ${Math.round((0.06 + v * 0.7) * 100)}%, transparent)` }} />
        )),
      ])}
    </div>
  )
}

/** One bar split into parts (share of voice, sentiment…). */
export function StackBar({ parts, h = 8, format }: { parts: { label: string; value: number; color: string }[]; h?: number; format?: (value: number, total: number) => string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1
  return (
    <div>
      <div className="stackbar" style={{ height: h }} role="img" aria-label={parts.map(p => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
        {parts.map(p => <i key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="legend">
        {parts.map(p => <span key={p.label}><i style={{ background: p.color, height: 8, width: 8, borderRadius: 2 }} />{p.label} <b className="num">{format ? format(p.value, total) : `${Math.round((p.value / total) * 100)}%`}</b></span>)}
      </div>
    </div>
  )
}
