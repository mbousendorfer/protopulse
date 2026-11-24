import type { AgentId } from '../app/types'

type Who = AgentId | 'claire'

/** One friendly character per agent, in the agent's colour, with one trait each. Token-driven, so it works in both themes. */
export function AgentAvatar({ agent, size = 28, title }: { agent: Who; size?: number; title?: string }) {
  const c = `var(--a-${agent})`, wash = `var(--a-${agent}-wash)`
  const face = (
    <>
      <circle cx="16" cy="22" r="1.7" fill="var(--panel)" />
      <circle cx="24" cy="22" r="1.7" fill="var(--panel)" />
      <path d="M16.2 26.4q3.8 2.8 7.6 0" stroke="var(--panel)" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={title} aria-hidden={title ? undefined : true}>
      <circle cx="20" cy="20" r="20" fill={wash} />
      {agent === 'nova' && <>
        <path d="M26 6.5h8a3 3 0 0 1 3 3v4.5a3 3 0 0 1-3 3h-2.5l-3 2.6v-2.6a3 3 0 0 1-2.5-3V9.5a3 3 0 0 1 3-3z" fill={c} opacity="0.55" />
        <circle cx="20" cy="23" r="12" fill={c} />{face}
      </>}
      {agent === 'atlas' && <>
        <path d="M23 5.5l12 4.6-6.8 2.1-2.3 6.6z" fill={c} opacity="0.6" />
        <circle cx="20" cy="23" r="12" fill={c} />{face}
      </>}
      {agent === 'iris' && <>
        <circle cx="20" cy="23" r="12" fill={c} />
        <circle cx="15.6" cy="22" r="3.7" fill="none" stroke="var(--panel)" strokeWidth="1.5" />
        <circle cx="24.4" cy="22" r="3.7" fill="none" stroke="var(--panel)" strokeWidth="1.5" />
        <path d="M19.3 22h1.4" stroke="var(--panel)" strokeWidth="1.5" />
        <circle cx="15.6" cy="22" r="1.3" fill="var(--panel)" /><circle cx="24.4" cy="22" r="1.3" fill="var(--panel)" />
        <path d="M16.8 28q3.2 2 6.4 0" stroke="var(--panel)" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      </>}
      {agent === 'echo' && <>
        <path d="M7.5 15a14 14 0 0 1 25 0" stroke={c} strokeWidth="2.2" fill="none" opacity="0.5" strokeLinecap="round" />
        <path d="M11.5 13.6a10 10 0 0 1 17 0" stroke={c} strokeWidth="2.2" fill="none" opacity="0.32" strokeLinecap="round" />
        <circle cx="20" cy="23" r="12" fill={c} />{face}
      </>}
      {agent === 'sage' && <>
        <path d="M20 11.5c3.5-6.5 10.5-6.2 12-5-.8 5.6-6.6 8.6-12 6.3z" fill={c} opacity="0.6" />
        <circle cx="20" cy="23" r="12" fill={c} />{face}
      </>}
      {agent === 'claire' && <>
        <path d="M9 36c1.5-6 6-9 11-9s9.5 3 11 9" fill={c} />
        <circle cx="20" cy="17" r="7" fill={c} />
        <path d="M13 16c0-5 3.5-7.5 7-7.5s7 2.5 7 7.5c-2-2.5-4.5-3.3-7-3.3s-5 .8-7 3.3z" fill="var(--a-claire-ink)" />
      </>}
    </svg>
  )
}
