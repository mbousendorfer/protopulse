#!/usr/bin/env node
// Regenerates public/media/** and src/data/video-transcripts.json from sources.json.
// Needs ffmpeg, ffprobe and macOS `say`. No npm deps.
//   node scripts/media/build.mjs                  # everything
//   node scripts/media/build.mjs repair --audio-only   # one source, skip video (fast timing check)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const FOOT = path.join(HERE, 'footage'); // gitignored: downloads + intermediates
const WORK = path.join(FOOT, 'work');
const OUT = path.join(ROOT, 'public/media');
const JSON_OUT = path.join(ROOT, 'src/data/video-transcripts.json');
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'sources.json'), 'utf8'));

const SR = 22050; // `say` native rate; all PCM work is mono f32 at this rate
const LANGS = ['fr', 'de', 'es', 'it'];
const LEAD = 0.4, TAIL = 0.8, PAUSE = 0.35, COMMA_GAP = 0.12;
// ponytail: bitrates tuned by hand so public/media stays under 25 MB (≈8 min of 720p + 6 audio tracks per source).
// Two-pass at a fixed bitrate; raise these if the budget grows.
const VIDEO_KBPS = 200, BROLL_KBPS = 450;
const X264 = ['-c:v', 'libx264', '-preset', 'veryslow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-g', '50', '-x264-params', 'aq-mode=3'];
// Speech: HE-AAC 24 kb/s via macOS AudioToolbox (the build already needs macOS for `say`).
const SPEECH = ['-ar', '44100', '-ac', '1', '-c:a', 'aac_at', '-profile:a', '4', '-b:a', '24k'];
const args = process.argv.slice(2);
const AUDIO_ONLY = args.includes('--audio-only');
const ONLY = args.filter((a) => !a.startsWith('--'));

const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'inherit'], ...opts });
const ff = (...a) => run('ffmpeg', ['-v', 'error', '-y', ...a]);
const probeDur = (f) => +run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();
const r2 = (x) => Math.round(x * 100) / 100;
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const hash = (...p) => createHash('sha1').update(p.join('\u0000')).digest('hex').slice(0, 16);
const log = (...m) => console.log('·', ...m);

// ---------- downloads ----------
async function download(url, file) {
  if (fs.existsSync(file)) return file;
  log('download', url);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (protopulse media build)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file + '.part', Buffer.from(await res.arrayBuffer()));
  fs.renameSync(file + '.part', file);
  return file;
}
const clipFile = (id) => path.join(FOOT, `${id}.mp4`);

