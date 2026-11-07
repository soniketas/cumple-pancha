// One-off helper to process a guestbook submission (photo + name) into images/
// and print the HTML snippet to paste into index.html.
//
// Usage: node add-guestbook-photo.mjs <source.jpg> <outputName> "<Name>"
import sharp from "sharp";

const [, , src, outName, name] = process.argv;
if (!src || !outName || !name) {
  console.error('Usage: node add-guestbook-photo.mjs <source.jpg> <outputName> "<Name>"');
  process.exit(1);
}

const out = `images/${outName}.webp`;
const img = sharp(src).rotate();
const meta = await img.metadata();
const width = Math.min(1600, meta.width);
const height = Math.round((meta.height / meta.width) * width);
const barHeight = Math.round(height * 0.09);

const svg = `
<svg width="${width}" height="${height}">
  <rect x="0" y="${height - barHeight}" width="${width}" height="${barHeight}" fill="black" fill-opacity="0.55" />
  <text x="24" y="${height - barHeight / 2}" dy="0.35em"
        font-family="Space Mono, monospace" font-size="${Math.round(barHeight * 0.4)}"
        fill="#f4f2ee">${name}</text>
</svg>`;

await img
  .resize({ width })
  .composite([{ input: Buffer.from(svg) }])
  .webp({ quality: 82 })
  .toFile(out);

console.log(`Wrote ${out} (${width}x${height})`);
