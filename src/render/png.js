// SPDX-License-Identifier: Apache-2.0

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/**
 * @param {Uint8Array} buf
 * @param {number} a
 * @param {number} b
 */
export function crc32(buf, a, b) {
  let c = 0xffffffff;
  for (let i = a; i < b; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * @param {string} type
 * @param {Uint8Array} data
 */
export function pngChunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

/**
 * Streaming PNG encoder (deflate via CompressionStream).
 * @param {number} W
 * @param {number} H
 */
export function pngStream(W, H) {
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr)];
  const reading = (async () => {
    const rd = cs.readable.getReader();
    for (;;) {
      const { value, done } = await rd.read();
      if (done) break;
      parts.push(pngChunk('IDAT', value));
    }
  })();
  reading.catch(() => {});
  return {
    write: (/** @type {Uint8Array} */ data) => writer.write(/** @type {BufferSource} */ (data)),
    async close() {
      await writer.close();
      await reading;
      parts.push(pngChunk('IEND', new Uint8Array(0)));
      return new Blob(parts, { type: 'image/png' });
    },
    abort() {
      try {
        writer.abort();
      } catch {
        /* already closed */
      }
    },
  };
}

/**
 * PNG filter type 1 (Sub) on RGB row band.
 * @param {Uint8Array} band
 * @param {number} W
 * @param {number} bh
 */
export function filterRows(band, W, bh) {
  const stride = W * 3;
  const out = new Uint8Array(bh * (stride + 1));
  for (let y = 0; y < bh; y++) {
    const o = y * (stride + 1);
    const b = y * stride;
    out[o] = 1;
    out[o + 1] = band[b];
    out[o + 2] = band[b + 1];
    out[o + 3] = band[b + 2];
    for (let i = 3; i < stride; i++) out[o + 1 + i] = (band[b + i] - band[b + i - 3]) & 255;
  }
  return out;
}
