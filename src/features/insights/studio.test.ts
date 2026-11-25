import { describe, expect, it } from 'vitest'
import { initialState } from '../../app/state'
import { reducer } from '../../app/reducer'
import { parse } from '../../data/command'
import { applyOp, DEFAULT_SECTIONS, parseEdits, parseRecipe, writeStudio } from './studio'
import { fmt, rangeKpis } from './metrics'

const ask = (t: string) => ({ ...parseRecipe(t)!, sections: DEFAULT_SECTIONS })

describe('Report Studio, agentic', () => {
  it('reads a request for a report in a sentence, and routes it to Iris in ⌘K and Chat', () => {
    expect(parseRecipe('a monthly report for claire on instagram and tiktok')).toEqual({ days: 30, networks: ['instagram', 'tiktok'], audience: 'claire' })
    expect(parseRecipe('why did the report say tiktok dropped')).toBeUndefined()
    expect(parse('Iris, a monthly report for Claire on Instagram and TikTok').intent.kind).toBe('report')
    expect(parse('Make the report shorter and add the top 3 posts').intent.kind).toBe('reportEdit')
  })

  it('writes the report from the same numbers as Explore', () => {
    const s = initialState()
    const r = writeStudio(s, ask('a monthly report for claire on instagram and tiktok'), 'r1', 0)
    expect(r.sections.map(x => x.kind)).toEqual(DEFAULT_SECTIONS)
    const reach = ['instagram', 'tiktok'].reduce((t, n) => t + rangeKpis({ days: 30, offset: 0 }, n as 'instagram').find(k => k.key === 'reach')!.value, 0)
    expect(r.sections[0].paras[0]).toContainEqual(expect.objectContaining({ n: fmt.k(reach) }))
  })

  it('“make it shorter and add the top 3 posts” becomes edits; Undo puts the report back', () => {
    let s = reducer(initialState(), { type: 'insights/studio', id: 'r1', recipe: { ...ask('a weekly report'), sections: ['summary', 'dips', 'community'] }, via: 'test' })
    const r = s.insights.reports[0]
    const { ops, said } = parseEdits('make it shorter and add the top 3 posts', r)
    expect(said).toEqual(['shortened every section', 'added “Top 3 posts”'])
    s = reducer(s, { type: 'insights/studioEdit', id: 'r1', ops, said: said.join(', ') })
    const after = s.insights.reports[0]
    expect(after.sections.map(x => x.kind)).toEqual(['summary', 'dips', 'community', 'top'])
    expect(after.sections.slice(0, 3).every(x => x.short)).toBe(true)
    s = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(s.insights.reports[0]).toEqual(r)
  })

  it('moves and removes sections by name', () => {
    const s = initialState()
    const r = writeStudio(s, ask('a weekly report'), 'r1', 0)
    const { ops } = parseEdits('move best times to the top, remove community', r)
    const after = ops.reduce((x, o) => applyOp(s, x, o), r)
    expect(after.sections.map(x => x.kind)).toEqual(['besttime', 'summary', 'top', 'dips'])
  })

  it('a saved template keeps the recipe', () => {
    let s = reducer(initialState(), { type: 'insights/studio', id: 'r1', recipe: ask('a monthly report for claire on instagram'), via: 'test' })
    s = reducer(s, { type: 'insights/template', id: 'r1', name: 'Monthly for Claire' })
    expect(s.insights.templates[0]).toMatchObject({ name: 'Monthly for Claire', recipe: { days: 30, networks: ['instagram'], audience: 'claire' } })
  })
})
