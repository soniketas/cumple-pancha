import sharp from "sharp";
import { readdirSync } from "fs";

const files = readdirSync("tmp_png").filter((f) => f.endsWith(".png"));

for (const f of files) {
  const out = `images/${f.replace(".png", ".webp")}`;
  await sharp(`tmp_png/${f}`)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  console.log(out);
}
