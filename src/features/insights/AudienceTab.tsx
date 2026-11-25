// Insights › Audience: who follows Fernway, per network, and what Iris would brief Atlas about it.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Send } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { NETWORK_LABEL } from '../../data/agents'
import { AGE_BANDS, NETWORKS_SOCIAL, type NetFilter } from '../../data/insights'
import { Btn, Filters, Mark } from '../../ui'
import { HBars, LineChart } from '../../ui/charts'
import { audienceOf, audienceTips, followerSeries } from './audience'
import { kpi } from './metrics'

const int = (v: number) => Math.round(v).toLocaleString('en-GB')

export default function AudienceTab() {
  const { s, d } = useStore()
  const now = useNow(60_000)
  const [net, setNet] = useState<NetFilter>('all')
  const a = audienceOf(net)
  const series = followerSeries(net, now)
  const newFollowers = net === 'all' ? kpi('followers').value : kpi('followers', 7, net).value
  const tips = audienceTips().filter(t => net === 'all' || t.network === net)
  return (
    <div className="stack lg">
      <div className="row explore-bar">
        <Filters label="Network" value={net} onChange={setNet} items={[{ value: 'all', label: 'All networks' }, ...NETWORKS_SOCIAL.map(n => ({ value: n as NetFilter, label: NETWORK_LABEL[n] }))]} />
      </div>
      <dl className="kpi-grid">
        {[['Followers', int(a.followers)], ['New followers, 7 days', int(newFollowers)], ['Under 25', `${a.under25}%`], ['Top country', `${a.countries[0][0]} ${a.countries[0][1]}%`]].map(([k, v]) => (
          <div key={k} className="kpi"><dt>{k}</dt><dd><b className="num">{v}</b></dd></div>
        ))}
      </dl>
      {tips.map(t => {
        const state = s.insights.tips[t.network]
        const card = s.handoffs.find(h => h.ref === `aud:${t.network}`)
        return (
          <section key={t.network} className="card pad">
            <div className="anomaly-cause"><Mark agent="iris" /><div className="stack gap-2">
              <p>{t.finding}. I’d brief Atlas: “{t.brief}”.</p>
              {state === 'briefed' ? <span className="row tight muted"><Check size={14} className="ok" />Atlas has the brief. His first draft is on your Desk.</span>
                : card ? <Link to={`/?card=${card.id}`} className="btn sm self-start">Review on Desk</Link>
                : <Btn size="sm" className="self-start" onClick={() => d({ type: 'insights/audienceBrief', network: t.network, via: 'You asked from Insights › Audience' })}><Send size={14} />Brief Atlas{state === 'dismissed' ? ' anyway' : ''}</Btn>}
            </div></div>
          </section>
        )
      })}
      <section className="card pad">
        <div className="section-title">Followers <span className="faint">· {net === 'all' ? 'all networks' : NETWORK_LABEL[net]}, last 30 days</span></div>
        <LineChart label="Followers, last 30 days" labels={series.map(x => new Date(x.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))} series={[{ name: 'Followers', data: series.map(x => x.v), color: 'var(--a-iris)' }]} h={180} format={v => `${+(v / 1000).toFixed(1)}k`} />
      </section>
      <div className="grid-2">
        <section className="card pad stack">
          <div className="section-title">Age</div>
          <HBars items={AGE_BANDS.map((b, i) => ({ label: b, value: a.age[i] }))} format={v => `${v}%`} highlight={a.peak} color="var(--a-iris)" />
          <p className="muted">Women {a.gender.women}% · men {a.gender.men}% · other or not said {a.gender.other}%</p>
        </section>
        <section className="card pad stack">
          <div className="section-title">Countries</div>
          <HBars items={a.countries.map(([c, p]) => ({ label: c, value: p }))} format={v => `${v}%`} color="var(--a-iris)" />
          <p className="muted">Top cities: {a.cities.join(', ')}</p>
        </section>
      </div>
    </div>
  )
}
