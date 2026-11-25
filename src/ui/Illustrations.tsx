import type { ReactNode } from 'react'
import type { AgentId } from '../app/types'
import { AgentAvatar } from './Avatar'
import './illustrations.css'

// Flat, warm scenes drawn from theme tokens, so they follow light and dark.
// Agent hues fall back to their base colour until the tokens exist.

const HUE: Record<AgentId, string> = {
  nova: 'var(--a-nova, #e8608a)', atlas: 'var(--a-atlas, #3d7bf2)', iris: 'var(--a-iris, #8b6cf0)',
  echo: 'var(--a-echo, #14a89a)', sage: 'var(--a-sage, #5aa83c)',
}
const SUN = 'var(--primary)'
const WATER = 'var(--chart)'
const mix = (c: string, n: number) => `color-mix(in srgb, ${c} ${n}%, transparent)`

type Svg = { label?: string; viewBox: string; children: ReactNode; className?: string }
const Scene = ({ label, viewBox, children, className }: Svg) => (
  <svg viewBox={viewBox} width="100%" className={`scene ${className ?? ''}`} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
    {children}
  </svg>
)

/** Mountains over a lake. The sky and the sun follow the time of day. */
export function BriefScene({ hour }: { hour: number }) {
  const t = hour < 10 ? 'dawn' : hour < 17 ? 'day' : 'evening'
  const sky = t === 'evening' ? mix(HUE.iris, 14) : mix(WATER, t === 'day' ? 13 : 9)
  const sun = t === 'dawn' ? { x: 70, y: 74 } : t === 'day' ? { x: 172, y: 36 } : { x: 196, y: 70 }
  return (
    <Scene viewBox="0 0 240 140" label={`Mountains at ${t === 'dawn' ? 'sunrise' : t === 'day' ? 'midday' : 'sunset'}`}>
      <rect width="240" height="140" rx="18" fill={sky} />
      <circle cx={sun.x} cy={sun.y} r="16" fill={mix(SUN, 25)} />
      <circle cx={sun.x} cy={sun.y} r="11" fill={SUN} />
      <path d="M0 100 L52 44 L84 74 L120 30 L168 82 L196 58 L240 96 L240 140 L0 140Z" fill={mix(HUE.iris, 30)} />
      <path d="M120 30 L132 43 L124 46 L116 40 L108 44Z" fill="var(--panel)" />
      <path d="M52 44 L62 55 L52 58 L44 53Z" fill="var(--panel)" />
      <path d="M0 108 L40 80 L76 100 L110 72 L150 100 L188 82 L240 106 L240 140 L0 140Z" fill={mix(HUE.sage, 50)} />
      {[[22, 104], [34, 100], [178, 98], [192, 102]].map(([x, y]) => <path key={x} d={`M${x} ${y} l6 -14 l6 14z`} fill={mix(HUE.sage, 85)} />)}
      <rect y="112" width="240" height="28" fill={mix(WATER, 26)} />
      <path d="M0 140 L0 122 Q120 116 240 122 L240 140Z" fill={mix(WATER, 18)} />
      <rect x={sun.x - 14} y="118" width="28" height="2" rx="1" fill="var(--panel)" opacity=".7" />
      <rect x={sun.x - 8} y="124" width="16" height="2" rx="1" fill="var(--panel)" opacity=".5" />
    </Scene>
  )
}

/** A tent under a calm sky: nothing needs you. */
export function AllClearScene() {
  return (
    <Scene viewBox="0 0 220 130" label="A tent under a quiet night sky">
      <rect width="220" height="130" rx="18" fill={mix(HUE.iris, 14)} />
      {[[30, 24], [64, 14], [150, 20], [186, 34], [110, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.8 : 2.6} fill={i % 2 ? 'var(--ink-3)' : SUN} opacity=".8" />)}
      <circle cx="176" cy="44" r="12" fill="var(--panel)" />
      <circle cx="182" cy="40" r="11" fill={mix(HUE.iris, 14)} />
      <ellipse cx="110" cy="122" rx="120" ry="26" fill={mix(HUE.sage, 40)} />
      <path d="M70 108 L110 52 L150 108Z" fill={SUN} />
      <path d="M110 52 L124 108 L96 108Z" fill={mix(HUE.nova, 70)} />
      <path d="M110 70 L118 108 L102 108Z" fill="var(--panel)" opacity=".85" />
      <rect x="160" y="70" width="2" height="38" rx="1" fill="var(--ink-3)" />
      <path d="M162 71 L180 77 L162 83Z" fill={HUE.echo} />
      <circle cx="48" cy="104" r="5" fill={mix(SUN, 40)} />
      <path d="M45 104 l3 -7 l3 7z" fill={SUN} />
    </Scene>
  )
}

