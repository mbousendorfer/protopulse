import { useStore } from '../../app/store'
import { MUSIC, TEMPLATES, type BrandKit as Kit } from '../../data/video'
import { Seg, Switch } from '../../ui'
import { LANG_LABEL, SWATCH, type Captions, type Lang, type Swatch } from './model'
import { CaptionText } from './parts'

const SAMPLE = { s: 0, e: 2, words: [{ text: 'Free', s: 0, e: 0.4, key: true }, { text: 'repairs', s: 0.4, e: 0.9, key: true }, { text: 'forever', s: 0.9, e: 1.4, key: false }] }

/** A still of a caption style on a dark frame. */
export function CaptionSample({ c, label }: { c: Captions; label: string }) {
  return <span className="cap-sample" role="img" aria-label={label}><CaptionText c={{ ...c, y: 38, size: 15 }} line={SAMPLE} active={1} /></span>
}

/** Pick a caption template by seeing it. Radios, so the keyboard works. */
export function TemplatePicker({ value, captions, onChange, name }: { value: Captions['template']; captions: Captions; onChange: (t: Captions['template']) => void; name: string }) {
  return (
    <div className="tpl-grid" role="radiogroup" aria-label="Caption style">
      {TEMPLATES.map(t => (
        <label key={t.id} className={`tpl ${value === t.id ? 'on' : ''}`}>
          <input type="radio" className="sr-only" name={name} checked={value === t.id} onChange={() => onChange(t.id)} />
          <CaptionSample c={{ ...captions, template: t.id, upper: t.id === 'pop' || captions.upper }} label={`${t.label} captions`} />
          <span className="tpl-name">{t.label}</span>
          <span className="muted t-xs">{t.note}</span>
        </label>
      ))}
    </div>
  )
}

export function SwatchPicker({ value, onChange, name }: { value: Swatch; onChange: (s: Swatch) => void; name: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Highlight colour">
      {(Object.keys(SWATCH) as Swatch[]).map(k => (
        <label key={k} className="swatch" title={k[0].toUpperCase() + k.slice(1)}>
          <input type="radio" name={name} checked={value === k} onChange={() => onChange(k)} aria-label={k[0].toUpperCase() + k.slice(1)} />
          <span style={{ background: SWATCH[k] }} aria-hidden />
        </label>
      ))}
    </div>
  )
}

export default function BrandKit() {
  const { s, d } = useStore()
  const kit = s.video.kit
  const set = (patch: Partial<Kit>) => d({ type: 'video/kit', patch })
  const cap = (p: Partial<Captions>) => set({ captions: { ...kit.captions, ...p } })
  const brand = (p: Partial<Kit['brand']>) => set({ brand: { ...kit.brand, ...p } })
  const langs: Exclude<Lang, 'en'>[] = ['fr', 'de', 'es', 'it']
  return (
    <div className="kit stack lg">
      <p className="muted">New clips start from these settings. Clips Juno already cut keep their own.</p>
      <section className="card pad stack" aria-labelledby="kit-cap">
        <h2 id="kit-cap" className="section-title flush">Captions</h2>
        <TemplatePicker name="kit-tpl" value={kit.captions.template} captions={kit.captions} onChange={template => cap({ template })} />
        <div className="kit-row"><span>Highlight colour</span><SwatchPicker name="kit-swatch" value={kit.captions.color} onChange={color => cap({ color })} /></div>
        <div className="kit-row"><span>Words per line</span><Seg name="kit-per" size="sm" label="Words per line" value={String(kit.captions.perLine)} onChange={v => cap({ perLine: +v })} options={['1', '2', '3', '4'].map(v => ({ value: v, label: v }))} /></div>
        <Switch checked={kit.captions.emoji} onChange={emoji => cap({ emoji })} label="Add an emoji after key words" />
      </section>
      <section className="card pad stack" aria-labelledby="kit-brand">
        <h2 id="kit-brand" className="section-title flush">On every clip</h2>
        <Switch checked={kit.brand.logo} onChange={logo => brand({ logo })} label="Fernway logo in the corner" />
        <Switch checked={kit.brand.progress} onChange={progress => brand({ progress })} label="Progress bar" />
        <Switch checked={kit.brand.intro} onChange={intro => brand({ intro })} label="Hook card for the first 2 seconds" />
        <Switch checked={kit.brand.outro} onChange={outro => brand({ outro })} label="End card" />
        <label className="field"><span className="label">End card text</span><input className="input" value={kit.outro} onChange={e => set({ outro: e.target.value })} /></label>
        <div className="kit-row"><span>Music</span><Seg name="kit-music" size="sm" label="Music" value={kit.brand.music ?? 'none'} onChange={v => brand({ music: v === 'none' ? undefined : v })} options={[{ value: 'none', label: 'None' }, ...MUSIC.map(m => ({ value: m.id, label: m.label.split(' · ')[0] }))]} /></div>
      </section>
      <section className="card pad stack" aria-labelledby="kit-lang">
        <h2 id="kit-lang" className="section-title flush">Language versions</h2>
        <p className="muted">The languages Juno offers first in the editor. Each version keeps the speaker’s voice, and you review it before it goes out.</p>
        <div className="row">
          {langs.map(l => (
            <label key={l} className="check-row"><input type="checkbox" className="check" checked={kit.langs.includes(l)} onChange={e => set({ langs: e.target.checked ? [...kit.langs, l] : kit.langs.filter(x => x !== l) })} />{LANG_LABEL[l]}</label>
          ))}
        </div>
      </section>
    </div>
  )
}
