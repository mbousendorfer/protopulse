import type { ReactNode } from 'react'
import { Bookmark, Heart, MessageCircle, Music2, Repeat2, Send, Share2, ThumbsUp, BarChart2, Globe } from 'lucide-react'
import type { Network } from '../../app/types'
import Photo from '../../ui/Photo'

/** Highlights Playbook hits (banned words) in a caption. */
export function Marked({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>
  const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return <>{text.split(re).map((part, i) => (i % 2 ? <span key={i} className="pb-hit" title="Not allowed by the Playbook">{part}</span> : <span key={i}>{part}</span>))}</>
}

const Brand = ({ size = 28 }: { size?: number }) => (
  <span className="pv-brand" style={{ width: size, height: size }} aria-hidden>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32"><path d="M5 22 L13 10 L18 17 L21 13 L27 22 Z" fill="var(--pv-brand-ink)" /></svg>
  </span>
)

/** Dark-mode previews of each network's own layout. */
export function NetworkPreview({ network, text, media, words }: { network: Network; text: string; media?: string; words: string[] }) {
  const caption = <Marked text={text || 'Your caption shows here.'} words={words} />
  const img = (ratio: string) => media ? <div className="pv-media" style={{ aspectRatio: ratio }}><Photo name={media} /></div> : <div className="pv-media pv-nomedia" style={{ aspectRatio: ratio }}>No visual</div>
  const frame = (cls: string, body: ReactNode) => <div className={`pv ${cls}`} aria-label={`Preview on ${network}`}>{body}</div>

  switch (network) {
    case 'instagram': return frame('pv-ig', <>
      <div className="pv-head"><Brand /><div><b>fernway</b><span>Annecy, France</span></div></div>
      {img('4 / 5')}
      <div className="pv-icons"><Heart size={18} /><MessageCircle size={18} /><Send size={18} /><span className="spacer" /><Bookmark size={18} /></div>
      <p className="pv-text"><b>fernway</b> {caption}</p>
      <p className="pv-sub">View all 24 comments</p>
    </>)
    case 'tiktok': case 'youtube': return frame(network === 'tiktok' ? 'pv-tt' : 'pv-yt', <>
      <div className="pv-vertical">
        {media ? <Photo name={media} /> : <div className="pv-nomedia" style={{ height: '100%' }}>No video</div>}
        <div className="pv-rail">{network === 'tiktok' ? <><span><Heart size={20} />12.4k</span><span><MessageCircle size={20} />312</span><span><Share2 size={20} />88</span></> : <><span><ThumbsUp size={20} />2.1k</span><span><MessageCircle size={20} />64</span><span><Share2 size={20} />Share</span></>}</div>
        <div className="pv-overlay">
          <b>@fernway{network === 'youtube' && <span className="pv-sub-btn">Subscribe</span>}</b>
          <p>{caption}</p>
          {network === 'tiktok' && <span className="pv-sound"><Music2 size={12} />original sound · Fernway</span>}
        </div>
      </div>
    </>)
    case 'linkedin': return frame('pv-li', <>
      <div className="pv-head"><Brand size={40} /><div><b>Fernway</b><span>9,012 followers · now · <Globe size={11} /></span></div></div>
      <p className="pv-text pv-pre">{caption}</p>
      {media && img('1.91 / 1')}
      <div className="pv-actions"><span><ThumbsUp size={15} />Like</span><span><MessageCircle size={15} />Comment</span><span><Repeat2 size={15} />Repost</span><span><Send size={15} />Send</span></div>
    </>)
    case 'facebook': return frame('pv-fb', <>
      <div className="pv-head"><Brand size={36} /><div><b>Fernway</b><span>Just now · <Globe size={11} /></span></div></div>
      <p className="pv-text pv-pre">{caption}</p>
      {media && img('1.91 / 1')}
      <div className="pv-actions"><span><ThumbsUp size={15} />Like</span><span><MessageCircle size={15} />Comment</span><span><Share2 size={15} />Share</span></div>
    </>)
    default: return frame('pv-x', <>
      <div className="pv-xrow">
        <Brand size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pv-xname"><b>Fernway</b><span>@fernway · now</span></div>
          <p className="pv-text pv-pre">{caption}</p>
          {media && <div className="pv-xmedia">{img('16 / 9')}</div>}
          <div className="pv-xicons"><MessageCircle size={15} /><Repeat2 size={15} /><Heart size={15} /><BarChart2 size={15} /></div>
        </div>
      </div>
    </>)
  }
}
