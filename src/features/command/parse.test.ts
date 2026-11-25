import { expect, test } from 'vitest'
import { EXAMPLES, ownerOf, parse } from '../../data/command'
import { checkMessage } from '../../data/playbook'

test('every example maps to its intent and agent', () => {
  const got = EXAMPLES.map(x => { const p = parse(x); return [p.intent.kind, p.forced ?? ownerOf(p.intent.kind)] })
  expect(got).toEqual([
    ['post', 'atlas'], ['post', 'atlas'], ['tiktok', 'iris'], ['besttime', 'iris'], ['competitor', 'echo'], ['pause', 'sage'],
    ['rule', 'nova'], ['campaign', 'sage'], ['needs', 'iris'], ['overnight', 'iris'], ['reply', 'nova'], ['mentions', 'echo'], ['clip', 'juno'],
  ])
  expect(parse('Clip https://youtu.be/abc123 please').intent).toEqual({ kind: 'clip', url: 'https://youtu.be/abc123' })
  const sale = parse(EXAMPLES[0]).intent
  expect(sale).toMatchObject({ kind: 'post', topic: 'weekend sale', slot: 'Fri 28, 18:30' })
  expect(parse(EXAMPLES[1]).intent).toMatchObject({ network: 'linkedin', topic: 'repair programme' })
  expect(parse(EXAMPLES[5]).intent).toMatchObject({ agent: 'atlas', until: 'monday' })
  expect(parse(EXAMPLES[6]).intent).toMatchObject({ rule: 'Never offer codes on complaints', agent: 'nova' })
  expect(parse(EXAMPLES[10]).intent).toMatchObject({ kind: 'reply', name: 'léa' })
  expect(parse('blah blah').intent.kind).toBe('unknown')
})

test('message checker flags the sample', () => {
  const issues = checkMessage('Hey guys! cheap bag ships tomorrow 🎒🔥 better than Peakline', ['cheap', 'guys'], [], 'instagram').map(i => i.rule)
  expect(issues).toEqual(expect.arrayContaining(['Banned words', 'One emoji max', 'Never name a competitor in a reply']))
  expect(checkMessage('Léa, a new Ridge ships today.', ['cheap'], [], 'instagram')).toEqual([])
})
