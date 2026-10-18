// SPDX-License-Identifier: Apache-2.0
/**
 * Dev-time: vendor a small subset of the Versilian Community Sample Library (CC0) into third_party/vcsl.
 * Downloads only the selected WAVs from one pinned commit, trims and fades them with ffmpeg, encodes mono
 * MP3, and writes manifest.json + SOURCE.md. Re-run to regenerate; needs ffmpeg on PATH and network.
 *
 *   node scripts/vcsl-fetch.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = 'sgossner/VCSL';
const SHA = 'c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e';
const OUT = 'third_party/vcsl';
const NOTE = /(?:^|_)([A-G]#?\d)(?=_|\.)/;

/**
 * Instruments. `dir` is the VCSL folder, `match` picks one layer/round robin, `notes` (optional) keeps a
 * subset of pitches, `len` is the kept length in seconds (tail faded), `kbps` the MP3 bitrate.
 * Unpitched instruments name their files with `as` instead of a note.
 */
const SPEC = {
  vibes: {
    dir: 'Idiophones/Struck Idiophones/Vibraphone/Soft Mallets',
    match: /_v1_rr1_|C3_v1_rr2|E3_v1_rr2/,
    len: 4.5,
  },
  vibesBowed: {
    dir: 'Idiophones/Struck Idiophones/Vibraphone/Bowed',
    match: /_rr1_/,
    len: 8,
    kbps: 64,
  },
  marimba: { dir: 'Idiophones/Struck Idiophones/Marimba', match: /_med_01/, len: 3.5 },
  glock: { dir: 'Idiophones/Struck Idiophones/Glockenspiel', match: /^glock_medium_/, len: 4 },
  chimes: {
    dir: 'Idiophones/Struck Idiophones/Hand Chimes',
    match: /^sus_/,
    notes: ['C3', 'E3', 'G#3', 'C4', 'E4', 'G#4', 'C5', 'E5', 'G#5', 'C6'],
    len: 4.5,
  },
  glasses: {
    dir: 'Idiophones/Friction Idiophones/Wine Glasses/Sustains',
    match: /_Slow_/,
    len: 8,
    kbps: 64,
  },
  kalimba: { dir: 'Idiophones/Plucked Idiophones/Kalimba, Kenya', match: /_vl3_rr2/, len: 4 },
  harp: {
    dir: 'Chordophones/Composite Chordophones/Concert Harp',
    match: /_mf\d\.wav$/,
    notes: ['B1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5', 'G5'],
    len: 5,
  },
  organ: {
    dir: 'Aerophones/Edge-blown Aerophones/Pipe Organ',
    match: /^NT5_Man3Quiet_/,
    notes: ['C2', 'F#2', 'C3', 'F#3', 'C4', 'F#4', 'C5'],
    len: 8,
    kbps: 64,
  },
  frameDrum: {
    dir: 'Membranophones/Struck Membranophones/Frame Drum',
    files: {
      low: 'HDrumL_Hit_v2_rr1_Sum.wav',
      high: 'HDrumS_Hit_v2_rr1_Sum.wav',
      muted: 'HDrumL_HitMuted_v2_rr1_Sum.wav',
    },
    len: 2.5,
  },
  slitDrum: {
    dir: 'Idiophones/Struck Idiophones/Slit Drum',
    files: { low: 'LogDrumLo_MedM_v2_rr1_Sum.wav', high: 'LogDrumHi_MedM_v2_rr1_Sum.wav' },
    len: 2,
  },
  gong: {
    dir: 'Idiophones/Struck Idiophones/Gong 1',
    files: { swell: 'gong_p.wav' },
    len: 8,
    kbps: 64,
  },
  markTrees: {
    dir: 'Idiophones/Struck Idiophones/Mark Trees/Legacy',
    files: { down: 'windchimes_slowDesc1.wav', up: 'windchimes_asc1.wav' },
    len: 5,
  },
};

/** "C#4" -> "Cs4": a '#' in a URL would start a fragment. */
const fileFor = (key) => key.replace('#', 's') + '.mp3';

