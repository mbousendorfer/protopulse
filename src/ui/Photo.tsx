import { useId, useState } from 'react'
import { useStore } from '../app/store'

// Generated stand-in "photos": deterministic SVG scenes keyed by name. No downloads, no hotlinks.
// Muted natural tones so they sit quietly on the dark UI.

type Scene = { kind: 'land' | 'product' | 'room'; sky: [string, string]; hills: string[]; ground?: string; sun?: string; water?: boolean; snow?: boolean; trees?: boolean; obj?: Obj; night?: boolean }
type Obj = 'pack' | 'bottle' | 'jacket' | 'fleece' | 'boots' | 'tent' | 'stove' | 'map' | 'bench' | 'mug'

const S: Record<string, Scene> = {
  mountain: { kind: 'land', sky: ['#9fb3c4', '#d9d2c3'], hills: ['#5d6b78', '#3f4a54', '#2c343b'], snow: true },
  lake: { kind: 'land', sky: ['#c9b59a', '#e7d6bd'], hills: ['#6f7a72', '#4b5650', '#333b37'], water: true, sun: '#f0d9a8' },
  sunrise: { kind: 'land', sky: ['#d7a77f', '#efd2a8'], hills: ['#7d6a60', '#5a4b47', '#3a3133'], sun: '#f6e0b0' },
  trail: { kind: 'land', sky: ['#a8b9a2', '#dfe3cf'], hills: ['#6c7b5e', '#4f5d45', '#36412f'], trees: true },
  forest: { kind: 'land', sky: ['#9aab98', '#cfd8c4'], hills: ['#4b5d47', '#36452f', '#243020'], trees: true },
  snow: { kind: 'land', sky: ['#b8c4cf', '#e6e9ec'], hills: ['#c9d1d8', '#9eabb6', '#7b8996'], snow: true },
  river: { kind: 'land', sky: ['#a9bccb', '#dde4e6'], hills: ['#5f7066', '#46554c', '#2f3a33'], water: true, trees: true },
  valley: { kind: 'land', sky: ['#b2bfa8', '#e4e2cc'], hills: ['#7f8c6a', '#5e6b4d', '#414b35'] },
  ridge: { kind: 'land', sky: ['#8ea3b6', '#cdd5d9'], hills: ['#59636c', '#3e464e', '#272d33'], snow: true },
  coast: { kind: 'land', sky: ['#a8bfca', '#e2e6df'], hills: ['#7a8577', '#4f5a52'], water: true, sun: '#efe2c1' },
  desert: { kind: 'land', sky: ['#d3b48e', '#efdcbf'], hills: ['#b08a64', '#8c6a4c', '#6a4f39'], sun: '#f4e1bb' },
  night: { kind: 'land', sky: ['#1f2a3a', '#3b4658'], hills: ['#2a3340', '#1d242e', '#141a21'], night: true, snow: true },
  rain: { kind: 'land', sky: ['#7d8891', '#a9b1b5'], hills: ['#55605f', '#3f4847', '#2c3332'], trees: true },
  camp: { kind: 'land', sky: ['#b49a86', '#e2cfb6'], hills: ['#6d6a58', '#4e4c3e'], obj: 'tent', sun: '#f2d6a2' },
  tent: { kind: 'land', sky: ['#9fb0bf', '#dad8cc'], hills: ['#66736a', '#48524b'], obj: 'tent' },
  city: { kind: 'land', sky: ['#9aa3ab', '#d5d6d2'], hills: ['#6a6f74', '#4c5156'], ground: '#3a3e42' },
  pack: { kind: 'product', sky: ['#cfc6b6', '#e6dfd2'], hills: [], obj: 'pack' },
  bottle: { kind: 'product', sky: ['#b9c3c6', '#dfe4e3'], hills: [], obj: 'bottle' },
  jacket: { kind: 'product', sky: ['#aeb6bb', '#d9dcda'], hills: [], obj: 'jacket' },
  fleece: { kind: 'product', sky: ['#cdb9a6', '#e8dccd'], hills: [], obj: 'fleece' },
  boots: { kind: 'product', sky: ['#c2b7a5', '#e2dacb'], hills: [], obj: 'boots' },
  stove: { kind: 'product', sky: ['#b7b2a6', '#dcd8cd'], hills: [], obj: 'stove' },
  map: { kind: 'product', sky: ['#cbbf9f', '#e9dfc6'], hills: [], obj: 'map' },
  mug: { kind: 'product', sky: ['#c4b29c', '#e4d7c4'], hills: [], obj: 'mug' },
  workshop: { kind: 'room', sky: ['#6e655a', '#8f8476'], hills: [], obj: 'bench' },
  team: { kind: 'room', sky: ['#5f6a70', '#858f93'], hills: [], obj: 'bench' },
}

