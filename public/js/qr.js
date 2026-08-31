/**
 * QR Code generator (ISO/IEC 18004), byte mode.
 *
 * Written into the project rather than pulled from a CDN: the invoice has to
 * print correctly on an office machine with no internet, and the pages load as
 * plain ES modules with no build step.
 *
 * Only byte mode is implemented, which covers URLs and any other text once it
 * is UTF-8 encoded. The version is chosen automatically as the smallest that
 * fits, and all eight mask patterns are scored so the printed symbol is the
 * easiest one for a phone camera to read.
 */

const ECC_LEVELS = { L: 0, M: 1, Q: 2, H: 3 };

// Error-correction codewords per block, indexed [level][version]. Index 0 of
// each row is unused so that the version number indexes directly.
const ECC_CODEWORDS_PER_BLOCK = [
  [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

const NUM_ERROR_CORRECTION_BLOCKS = [
  [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

/* ------------------------------ GF(256) maths ----------------------------- */

const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // the primitive polynomial for QR codes
  }
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[(LOG[a] + LOG[b]) % 255]);

/** Divisor polynomial for `degree` error-correction codewords. */
function rsDivisor(degree) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = mul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = mul(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i += 1) result[i] ^= mul(divisor[i], factor);
  }
  return result;
}

/* ------------------------------- capacities ------------------------------- */

/** Total modules available for data and error correction, before formatting. */
function rawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const rawCodewords = (version) => Math.floor(rawDataModules(version) / 8);

function dataCodewords(version, ecl) {
  return rawCodewords(version)
    - ECC_CODEWORDS_PER_BLOCK[ecl][version] * NUM_ERROR_CORRECTION_BLOCKS[ecl][version];
}

function alignmentPositions(version) {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26
    : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  // Built in ascending order: the three finder corners are identified by index,
  // so the row/column list has to run from 6 upwards.
  const positions = [];
  for (let pos = version * 4 + 10; positions.length < numAlign - 1; pos -= step) positions.unshift(pos);
  positions.unshift(6);
  return positions;
}

/* -------------------------------- encoding -------------------------------- */

class BitBuffer {
  constructor() { this.bits = []; }
  put(value, length) {
    for (let i = length - 1; i >= 0; i -= 1) this.bits.push((value >>> i) & 1);
  }
  get length() { return this.bits.length; }
}

function encodeData(bytes, version, ecl) {
  const capacityBits = dataCodewords(version, ecl) * 8;
  const bb = new BitBuffer();
  bb.put(0b0100, 4);                               // byte mode
  bb.put(bytes.length, version <= 9 ? 8 : 16);     // character count
  for (const b of bytes) bb.put(b, 8);
  bb.put(0, Math.min(4, capacityBits - bb.length)); // terminator
  bb.put(0, (8 - bb.length % 8) % 8);               // pad to a whole codeword

  const out = new Uint8Array(capacityBits / 8);
  for (let i = 0; i < bb.length; i += 1) out[i >>> 3] |= bb.bits[i] << (7 - (i & 7));
  // Alternating pad codewords fill whatever is left, as the standard requires.
  for (let i = bb.length / 8, pad = 0xec; i < out.length; i += 1, pad ^= 0xec ^ 0x11) out[i] = pad;
  return out;
}

/** Splits the data into blocks, appends error correction, and interleaves. */
function addEccAndInterleave(data, version, ecl) {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][version];
  const total = rawCodewords(version);
  const numShort = numBlocks - total % numBlocks;
  const shortLen = Math.floor(total / numBlocks);

  const divisor = rsDivisor(blockEccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i += 1) {
    const len = shortLen - blockEccLen + (i < numShort ? 0 : 1);
    const dat = data.slice(k, k + len);
    k += len;
    blocks.push({ dat, ecc: rsRemainder(dat, divisor) });
  }

  const out = new Uint8Array(total);
  let p = 0;
  const maxDat = shortLen - blockEccLen + 1;
  for (let i = 0; i < maxDat; i += 1) {
    for (const b of blocks) if (i < b.dat.length) out[p++] = b.dat[i];
  }
  for (let i = 0; i < blockEccLen; i += 1) {
    for (const b of blocks) out[p++] = b.ecc[i];
  }
  return out;
}