// ---------- PCM helpers ----------
const readF32 = (file) => { const b = fs.readFileSync(file); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
const writeF32 = (file, a) => fs.writeFileSync(file, Buffer.from(a.buffer, a.byteOffset, a.byteLength));
const decode = (file, extra = []) => { const b = run('ffmpeg', ['-v', 'error', '-i', file, ...extra, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-']); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };

// Trim leading/trailing silence (anything under -45 dBFS in 10 ms windows).
function trim(a) {
  const w = SR / 100, th = 10 ** (-45 / 20);
  const loud = (i) => { let m = 0; for (let j = i; j < Math.min(i + w, a.length); j++) m = Math.max(m, Math.abs(a[j])); return m > th; };
  let s = 0; while (s < a.length && !loud(s)) s += w;
  let e = a.length; while (e > s && !loud(e - w)) e -= w;
  return a.subarray(Math.max(0, s - w), Math.min(a.length, e + w));
}

// `say` → trimmed PCM, cached on voice+text.
function tts(voice, text) {
  const f = path.join(WORK, 'tts', hash(voice, text) + '.f32');
  if (!fs.existsSync(f)) {
    const aiff = f.replace(/\.f32$/, '.aiff');
    run('say', ['-v', voice, '-o', aiff, text]);
    writeF32(f, trim(decode(aiff)));
    fs.unlinkSync(aiff);
  }
  return readF32(f);
}

// ---------- text ----------
// "So, {um}, the strap" → [{w:'So,',filler:false},{w:'um,',filler:true},{w:'the'},...]
function tokens(raw) {
  const out = []; let filler = false;
  for (const part of raw.split(/(\{|\})/)) {
    if (part === '{') { filler = true; continue; }
    if (part === '}') { filler = false; continue; }
    // punctuation right after a closing brace ("{um}," ) belongs to the filler word
    const m = part.match(/^([,.?!;:]+)(.*)$/s);
    let rest = part;
    if (m && out.length) { out[out.length - 1].w += m[1]; rest = m[2]; }
    for (const w of rest.split(/\s+/).filter(Boolean)) out.push({ w, filler });
  }
  return out;
}
const plain = (raw) => tokens(raw).map((t) => t.w).join(' ');

// ---------- per source ----------
function voiceFor(src, sent, lang) { return cfg.voices[sent.sp || src.voice][lang]; }

function buildVoice(id, src) {
  // Narration: each sentence is spoken chunk by chunk (split after , and ?) so filler words get exact edges.
  const placed = []; const sentences = []; const words = [];
  let t = LEAD;
  src.sentences.forEach((sent, i) => {
    const toks = tokens(sent.t);
    const chunks = []; let cur = [];
    toks.forEach((tk, k) => { cur.push(tk); if (/[,?]$/.test(tk.w) && k < toks.length - 1) { chunks.push(cur); cur = []; } });
    chunks.push(cur);
    const s = t;
    chunks.forEach((ch, ci) => {
      const pcm = tts(voiceFor(src, sent, 'en'), ch.map((x) => x.w).join(' '));
      placed.push({ at: t, pcm });
      // chunk edges are exact (cutting [s, e] of a filler chunk removes all of it); inner words interpolated by length
      const len = pcm.length / SR;
      const total = ch.reduce((n, x) => n + x.w.length + 1, 0);
      let wt = t;
      for (const x of ch) {
        const d = (len * (x.w.length + 1)) / total;
        words.push({ i: words.length, w: x.w, s: r2(wt), e: r2(wt + d), sent: i, ...(x.filler ? { filler: true } : {}) });
        wt += d;
      }
      t += len + (ci < chunks.length - 1 ? COMMA_GAP : 0);
    });
    sentences.push({ i, s: r2(s), e: r2(t), ...(sent.sp ? { speaker: sent.sp } : {}), text: plain(sent.t), tr: Object.fromEntries(LANGS.map((l) => [l, sent[l]])) });
    t += sent.pause ?? PAUSE;
  });
  const duration = r2(t - (src.sentences.at(-1).pause ?? PAUSE) + TAIL);
  return { placed, sentences, words, duration };
}

function mixdown(placed, duration) {
  const out = new Float32Array(Math.ceil(duration * SR));
  for (const { at, pcm } of placed) {
    const o = Math.round(at * SR);
    for (let j = 0; j < pcm.length && o + j < out.length; j++) out[o + j] += pcm[j];
  }
  return out;
}

function buildDub(src, sentences, duration, lang) {
  const placed = [];
  sentences.forEach((S, i) => {
    let pcm = tts(voiceFor(src, src.sentences[i], lang), src.sentences[i][lang]);
    const slot = S.e - S.s, room = (sentences[i + 1]?.s ?? duration) - S.s - 0.05;
    const tempo = Math.min(1.25, Math.max(0.8, pcm.length / SR / slot));
    pcm = stretch(pcm, tempo);
    if (pcm.length / SR > room) {
      console.warn(`  ! ${lang} sentence ${i} overflows by ${(pcm.length / SR - room).toFixed(2)} s, faded out`);
      pcm = pcm.slice(0, Math.floor(room * SR));
      const f = Math.min(pcm.length, SR * 0.08);
      for (let j = 0; j < f; j++) pcm[pcm.length - 1 - j] *= j / f;
    }
    placed.push({ at: S.s, pcm });
  });
  return mixdown(placed, duration);
}

function stretch(pcm, tempo) {
  if (Math.abs(tempo - 1) < 0.01) return pcm;
  const key = createHash('sha1').update(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)).update(tempo.toFixed(4)).digest('hex').slice(0, 16);
  const f = path.join(WORK, 'tts', `t${key}.f32`);
  if (!fs.existsSync(f)) {
    writeF32(f + '.in', pcm);
    const b = run('ffmpeg', ['-v', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', f + '.in', '-af', `atempo=${tempo.toFixed(4)}`, '-f', 'f32le', '-']);
    fs.writeFileSync(f, b); fs.unlinkSync(f + '.in');
  }
  return readF32(f);
}

const aac = (inArgs, out) => ff(...inArgs, ...SPEECH, '-movflags', '+faststart', out);
const pcmIn = (f) => ['-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', f];

async function buildSource(id, src) {
  log(id, '· voice');
  const dir = path.join(OUT, id), work = path.join(WORK, id);
  mkdir(dir); mkdir(work);
  const { placed, sentences, words, duration } = buildVoice(id, src);
  const voiceF = path.join(work, 'voice.f32');
  writeF32(voiceF, mixdown(placed, duration));

  // clean.m4a = voice only ("studio sound")
  aac(pcmIn(voiceF), path.join(dir, 'clean.m4a'));
  // original mix = voice + low room noise + 50 Hz hum
  const origF = path.join(work, 'original.wav');
  ff(...pcmIn(voiceF),
    '-f', 'lavfi', '-i', `anoisesrc=color=pink:amplitude=0.03:sample_rate=${SR}:duration=${duration}`,
    '-f', 'lavfi', '-i', `sine=frequency=50:sample_rate=${SR}:duration=${duration}`,
    '-filter_complex', '[1]lowpass=f=3000,volume=0.6[n];[2]volume=0.025[h];[0][n][h]amix=inputs=3:normalize=0,alimiter=limit=0.95',
    '-ac', '1', origF);

  for (const lang of LANGS) {
    log(id, '· dub', lang);
    const f = path.join(work, `dub-${lang}.f32`);
    writeF32(f, buildDub(src, sentences, duration, lang));
    aac(pcmIn(f), path.join(dir, `dub-${lang}.m4a`));
  }

  // shots on the timeline: a shot starts just before its first sentence and runs to the next shot
  const starts = src.shots.map((sh) => (sh.from === 0 ? 0 : Math.max(0, sentences[sh.from].s - 0.15)));
  const shots = src.shots.map((sh, k) => ({ s: r2(starts[k]), e: r2(starts[k + 1] ?? duration), label: sh.label, focus: sh.focus }));

  if (!AUDIO_ONLY) {
    log(id, '· video');
    const list = [];
    for (const [k, sh] of src.shots.entries()) {
      const len = shots[k].e - shots[k].s, seg = path.join(work, `shot-${String(k).padStart(2, '0')}.mp4`);
      const avail = probeDur(clipFile(sh.clip)) - sh.in;
      if (avail < len) console.warn(`  ! ${id} shot ${k} (${sh.clip}) needs ${len.toFixed(1)} s, clip has ${avail.toFixed(1)} s from in=${sh.in}: looping`);
      ff('-ss', String(sh.in), '-stream_loop', '-1', '-i', clipFile(sh.clip), '-t', len.toFixed(3), '-map', '0:v:0',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=25,setsar=1',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', seg);
      list.push(`file '${seg}'`);
    }
    fs.writeFileSync(path.join(work, 'shots.txt'), list.join('\n'));
    const mp4 = path.join(dir, 'video.mp4');
    const v = ['-f', 'concat', '-safe', '0', '-i', path.join(work, 'shots.txt'), '-i', origF, '-map', '0:v', '-map', '1:a', '-t', String(duration),
      '-vf', 'hqdn3d=2:1.5:3:3', ...X264, '-b:v', `${VIDEO_KBPS}k`, '-passlogfile', path.join(work, 'x264')];
    ff(...v, '-pass', '1', '-an', '-f', 'null', '/dev/null');
    ff(...v, '-pass', '2', ...SPEECH, '-movflags', '+faststart', mp4);
    const mid = (sentences[0].s + sentences[0].e) / 2;
    ff('-ss', mid.toFixed(2), '-i', mp4, '-frames:v', '1', '-q:v', '4', path.join(dir, 'poster.jpg'));
    const n = Math.ceil(duration / 2);
    ff('-i', mp4, '-vf', `fps=1/2,scale=160:90,tile=${n}x1`, '-frames:v', '1', '-q:v', '6', path.join(dir, 'strip.jpg'));
  }

  const chapters = src.chapters?.map((c, k, all) => {
    const s = c.from === 0 ? 0 : sentences[c.from].s - 0.15;
    const next = all[k + 1];
    return { title: c.title, s: r2(s), e: r2(next ? sentences[next.from].s - 0.15 : duration), display: c.display };
  });
  return { duration, sentences, words, shots, ...(chapters ? { chapters } : {}) };
}

async function buildBroll() {
  const dir = path.join(OUT, 'broll'); mkdir(dir);
  for (const b of cfg.broll) {
    log('broll', b.id);
    ff('-ss', String(b.in), '-i', clipFile(b.clip), '-t', String(b.dur), '-an',
      '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=25,setsar=1',
      ...X264, '-b:v', `${BROLL_KBPS}k`, '-maxrate', `${BROLL_KBPS * 2}k`, '-bufsize', `${BROLL_KBPS * 2}k`, '-movflags', '+faststart', path.join(dir, `${b.id}.mp4`));
  }
}

async function buildMusic() {
  const dir = path.join(OUT, 'music'); mkdir(dir);
  for (const m of cfg.music) {
    log('music', m.id, m.title);
    const src = await download(m.url, path.join(FOOT, `music-${m.id}.mp3`));
    ff('-ss', String(m.in ?? 0), '-i', src, '-t', '60', '-af', 'afade=t=in:d=1,afade=t=out:st=57:d=3',
      '-ar', '44100', '-ac', '2', '-c:a', 'aac_at', '-profile:a', '4', '-b:a', '48k', '-movflags', '+faststart', path.join(dir, `${m.id}.m4a`));
  }
}

// ---------- main ----------
mkdir(FOOT); mkdir(path.join(WORK, 'tts')); mkdir(OUT);
const ids = ONLY.length ? ONLY : Object.keys(cfg.sources);
const clips = new Set([...ids.flatMap((id) => cfg.sources[id].shots.map((s) => s.clip)), ...(ONLY.length ? [] : cfg.broll.map((b) => b.clip))]);
for (const c of clips) await download(cfg.footage[c].url, clipFile(c));

const transcripts = fs.existsSync(JSON_OUT) ? JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')) : {};
for (const id of ids) transcripts[id] = await buildSource(id, cfg.sources[id]);
if (!ONLY.length) { await buildBroll(); await buildMusic(); }
fs.writeFileSync(JSON_OUT, JSON.stringify(transcripts, null, 1) + '\n');

const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
for (const id of ids) console.log(`${id}: ${transcripts[id].duration} s, ${transcripts[id].sentences.length} sentences, ${transcripts[id].words.length} words, ${(size(path.join(OUT, id)) / 1e6).toFixed(2)} MB`);
console.log(`public/media: ${(size(OUT) / 1e6).toFixed(2)} MB`);