const OBJ_COLOR: Record<string, string> = { pack: '#4f6b57', bottle: '#5b6f7f', jacket: '#7a4a3a', fleece: '#a65e3c', boots: '#5d4a3c', stove: '#4a4d50', map: '#b7a37a', mug: '#3f5560', tent: '#b0663f', bench: '#4d4237' }

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

function ridgePath(seed: number, base: number, amp: number) {
  let d = `M0,${base}`
  for (let x = 0; x <= 400; x += 50) {
    const r = Math.sin(seed * 0.7 + x * 0.021) * amp + Math.cos(seed + x * 0.047) * amp * 0.45
    d += ` L${x},${(base - Math.abs(r)).toFixed(1)}`
  }
  return `${d} L400,500 L0,500 Z`
}

function Product({ o, c }: { o: Obj; c: string }) {
  switch (o) {
    case 'pack': return <g><rect x="130" y="130" width="140" height="210" rx="38" fill={c} /><rect x="152" y="210" width="96" height="80" rx="14" fill="rgba(0,0,0,.18)" /><rect x="160" y="100" width="80" height="40" rx="18" fill="none" stroke={c} strokeWidth="12" /><rect x="190" y="150" width="20" height="40" rx="4" fill="rgba(255,255,255,.14)" /></g>
    case 'bottle': return <g><rect x="165" y="150" width="70" height="210" rx="22" fill={c} /><rect x="178" y="112" width="44" height="44" rx="10" fill="#2f3a42" /><rect x="165" y="230" width="70" height="26" fill="rgba(255,255,255,.12)" /></g>
    case 'jacket': case 'fleece': return <g><path d="M140 150 L180 120 L220 120 L260 150 L300 260 L268 272 L252 220 L252 370 L148 370 L148 220 L132 272 L100 260 Z" fill={c} /><path d="M200 128 L200 370" stroke="rgba(0,0,0,.22)" strokeWidth="4" /><path d="M180 120 Q200 150 220 120" fill="rgba(0,0,0,.2)" /></g>
    case 'boots': return <g><path d="M120 220 L170 220 L172 320 L250 330 Q270 340 262 360 L120 360 Z" fill={c} /><path d="M215 230 L262 230 L264 320 L330 330 Q350 340 342 360 L215 360 Z" fill={c} opacity=".85" /></g>
    case 'stove': return <g><rect x="170" y="270" width="60" height="70" rx="8" fill={c} /><path d="M150 268 L250 268" stroke="#2c2f31" strokeWidth="8" /><path d="M200 230 Q188 250 200 262 Q214 248 200 230" fill="#d9a35b" /></g>
    case 'map': return <g><path d="M110 170 L180 150 L240 170 L300 150 L300 330 L240 350 L180 330 L110 350 Z" fill={c} /><path d="M180 150 L180 330 M240 170 L240 350" stroke="rgba(0,0,0,.2)" strokeWidth="3" /><path d="M130 300 Q170 240 210 270 T290 200" stroke="#7a3b2e" strokeWidth="3" fill="none" strokeDasharray="6 6" /></g>
    case 'mug': return <g><rect x="160" y="210" width="80" height="100" rx="12" fill={c} /><path d="M240 230 Q275 235 270 260 Q265 285 240 285" stroke={c} strokeWidth="12" fill="none" /></g>
    case 'tent': return <g><path d="M120 400 L200 290 L280 400 Z" fill={c} /><path d="M200 290 L200 400" stroke="rgba(0,0,0,.25)" strokeWidth="3" /></g>
    case 'bench': return <g><rect x="40" y="320" width="320" height="22" fill={c} /><rect x="60" y="342" width="14" height="110" fill={c} /><rect x="326" y="342" width="14" height="110" fill={c} /><rect x="120" y="250" width="90" height="70" rx="20" fill="#4f6b57" /><rect x="235" y="280" width="60" height="40" rx="6" fill="#7b7466" /><circle cx="300" cy="160" r="30" fill="rgba(255,240,210,.35)" /></g>
  }
}