/* ------------------------------ module layout ----------------------------- */

class Grid {
  constructor(version) {
    this.version = version;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.reserved = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
  }

  set(x, y, dark, reserve = true) {
    this.modules[y][x] = dark;
    if (reserve) this.reserved[y][x] = true;
  }

  drawFunctionPatterns() {
    const n = this.size;
    for (let i = 0; i < n; i += 1) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    this.finder(3, 3);
    this.finder(n - 4, 3);
    this.finder(3, n - 4);

    const positions = alignmentPositions(this.version);
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = 0; j < positions.length; j += 1) {
        const corner = (i === 0 && j === 0) || (i === 0 && j === positions.length - 1)
          || (i === positions.length - 1 && j === 0);
        if (!corner) this.alignment(positions[i], positions[j]);
      }
    }

    // Format information is written later; reserve exactly the cells it uses.
    // Row 8 skips column 6 and column 8 skips row 6, because those two belong
    // to the timing patterns — blanking them here would break the symbol.
    for (let i = 0; i <= 8; i += 1) {
      if (i === 6) continue;
      this.set(8, i, false);
      this.set(i, 8, false);
    }
    for (let i = 0; i < 8; i += 1) this.set(n - 1 - i, 8, false);
    for (let i = n - 8; i < n; i += 1) this.set(8, i, false);
    this.set(8, n - 8, true); // the module that is always dark

    if (this.version >= 7) {
      let rem = this.version;
      for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (this.version << 12) | rem;
      for (let i = 0; i < 18; i += 1) {
        const bit = ((bits >>> i) & 1) === 1;
        const a = n - 11 + i % 3;
        const b = Math.floor(i / 3);
        this.set(a, b, bit); this.set(b, a, bit);
      }
    }
  }

  finder(cx, cy) {
    for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= this.size || y >= this.size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      this.set(x, y, d !== 2 && d !== 4);
    }
  }

  alignment(cx, cy) {
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      this.set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  /** Zig-zag placement of the codeword bits, skipping the function patterns. */
  drawCodewords(data) {
    const n = this.size;
    let i = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // the vertical timing pattern is not a column
      for (let v = 0; v < n; v += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? n - 1 - v : v;
          if (this.reserved[y][x] || i >= data.length * 8) continue;
          this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i += 1;
        }
      }
    }
  }

  applyMask(mask) {
    const f = [
      (x, y) => (x + y) % 2,
      (x, y) => y % 2,
      (x, y) => x % 3,
      (x, y) => (x + y) % 3,
      (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2,
      (x, y) => (x * y) % 2 + (x * y) % 3,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2,
      (x, y) => ((x + y) % 2 + (x * y) % 3) % 2,
    ][mask];
    for (let y = 0; y < this.size; y += 1) for (let x = 0; x < this.size; x += 1) {
      if (!this.reserved[y][x] && f(x, y) === 0) this.modules[y][x] = !this.modules[y][x];
    }
  }

  drawFormat(ecl, mask) {
    const eclBits = [1, 0, 3, 2][ecl]; // L, M, Q, H in the format-information order
    const value = (eclBits << 3) | mask;
    let rem = value;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((value << 10) | rem) ^ 0x5412;
    const n = this.size;
    const bit = (i) => ((bits >>> i) & 1) === 1;

    for (let i = 0; i <= 5; i += 1) this.set(8, i, bit(i));
    this.set(8, 7, bit(6));
    this.set(8, 8, bit(7));
    this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) this.set(14 - i, 8, bit(i));

    for (let i = 0; i < 8; i += 1) this.set(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) this.set(8, n - 15 + i, bit(i));
    this.set(8, n - 8, true);
  }

  /** The standard's four penalty rules; the lowest-scoring mask is used. */
  penalty() {
    const n = this.size;
    const m = this.modules;
    let score = 0;

    const runScore = (run) => (run >= 5 ? run - 2 : 0);
    for (const horizontal of [true, false]) {
      for (let a = 0; a < n; a += 1) {
        let run = 1;
        const at = (b) => (horizontal ? m[a][b] : m[b][a]);
        const history = [0, 0, 0, 0, 0, 0, 0];
        let colour = at(0);
        for (let b = 1; b < n; b += 1) {
          if (at(b) === colour) { run += 1; continue; }
          score += runScore(run);
          history.pop(); history.unshift(run);
          if (colour) score += this.finderLike(history) * 40;
          run = 1; colour = at(b);
        }
        score += runScore(run);
        history.pop(); history.unshift(run);
        if (colour) score += this.finderLike(history) * 40;
        history.pop(); history.unshift(n);
        score += this.finderLike(history) * 40;
      }
    }

    for (let y = 0; y < n - 1; y += 1) for (let x = 0; x < n - 1; x += 1) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }

    let dark = 0;
    for (const row of m) for (const cell of row) if (cell) dark += 1;
    const total = n * n;
    score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return score;
  }

  /** Counts 1:1:3:1:1 patterns with four light modules on one side. */
  finderLike(h) {
    const [a, b, c, d, e, f] = h;
    const core = b > 0 && b === d && b === e && b === f && c === b * 3;
    if (!core) return 0;
    return (a >= b * 4 ? 1 : 0) + (h[6] >= b * 4 ? 1 : 0);
  }
}

