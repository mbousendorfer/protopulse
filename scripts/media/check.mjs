#!/usr/bin/env node
// Validates src/data/video-transcripts.json (the UI contract) and public/media against it.
//   node scripts/media/check.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MEDIA = path.join(ROOT, 'public/media');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/video-transcripts.json'), 'utf8'));
const LANGS = ['fr', 'de', 'es', 'it'];
const two = (x) => assert.ok(typeof x === 'number' && Math.abs(x * 100 - Math.round(x * 100)) < 1e-6, `not 2 decimals: ${x}`);
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();

assert.deepEqual(Object.keys(data).sort(), ['gr20', 'live', 'repair']);
for (const [id, src] of Object.entries(data)) {
  const live = id === 'live';
  assert.deepEqual(Object.keys(src).sort(), live ? ['chapters', 'duration', 'sentences', 'shots', 'words'] : ['duration', 'sentences', 'shots', 'words'], id);
  two(src.duration);
  src.sentences.forEach((s, i) => {
    assert.equal(s.i, i); two(s.s); two(s.e); assert.ok(s.s < s.e && s.e <= src.duration);
    if (i) assert.ok(s.s >= src.sentences[i - 1].e, `${id} sentence ${i} overlaps`);
    assert.ok(s.text.length > 0 && !/[{}]/.test(s.text));
    assert.deepEqual(Object.keys(s.tr), LANGS); LANGS.forEach((l) => assert.ok(s.tr[l].length > 0));
    if (live) assert.ok(['host', 'guest'].includes(s.speaker)); else assert.equal(s.speaker, undefined);
    const ws = src.words.filter((w) => w.sent === i);
    assert.equal(ws.map((w) => w.w).join(' '), s.text, `${id} sentence ${i} words ≠ text`);
    assert.ok(ws[0].s >= s.s - 0.01 && ws.at(-1).e <= s.e + 0.01, `${id} sentence ${i} words outside sentence`);
  });
  src.words.forEach((w, i) => {
    assert.equal(w.i, i); two(w.s); two(w.e); assert.ok(w.s <= w.e);
    if (i) assert.ok(w.s >= src.words[i - 1].e - 0.01, `${id} word ${i} goes back in time`);
    assert.ok(w.filler === undefined || w.filler === true);
    if (w.filler) assert.match(w.w.toLowerCase(), /^(um|uh|you|know|like)[,.?]?$/);
  });
  const spans = (list, what) => list.forEach((x, k) => { two(x.s); two(x.e); assert.ok(x.s < x.e); assert.equal(x.s, k ? list[k - 1].e : 0, `${id} ${what} ${k} not contiguous`); assert.equal(list.at(-1).e, src.duration); });
  spans(src.shots, 'shot'); src.shots.forEach((x) => assert.ok(x.label && x.focus >= 0 && x.focus <= 1));
  if (live) { spans(src.chapters, 'chapter'); src.chapters.forEach((c) => assert.match(c.display, /^\d\d:\d\d$/)); }

  for (const f of ['video.mp4', 'clean.m4a', ...LANGS.map((l) => `dub-${l}.m4a`)]) {
    const d = dur(path.join(MEDIA, id, f));
    assert.ok(Math.abs(d - src.duration) < 0.15, `${id}/${f} lasts ${d}, transcript says ${src.duration}`);
  }
  ['poster.jpg', 'strip.jpg'].forEach((f) => assert.ok(fs.existsSync(path.join(MEDIA, id, f))));
  console.log(`ok ${id}: ${src.duration} s · ${src.sentences.length} sentences · ${src.words.length} words (${src.words.filter((w) => w.filler).length} fillers) · ${src.shots.length} shots`);
}
['sewing', 'trail', 'rain', 'lake'].forEach((b) => assert.ok(Math.abs(dur(path.join(MEDIA, 'broll', `${b}.mp4`)) - 5) < 0.2));
['calm', 'upbeat'].forEach((m) => assert.ok(Math.abs(dur(path.join(MEDIA, 'music', `${m}.m4a`)) - 60) < 0.5));
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
const mb = size(MEDIA) / 1e6;
assert.ok(mb <= 25, `public/media is ${mb.toFixed(2)} MB`);
console.log(`ok public/media ${mb.toFixed(2)} MB ≤ 25 MB`);