export type EmptyKind = 'search' | 'tray' | 'calendar' | 'quiet'

/** Small decorative scene for empty states. */
export function EmptyScene({ kind = 'quiet' }: { kind?: EmptyKind }) {
  return (
    <Scene viewBox="0 0 160 110" className="empty-scene">
      <ellipse cx="80" cy="58" rx="62" ry="46" fill="var(--lift-2)" />
      {kind === 'search' && <>
        <rect x="70" y="44" width="20" height="10" rx="4" fill={mix(WATER, 70)} />
        <circle cx="58" cy="60" r="18" fill={HUE.atlas} /><circle cx="102" cy="60" r="18" fill={HUE.atlas} />
        <circle cx="58" cy="60" r="10" fill="var(--panel)" /><circle cx="102" cy="60" r="10" fill="var(--panel)" />
        <circle cx="62" cy="56" r="3" fill={mix(WATER, 40)} /><circle cx="106" cy="56" r="3" fill={mix(WATER, 40)} />
      </>}
      {kind === 'tray' && <>
        <path d="M40 62 L56 38 L104 38 L120 62 L120 82 Q120 86 116 86 L44 86 Q40 86 40 82Z" fill={HUE.nova} />
        <path d="M40 62 L66 62 Q70 72 80 72 Q90 72 94 62 L120 62 L120 82 Q120 86 116 86 L44 86 Q40 86 40 82Z" fill={mix(HUE.nova, 60)} />
        <rect x="62" y="44" width="36" height="4" rx="2" fill="var(--panel)" opacity=".7" />
      </>}
      {kind === 'calendar' && <>
        <rect x="46" y="30" width="68" height="60" rx="10" fill="var(--panel)" />
        <path d="M46 40 Q46 30 56 30 L104 30 Q114 30 114 40 L114 46 L46 46Z" fill={HUE.atlas} />
        {[0, 1, 2, 3].map(c => [0, 1, 2].map(r => <circle key={`${c}${r}`} cx={58 + c * 15} cy={58 + r * 11} r="3" fill="var(--lift-2)" />))}
        <circle cx="103" cy="80" r="7" fill={HUE.sage} />
        <path d="M99.5 80 l2.5 2.5 l4.5 -5" stroke="var(--panel)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>}
      {kind === 'quiet' && <>
        <circle cx="80" cy="58" r="24" fill={HUE.iris} />
        <circle cx="92" cy="50" r="22" fill="var(--lift-2)" />
        <circle cx="114" cy="34" r="2.5" fill={SUN} /><circle cx="44" cy="44" r="2" fill={SUN} /><circle cx="124" cy="70" r="1.8" fill="var(--ink-3)" />
      </>}
    </Scene>
  )
}

/** One scene per onboarding step: accounts, playbook, team, autonomy, first brief. */
export function OnboardingScene({ step }: { step: number }) {
  const agents = Object.values(HUE)
  return (
    <Scene viewBox="0 0 240 120" className="onb-illustration">
      <rect width="240" height="120" rx="18" fill={mix(SUN, 9)} />
      {step === 0 && <>
        {[[52, 38, HUE.nova], [52, 82, HUE.atlas], [188, 38, HUE.echo], [188, 82, HUE.sage]].map(([x, y, c]) => (
          <g key={`${x}${y}`}><path d={`M${x} ${y} L120 60`} stroke={mix(String(c), 60)} strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" /><rect x={Number(x) - 16} y={Number(y) - 16} width="32" height="32" rx="10" fill={String(c)} /></g>
        ))}
        <circle cx="120" cy="60" r="22" fill="var(--panel)" /><circle cx="120" cy="60" r="12" fill={SUN} />
      </>}
      {step === 1 && <>
        <path d="M60 30 Q90 24 120 32 L120 96 Q90 88 60 94Z" fill="var(--panel)" />
        <path d="M180 30 Q150 24 120 32 L120 96 Q150 88 180 94Z" fill="var(--lift)" />
        {[44, 56, 68, 80].map(y => <rect key={y} x="70" y={y - 4} width="40" height="3" rx="1.5" fill={mix(HUE.iris, 45)} />)}
        {[44, 56, 68].map(y => <rect key={y} x="130" y={y - 4} width="38" height="3" rx="1.5" fill={mix(HUE.echo, 45)} />)}
        <path d="M160 26 L170 26 L170 50 L165 45 L160 50Z" fill={HUE.nova} />
      </>}
      {step === 2 && agents.map((c, i) => (
        <g key={i} transform={`translate(${44 + i * 38} ${i % 2 ? 66 : 54})`}>
          <circle r="16" fill={c} /><circle cx="-5" cy="-2" r="2" fill="var(--panel)" /><circle cx="5" cy="-2" r="2" fill="var(--panel)" />
          <path d="M-5 5 Q0 9 5 5" stroke="var(--panel)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {step === 3 && <>
        <path d="M70 92 A50 50 0 0 1 170 92" stroke="var(--lift-2)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M70 92 A50 50 0 0 1 120 42" stroke={HUE.sage} strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M120 92 L100 58" stroke="var(--ink-3)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="120" cy="92" r="8" fill={SUN} />
      </>}
      {step >= 4 && <>
        <circle cx="120" cy="92" r="30" fill={mix(SUN, 25)} /><circle cx="120" cy="92" r="20" fill={SUN} />
        <path d="M0 96 L50 70 L84 88 L130 62 L176 90 L210 76 L240 92 L240 120 L0 120Z" fill={mix(HUE.sage, 55)} />
        {[[120, 50], [86, 60], [154, 60]].map(([x, y], i) => <rect key={i} x={x - 1.5} y={y - 8} width="3" height="10" rx="1.5" fill={SUN} transform={`rotate(${(i - 0) * (i === 1 ? -35 : 35)} ${x} ${y})`} />)}
      </>}
    </Scene>
  )
}

/** The agent's avatar in its setting, for profiles and onboarding. */
export function AgentScene({ agent }: { agent: AgentId }) {
  const c = HUE[agent]
  return (
    <div className="agent-scene" role="img" aria-label={`${agent[0].toUpperCase()}${agent.slice(1)} at work`}>
      <Scene viewBox="0 0 240 160">
        <rect width="240" height="160" rx="20" fill={mix(c, 13)} />
        {agent === 'nova' && <>
          <path d="M24 30 h56 a10 10 0 0 1 10 10 v14 a10 10 0 0 1 -10 10 h-40 l-10 9 v-9 h-6 a10 10 0 0 1 -10 -10 v-14 a10 10 0 0 1 10 -10z" fill="var(--panel)" />
          <path d="M160 92 h56 a10 10 0 0 1 10 10 v14 a10 10 0 0 1 -10 10 h-6 v9 l-10 -9 h-40 a10 10 0 0 1 -10 -10 v-14 a10 10 0 0 1 10 -10z" fill={mix(c, 45)} />
          {[38, 52, 66].map(x => <circle key={x} cx={x} cy="47" r="3.5" fill={c} />)}
        </>}
        {agent === 'atlas' && <>
          <rect x="18" y="26" width="58" height="56" rx="10" fill="var(--panel)" />
          <path d="M18 36 a10 10 0 0 1 10 -10 h38 a10 10 0 0 1 10 10 v6 h-58z" fill={c} />
          {[0, 1, 2].map(r => [0, 1, 2].map(k => <rect key={`${r}${k}`} x={28 + k * 15} y={50 + r * 10} width="8" height="5" rx="2" fill={r === 1 && k === 2 ? SUN : 'var(--lift-2)'} />))}
          <path d="M172 104 l48 -18 l-26 30 l-4 -10z" fill={c} /><path d="M190 106 l30 -20 l-34 14z" fill={mix(c, 55)} />
          <path d="M150 120 q14 -4 22 -14" stroke={mix(c, 50)} strokeWidth="2" strokeDasharray="3 5" fill="none" strokeLinecap="round" />
        </>}
        {agent === 'iris' && <>
          <rect x="18" y="30" width="62" height="56" rx="10" fill="var(--panel)" />
          {[[28, 22], [44, 34], [60, 44]].map(([x, h]) => <rect key={x} x={x} y={78 - h} width="10" height={h} rx="3" fill={x === 60 ? c : mix(c, 45)} />)}
          <rect x="160" y="92" width="64" height="44" rx="10" fill="var(--panel)" />
          <path d="M170 124 L186 112 L198 118 L214 102" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>}
        {agent === 'echo' && [44, 62, 80].map((r, i) => (
          <circle key={r} cx="120" cy="80" r={r} fill="none" stroke={c} strokeWidth="3" opacity={0.5 - i * 0.14} />
        ))}
        {agent === 'sage' && <>
          <path d="M16 34 l20 -6 l20 6 l20 -6 v56 l-20 6 l-20 -6 l-20 6z" fill="var(--panel)" />
          <path d="M24 74 q10 -18 22 -10 t24 -20" stroke={c} strokeWidth="2.5" strokeDasharray="3 5" fill="none" strokeLinecap="round" />
          {[22, 15, 8].map((r, i) => <circle key={r} cx="196" cy="112" r={r} fill={i % 2 ? 'var(--panel)' : i ? SUN : c} />)}
        </>}
      </Scene>
      <span className="agent-scene-avatar"><AgentAvatar agent={agent} size={96} /></span>
    </div>
  )
}
