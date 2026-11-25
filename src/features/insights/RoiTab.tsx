// Insights › ROI: what social brings to the website, from GA4 (mocked), per network, campaign and post.
import { useState } from 'react'
import { BookPlus, Check } from 'lucide-react'
import { useStore } from '../../app/store'
import { NETWORK_LABEL } from '../../data/agents'
import { Btn, Mark, Net, Seg } from '../../ui'
import { HBars } from '../../ui/charts'
import { bestReturn, postsByRevenue, roiByNetwork, roiCampaigns, roiTotals } from './roi'

const eur = (v: number) => `€${Math.round(v).toLocaleString('en-GB')}`
const int = (v: number) => Math.round(v).toLocaleString('en-GB')

export default function Roi() {
  const { s, d } = useStore()
  const [days, setDays] = useState<'7' | '30' | '90'>('30')
  const rows = roiByNetwork(+days), t = roiTotals(rows)
  const camps = roiCampaigns(s), best = bestReturn(s)
  const told = best && s.playbook.rules.some(r => r.text === best.fact)
  const posts = postsByRevenue(+days).slice(0, 5)
  return (
    <div className="stack lg">
      <div className="row explore-bar">
        <Seg name="roi-period" label="Period" value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
        <span className="faint">Google Analytics 4 · UTM source = social</span>
      </div>
      <dl className="kpi-grid">
        {[['Sessions from social', int(t.sessions)], ['Orders', int(t.conversions)], ['Revenue', eur(t.revenue)], ['Revenue per link click', `€${t.perClick.toFixed(2)}`]].map(([k, v]) => (
          <div key={k} className="kpi"><dt>{k}</dt><dd><b className="num">{v}</b></dd><span className="faint kpi-prev">last {days} days</span></div>
        ))}
      </dl>
      <section className="card">
        <div className="card-head"><h2>By network</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Network</th><th className="r">Link clicks</th><th className="r">Sessions</th><th className="r">Orders</th><th className="r">Revenue</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.network}><td><span className="row tight nowrap"><Net n={r.network} />{NETWORK_LABEL[r.network]}</span></td><td className="r">{int(r.clicks)}</td><td className="r">{int(r.sessions)}</td><td className="r">{int(r.conversions)}</td><td className="r">{eur(r.revenue)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <div className="grid-2">
        <section className="card pad stack">
          <div className="section-title">By campaign <span className="faint">· UTM campaign, since launch</span></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Campaign</th><th className="r">Sessions</th><th className="r">Goal reached</th><th className="r">Revenue</th><th className="r">Per boost euro</th></tr></thead>
            <tbody>{camps.map(c => <tr key={c.id}><td>{c.name}</td><td className="r">{int(c.sessions)}</td><td className="r">{int(c.conversions)} {c.goal}</td><td className="r">{eur(c.revenue)}</td><td className="r">{c.perEuro ? `€${c.perEuro.toFixed(1)}` : 'No boost'}</td></tr>)}</tbody>
          </table></div>
          {best && (
            <div className="anomaly-cause"><Mark agent="iris" /><div className="stack gap-2">
              <p>{best.fact}. Sage can plan the next boosts with it.</p>
              {told ? <span className="row tight muted"><Check size={14} className="ok" />Sage has it as a Playbook fact.</span>
                : <Btn size="sm" className="self-start" onClick={() => d({ type: 'insights/tellSage', via: 'You asked from Insights › ROI' })}><BookPlus size={14} />Tell Sage</Btn>}
            </div></div>
          )}
        </section>
        <section className="card pad">
          <div className="section-title">Posts that sold <span className="faint">· revenue from their link clicks</span></div>
          {posts.length ? <HBars items={posts.map(x => ({ label: x.p.title.split(/[,:]/)[0], value: x.revenue }))} format={eur} color="var(--a-iris)" />
            : <p className="muted">No post with a link in the last {days} days.</p>}
        </section>
      </div>
    </div>
  )
}
