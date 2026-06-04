/*
 * Concatenate the four recorded segments into one MP4 with short crossfades
 * between them (the segment boundaries are the biggest cuts — different users),
 * normalising each to 1280x720 / 25fps first.
 *
 *   node walkthrough-out/assemble.cjs [crossfadeSeconds]
 */
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

const RAW = path.resolve(__dirname, 'raw')
const OUT = path.resolve(__dirname, 'lend-and-tend-walkthrough.mp4')
const XF = parseFloat(process.argv[2] || '0.6')

const ORDER = [
  '1-lender-posts',
  '2-tender-messages',
  '3-lender-agreement',
  '4-tender-accepts',
]

function seg(dir) {
  const full = path.join(RAW, dir)
  const f = fs.readdirSync(full).filter((x) => x.endsWith('.webm'))
  if (!f.length) throw new Error(`no webm in ${dir}`)
  return path.join(full, f[0])
}

function duration(file) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${file}"`
  )
    .toString()
    .trim()
  return parseFloat(out)
}

const files = ORDER.map(seg)
const durs = files.map(duration)

// Normalise each input to a common timebase/size/fps.
const norm = files
  .map(
    (_, i) =>
      `[${i}:v]settb=AVTB,fps=25,scale=1280:720,setsar=1,format=yuv420p[v${i}]`
  )
  .join(';')

// Chain xfade crossfades. offset_k = sum(d[0..k-1]) - k*XF
let chain = ''
let prev = 'v0'
let acc = 0
for (let k = 1; k < files.length; k++) {
  acc += durs[k - 1]
  const offset = (acc - k * XF).toFixed(3)
  const out = k === files.length - 1 ? 'vout' : `x${k}`
  chain += `;[${prev}][v${k}]xfade=transition=fade:duration=${XF}:offset=${offset}[${out}]`
  prev = out
}

const filter = norm + chain
const inputs = files.map((f) => `-i "${f}"`).join(' ')
const cmd =
  `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[vout]" ` +
  `-c:v libx264 -crf 21 -preset medium -pix_fmt yuv420p -movflags +faststart "${OUT}"`

console.log('durations:', durs.map((d) => d.toFixed(1)).join(', '))
console.log('crossfade:', XF, 's')
execSync(cmd, { stdio: 'inherit' })
const total = execSync(
  `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${OUT}"`
)
  .toString()
  .trim()
console.log(`OUT=${OUT} duration=${total}s`)