function convert(src, dst, len, kbps) {
  const fadeAt = Math.max(0, len - 1.2);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    src,
    '-af',
    `silenceremove=start_periods=1:start_threshold=-60dB,atrim=0:${len},afade=t=out:st=${fadeAt}:d=1.2`,
    '-ac',
    '1',
    '-ar',
    '44100',
    '-b:a',
    `${kbps}k`,
    dst,
  ]);
}

async function main() {
  const tree = await (
    await fetch(`https://api.github.com/repos/${REPO}/git/trees/${SHA}?recursive=1`)
  ).json();
  if (!Array.isArray(tree.tree))
    throw new Error('could not list the VCSL tree: ' + JSON.stringify(tree).slice(0, 200));
  const blobs = tree.tree.filter((t) => t.type === 'blob').map((t) => t.path);
  const tmp = mkdtempSync(join(tmpdir(), 'vcsl-'));
  rmSync(OUT, { recursive: true, force: true });
  const manifest = {
    source: `https://github.com/${REPO}/tree/${SHA}`,
    license: 'CC0-1.0',
    instruments: {},
  };
  const used = [];
  try {
    for (const [name, spec] of Object.entries(SPEC)) {
      const picks = {};
      if (spec.files) {
        for (const [as, file] of Object.entries(spec.files)) picks[as] = `${spec.dir}/${file}`;
      } else {
        for (const path of blobs) {
          if (!path.startsWith(spec.dir + '/') || !path.endsWith('.wav')) continue;
          const base = path.slice(path.lastIndexOf('/') + 1);
          if (!spec.match.test(base)) continue;
          const m = NOTE.exec(base);
          if (!m) continue;
          const note = m[1];
          if (spec.notes && !spec.notes.includes(note)) continue;
          if (!picks[note]) picks[note] = path;
        }
      }
      if (!Object.keys(picks).length) throw new Error(`${name}: no files matched`);
      mkdirSync(join(OUT, name), { recursive: true });
      const map = {};
      for (const [key, path] of Object.entries(picks)) {
        const res = await fetch(
          `https://raw.githubusercontent.com/${REPO}/${SHA}/${path.split('/').map(encodeURIComponent).join('/')}`,
        );
        if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
        const wav = join(tmp, `${name}-${fileFor(key)}.wav`);
        writeFileSync(wav, Buffer.from(await res.arrayBuffer()));
        const file = fileFor(key);
        convert(wav, join(OUT, name, file), spec.len, spec.kbps || 96);
        map[key] = file;
        used.push(path);
        process.stdout.write(`${name}/${file} `);
      }
      manifest.instruments[name] = { pitched: !spec.files, files: map };
      process.stdout.write('\n');
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const lic = await fetch(`https://raw.githubusercontent.com/${REPO}/${SHA}/LICENSE`);
  if (!lic.ok) throw new Error(`LICENSE: HTTP ${lic.status}`);
  writeFileSync(join(OUT, 'LICENSE'), await lic.text());
  let bytes = 0;
  for (const [name, inst] of Object.entries(manifest.instruments))
    for (const f of Object.values(inst.files)) bytes += statSync(join(OUT, name, f)).size;
  writeFileSync(
    join(OUT, 'SOURCE.md'),
    `# Versilian Community Sample Library (subset)

<!-- SPDX-License-Identifier: CC0-1.0 -->

Samples by Versilian Studios, from the [Versilian Community Sample Library](https://github.com/${REPO}) at commit \`${SHA}\`, released under [CC0 1.0](LICENSE) (public domain). Thanks to Versilian Studios; attribution is not required.

Generated by \`node scripts/vcsl-fetch.mjs\`: one velocity layer and round robin per note, leading silence trimmed, tail faded, mono MP3. ${used.length} files, ${(bytes / 1048576).toFixed(1)} MB. Played by the experimental Sound feature (\`src/audio/\`).

## Upstream files

${used.map((p) => `- \`${p}\``).join('\n')}
`,
  );
  console.log(`\n${used.length} files, ${(bytes / 1048576).toFixed(2)} MB -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
