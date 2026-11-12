import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const publicDir = new URL('../public/', import.meta.url);
const favicon = await readFile(new URL('favicon.svg', publicDir));
const appIcon = await readFile(new URL('icon.svg', publicDir));
await mkdir(new URL('icons/', publicDir), { recursive: true });
for (const size of [16, 32]) {
  await sharp(favicon).resize(size, size).png().toFile(new URL(`favicon-${size}x${size}.png`, publicDir).pathname);
}
for (const [path, size] of [['apple-touch-icon.png', 180], ['icons/icon-192.png', 192], ['icons/icon-512.png', 512]]) {
  // iOS applies its own corner mask; provide a fully opaque square.
  await sharp(appIcon).resize(size, size).removeAlpha().png().toFile(new URL(path, publicDir).pathname);
}

// Classic 32-bit DIB frames provide an ICO fallback without another image dependency.
const frames = [];
for (const size of [16, 32, 48]) {
  const rgba = await sharp(favicon).resize(size, size).ensureAlpha().raw().toBuffer();
  const pixels = Buffer.alloc(size * size * 4);
  const maskRow = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskRow * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const from = (y * size + x) * 4;
      const to = ((size - 1 - y) * size + x) * 4;
      pixels[to] = rgba[from + 2]; pixels[to + 1] = rgba[from + 1];
      pixels[to + 2] = rgba[from]; pixels[to + 3] = rgba[from + 3];
      if (rgba[from + 3] < 128) mask[(size - 1 - y) * maskRow + (x >> 3)] |= 1 << (7 - (x % 8));
    }
  }
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4); header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12); header.writeUInt16LE(32, 14);
  header.writeUInt32LE(pixels.length + mask.length, 20);
  frames.push({ size, bytes: Buffer.concat([header, pixels, mask]) });
}
const directory = Buffer.alloc(6 + frames.length * 16);
directory.writeUInt16LE(1, 2); directory.writeUInt16LE(frames.length, 4);
let offset = directory.length;
for (const [index, frame] of frames.entries()) {
  const entry = 6 + index * 16;
  directory[entry] = frame.size; directory[entry + 1] = frame.size;
  directory.writeUInt16LE(1, entry + 4); directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.bytes.length, entry + 8); directory.writeUInt32LE(offset, entry + 12);
  offset += frame.bytes.length;
}
await writeFile(new URL('favicon.ico', publicDir), Buffer.concat([directory, ...frames.map(frame => frame.bytes)]));
console.log('Generated browser favicons, opaque 180px Apple Touch icon, and 192/512px manifest icons.');
