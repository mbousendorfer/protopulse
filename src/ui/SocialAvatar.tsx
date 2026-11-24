import { useState } from 'react'
import type { Network } from '../app/types'
import { NETWORK_LABEL } from '../data/agents'

// Agorapulse-style social avatar: the profile picture, round, with the network badge tucked in the bottom-right corner.
// Geometry follows @agorapulse/ui-components/avatar (network badge 16 px from 36 px avatars up, 12 px below, 8 px at 16).
// Profile pictures are stock placeholder photos (randomuser.me portraits, picked from the first name so gender matches),
// with a generated portrait as fallback if the image can't load. Organisations get initials on a tint.

type Size = 16 | 24 | 32 | 40 | 48
const BADGE: Record<Size, number> = { 48: 16, 40: 16, 32: 12, 24: 12, 16: 8 }

const WOMEN = /^(lea|léa|sophie|ana|anais|anaïs|maelle|maëlle|camille|nadia|ines|inès|martine|claire|julie|emma|chloe|chloé|marie|sarah|laura|elise|élise|manon|zoe|zoé|alice|lucie|clara|nina|eva|jade|louise)/i
const MEN = /^(thomas|max|marc|tom|julien|hugo|jonas|pierre|theo|théo|sam|lucas|paul|louis|nathan|leo|léo|antoine|alex|adrien|bruno|david|felix|félix|jules|kevin|mathis|noah|oscar|romain|simon|victor|yann)/i

/** A stable stock portrait URL for a person, or null when we can't tell. */
function photoFor(name: string, seed: number) {
  const first = name.replace(/^@/, '').split(/[\s._·-]+/)[0] ?? ''
  const folder = WOMEN.test(first) ? 'women' : MEN.test(first) ? 'men' : seed % 2 ? 'women' : 'men'
  return `https://randomuser.me/api/portraits/${folder}/${seed % 100}.jpg`
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// Portrait palettes: backgrounds, skin tones, hair. Kept here because they describe people, not the UI theme.
const BG = ['#f6d9c8', '#d9e6f5', '#e3dcf5', '#d6eee6', '#f3e3c4', '#f4d6de', '#dfe8d2']
const SKIN = ['#f1c7a5', '#e0a985', '#c68a62', '#9b6a47', '#6f4a33', '#f5d3bb']
const HAIR = ['#2b2118', '#5a3a24', '#8a5a33', '#c69253', '#d9b77a', '#3b3b3b', '#9e4a2f']

function Portrait({ seed }: { seed: number }) {
  const bg = BG[seed % BG.length], skin = SKIN[(seed >> 3) % SKIN.length], hair = HAIR[(seed >> 6) % HAIR.length]
  const style = (seed >> 9) % 4
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" fill={bg} />
      <path d="M6 40c1.5-8 7-12 14-12s12.5 4 14 12z" fill={hair} opacity="0.85" />
      <circle cx="20" cy="18" r="8.2" fill={skin} />
      {style === 0 && <path d="M11.5 17c0-6 4-9.5 8.5-9.5s8.5 3.5 8.5 9.5c-2-3.2-5-4.6-8.5-4.6s-6.5 1.4-8.5 4.6z" fill={hair} />}
      {style === 1 && <path d="M11 20c-1-8 3.5-12.5 9-12.5s10 4.5 9 12.5c-1-4-2.5-6.5-4-7.5-3 1.5-7 1.8-10 .5-1.5 1.5-3 3.5-4 7z" fill={hair} />}
      {style === 2 && <path d="M12 15.5c1-4.5 4.2-7 8-7s7 2.5 8 7c-2.5-1.8-5-2.4-8-2.4s-5.5.6-8 2.4z" fill={hair} />}
      {style === 3 && <path d="M10.5 26c-1.5-10 2.5-17.5 9.5-17.5s11 7.5 9.5 17.5c-.5-6-2-9.5-3.5-11-3.5 1-8.5 1-12 0-1.5 1.5-3 5-3.5 11z" fill={hair} />}
    </svg>
  )
}

