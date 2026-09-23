import { inflateSync } from "node:zlib";

/**
 * How much of a screenshot is something other than its background.
 *
 * "Did this render?" cannot be answered from the DOM: an iframe can exist, load, report
 * ready and still show one flat colour — which is exactly the complaint this measures.
 * The pixels are the only honest answer, and decoding the screenshots Playwright already
 * produces keeps it dependency-free. Handles what Playwright writes: 8-bit RGB or RGBA,
 * not interlaced.
 */
export function decodePng(buffer) {
  let offset = 8, width = 0, height = 0, colourType = 0;
  const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[12] !== 0) throw new Error("only 8-bit, non-interlaced PNG is supported");
      colourType = body[9];
    } else if (type === "IDAT") data.push(body);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  const channels = colourType === 6 ? 4 : colourType === 2 ? 3 : 0;
  if (!channels) throw new Error(`unsupported PNG colour type ${colourType}`);
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const corner = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let value = row[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - corner, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - corner);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
      }
      pixels[y * stride + x] = value & 255;
    }
  }
  return { width, height, channels, pixels };
}

/**
 * The share of pixels that differ clearly from the most common colour, from 0 to 1.
 *
 * The most common colour stands in for the background, whatever the element chose for
 * one. A flat surface scores 0; a line of card-sized text scores around 0.005; anything
 * a person would call "showing something" scores well above that.
 */
export function inkShare(buffer) {
  return measureInk(buffer).share;
}

/**
 * Whether a screenshot shows something, by share or by absolute amount.
 *
 * Share alone fails on large frames: a small, sparse design — an orbit of hairline rings
 * round a glyph — is the whole element, but opened full screen it is a fraction of a
 * percent of the frame. So a view also counts once it holds more inked pixels than a
 * line of card text does (about 580).
 */
export function painted(buffer) {
  const { share, pixels } = measureInk(buffer);
  return share >= 0.003 || pixels >= 400;
}

/** Both measures at once: the share of the frame, and the count of pixels. */
export function measureInk(buffer) {
  const { width, height, channels, pixels } = decodePng(buffer);
  const counts = new Map();
  for (let i = 0; i < pixels.length; i += channels) {
    const key = ((pixels[i] >> 4) << 8) | ((pixels[i + 1] >> 4) << 4) | (pixels[i + 2] >> 4);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let modal = 0, most = -1;
  for (const [key, count] of counts) if (count > most) { most = count; modal = key; }
  const r = ((modal >> 8) & 15) * 16 + 8, g = ((modal >> 4) & 15) * 16 + 8, b = (modal & 15) * 16 + 8;
  let ink = 0;
  for (let i = 0; i < pixels.length; i += channels) {
    if (Math.abs(pixels[i] - r) + Math.abs(pixels[i + 1] - g) + Math.abs(pixels[i + 2] - b) > 48) ink += 1;
  }
  return { share: ink / (width * height), pixels: ink };
}