/* --------------------------------- public --------------------------------- */

/**
 * Builds the module matrix for `text`.
 * @returns {{ size:number, modules:boolean[][], version:number }}
 */
export function qrMatrix(text, level = 'M') {
  const ecl = ECC_LEVELS[level] ?? ECC_LEVELS.M;
  const bytes = new TextEncoder().encode(String(text));

  let version = 0;
  for (let v = 1; v <= 40; v += 1) {
    const headerBits = 4 + (v <= 9 ? 8 : 16);
    if (headerBits + bytes.length * 8 <= dataCodewords(v, ecl) * 8) { version = v; break; }
  }
  if (!version) throw new Error('Text is too long for a QR code');

  const data = addEccAndInterleave(encodeData(bytes, version, ecl), version, ecl);
  const grid = new Grid(version);
  grid.drawFunctionPatterns();
  grid.drawCodewords(data);

  let best = null;
  for (let mask = 0; mask < 8; mask += 1) {
    grid.applyMask(mask);
    grid.drawFormat(ecl, mask);
    const score = grid.penalty();
    if (!best || score < best.score) best = { mask, score };
    grid.applyMask(mask); // masking is its own inverse, so this undoes it
  }
  grid.applyMask(best.mask);
  grid.drawFormat(ecl, best.mask);

  return { size: grid.size, modules: grid.modules, version };
}

/**
 * An <svg> element for `text`. Vector output so the printed invoice stays sharp
 * whatever the printer's resolution.
 */
export function qrSvg(text, { size = 120, level = 'M', margin = 2, dark = '#101F40', light = '#ffffff' } = {}) {
  const { size: n, modules } = qrMatrix(text, level);
  const dim = n + margin * 2;
  const parts = [];
  for (let y = 0; y < n; y += 1) {
    let x = 0;
    while (x < n) {
      if (!modules[y][x]) { x += 1; continue; }
      let run = 1;
      while (x + run < n && modules[y][x + run]) run += 1;
      parts.push(`M${x + margin} ${y + margin}h${run}v1h-${run}z`);
      x += run;
    }
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${dim} ${dim}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img');
  svg.innerHTML = `<rect width="${dim}" height="${dim}" fill="${light}"/>`
    + `<path d="${parts.join('')}" fill="${dark}"/>`;
  return svg;
}