/** A clip from Juno (`clip:clip-<source>-<key>`): the source video's poster, with a play mark. */
function ClipPoster({ name, alt, className, style }: { name: string; alt: string; className: string; style?: React.CSSProperties }) {
  const [broken, setBroken] = useState(false)
  // ponytail: the source is read from the id, so a pasted link's clips fall back to a scene; read the clip from the store if that matters.
  const source = name.slice(5).split('-')[1]
  // The clip's cover, when it has one: that frame of the source (the browser shows it at `#t`).
  let cover: number | undefined
  try { cover = (useStore().s.video.clips.find(c => c.id === name.slice(5)) as { cover?: { at: number } } | undefined)?.cover?.at } catch { /* rendered outside the app's store */ }
  return (
    <span className={`photo clip-photo ${className}`} style={{ display: 'block', position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000', ...style }} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      {broken ? <Photo name="workshop" />
        : cover !== undefined ? <video src={`${import.meta.env.BASE_URL}media/${source}/video.mp4#t=${cover}`} preload="metadata" muted playsInline tabIndex={-1} onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <img src={`${import.meta.env.BASE_URL}media/${source}/poster.jpg`} alt="" onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      <svg viewBox="0 0 24 24" width="22" height="22" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))' }} aria-hidden><path d="M8 5v14l11-7z" fill="#fff" /></svg>
    </span>
  )
}

/** A generated photo. Fills its box (object-fit: cover equivalent). A clip shows its video's poster. */
export default function Photo({ name, alt = '', className = '', style }: { name?: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  if (name?.startsWith('clip:')) return <ClipPoster name={name} alt={alt} className={className} style={style} />
  // An image uploaded in the browser (Publishing › Media) travels as a data URL.
  if (name?.startsWith('data:image/')) return <img className={`photo ${className}`} src={name} alt={alt} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', outline: '1px solid var(--photo-edge)', outlineOffset: -1, ...style }} />
  return <Scene name={name} alt={alt} className={className} style={style} />
}

function Scene({ name, alt, className, style }: { name?: string; alt: string; className: string; style?: React.CSSProperties }) {
  const id = useId()
  const key = name && S[name] ? name : Object.keys(S)[hash(name ?? 'x') % Object.keys(S).length]
  const sc = S[key]
  const seed = hash(name ?? key)
  return (
    <svg className={`photo ${className}`} style={{ display: 'block', width: '100%', height: '100%', outline: '1px solid var(--photo-edge)', outlineOffset: -1, ...style }} viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={sc.sky[0]} /><stop offset="1" stopColor={sc.sky[1]} /></linearGradient>
        <linearGradient id={`${id}w`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={sc.sky[1]} stopOpacity=".7" /><stop offset="1" stopColor={sc.hills[1] ?? '#333'} /></linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}s)`} />
      {sc.night && [...Array(24)].map((_, i) => <circle key={i} cx={(seed * (i + 3) * 37) % 400} cy={(seed * (i + 7) * 13) % 220} r={i % 5 ? 1 : 1.6} fill="#e8eaed" opacity=".7" />)}
      {sc.sun && <circle cx={120 + (seed % 160)} cy={150 + (seed % 40)} r="34" fill={sc.sun} opacity=".9" />}
      {sc.kind === 'land' && sc.hills.map((c, i) => <path key={i} d={ridgePath(seed + i * 11, 250 + i * 70, 70 - i * 15)} fill={c} />)}
      {sc.kind === 'land' && sc.snow && <path d={ridgePath(seed, 250, 70)} fill="none" stroke="#eef1f3" strokeWidth="5" opacity=".55" />}
      {sc.water && <rect y="360" width="400" height="140" fill={`url(#${id}w)`} />}
      {sc.water && [0, 1, 2, 3].map(i => <rect key={i} x={40 + i * 80} y={390 + i * 22} width={60 + (i % 2) * 40} height="2" fill="#fff" opacity=".18" />)}
      {sc.trees && [...Array(9)].map((_, i) => { const x = (i * 47 + seed) % 400; const y = 380 + ((i * 29) % 70); return <path key={i} d={`M${x} ${y - 70} L${x + 22} ${y} L${x - 22} ${y} Z`} fill="#22301f" opacity=".9" /> })}
      {sc.ground && <rect y="420" width="400" height="80" fill={sc.ground} />}
      {sc.kind === 'product' && <ellipse cx="200" cy="372" rx="120" ry="14" fill="rgba(0,0,0,.18)" />}
      {sc.obj && <Product o={sc.obj} c={OBJ_COLOR[sc.obj]} />}
    </svg>
  )
}