/** Official-looking network glyphs, drawn small. Colours come from the --n-* tokens. */
export function Glyph({ n }: { n: Network }) {
  const c = `var(--n-${n})`
  const W = 'var(--panel)'
  switch (n) {
    case 'instagram': return <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={c} /><rect x="3.5" y="3.5" width="9" height="9" rx="2.6" fill="none" stroke={W} strokeWidth="1.3" /><circle cx="8" cy="8" r="2.1" fill="none" stroke={W} strokeWidth="1.3" /><circle cx="10.9" cy="5.1" r=".7" fill={W} /></svg>
    case 'facebook': return <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={c} /><path d="M9 16v-5.6h1.9l.3-2.2H9V6.8c0-.6.2-1.1 1.1-1.1h1.2V3.8c-.2 0-.9-.1-1.7-.1-1.7 0-2.8 1-2.8 2.9v1.6H5v2.2h1.8V16z" fill={W} /></svg>
    case 'linkedin': return <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={c} /><path d="M3.6 6.3h2v6.2h-2zM4.6 3.4a1.1 1.1 0 1 1 0 2.3 1.1 1.1 0 0 1 0-2.3zM6.9 6.3h1.9v.9c.3-.5 1-1.1 2.1-1.1 2.2 0 2.6 1.4 2.6 3.3v3.1h-2V9.8c0-.7 0-1.5-1-1.5s-1.1.7-1.1 1.5v2.7h-2z" fill={W} /></svg>
    case 'tiktok': return <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={c} /><path d="M10.6 3.5c.3 1.2 1.1 2 2.4 2.1v1.7c-.9 0-1.7-.3-2.4-.8v3.6a2.9 2.9 0 1 1-2.9-2.9h.3v1.8a1.2 1.2 0 1 0 .9 1.1V3.5z" fill={W} /></svg>
    case 'x': return <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={c} /><path d="M4 4h2.3l2.1 2.9L10.9 4h1.1L8.9 7.5 12 12H9.7L7.5 8.9 4.8 12H3.7l3.3-3.8z" fill={W} /></svg>
    case 'youtube': return <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={c} /><path d="M6.5 5.4l4.4 2.6-4.4 2.6z" fill={W} /></svg>
    case 'google': return <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={W} /><path d="M13 8.1c0-.4 0-.7-.1-1H8v1.9h2.9a2.5 2.5 0 0 1-1.1 1.6v1.3h1.8c1-1 1.4-2.3 1.4-3.8z" fill="var(--n-google)" /><path d="M8 13c1.4 0 2.6-.5 3.5-1.3l-1.7-1.3c-.5.3-1.1.5-1.8.5a3.1 3.1 0 0 1-2.9-2.1H3.3v1.4A5 5 0 0 0 8 13z" fill="var(--ok)" /><path d="M5.1 8.8a3 3 0 0 1 0-1.9V5.5H3.3a5 5 0 0 0 0 4.7z" fill="var(--caution)" /><path d="M8 4.9c.8 0 1.5.3 2 .8l1.5-1.5A5 5 0 0 0 3.3 5.5l1.8 1.4C5.5 5.7 6.6 4.9 8 4.9z" fill="var(--alert)" /></svg>
    case 'trustpilot': return <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={c} /><path d="M8 3.2l1.2 3.6h3.8l-3.1 2.2 1.2 3.6L8 10.4l-3.1 2.2 1.2-3.6L3 6.8h3.8z" fill={W} /></svg>
  }
}

export const ROUND: Partial<Record<Network, string>> = { instagram: '28%', linkedin: '6%', google: '0', trustpilot: '4px' }

export function SocialAvatar({ name, network, size = 32, org }: { name: string; network?: Network; size?: Size; org?: boolean }) {
  const seed = hash(name)
  const badge = BADGE[size]
  const initials = name.replace(/^@/, '').split(/[\s._·]+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
  const person = !org && !/weekly|news|^r\/|co\.?$|official/i.test(name)
  const [broken, setBroken] = useState(false)
  return (
    <span className="social-avatar" style={{ width: size, height: size }} title={network ? `${name} on ${NETWORK_LABEL[network]}` : name}>
      <span className="pic">
        {!person ? <span className="org" style={{ fontSize: Math.round(size * 0.4) }}>{initials}</span>
          : broken ? <Portrait seed={seed} />
          : <img src={photoFor(name, seed)} alt="" loading="lazy" width={size} height={size} onError={() => setBroken(true)} />}
      </span>
      {network && (
        <span className="badge" style={{ width: badge, height: badge, borderRadius: ROUND[network] ?? '50%' }} aria-label={NETWORK_LABEL[network]} role="img">
          <Glyph n={network} />
        </span>
      )}
    </span>
  )
}
