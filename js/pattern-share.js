/* Compact, URL-safe encoding for bracelet patterns. Shared by the browser and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CARA_PATTERN_SHARE = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";

  function encode(data, palette) {
    if (!Array.isArray(data) || !data.length || !Array.isArray(data[0]) || !data[0].length) {
      throw new TypeError("Pattern must be a non-empty rectangular grid.");
    }
    const width = data[0].length;
    if (data.some((row) => !Array.isArray(row) || row.length !== width)) {
      throw new TypeError("Pattern rows must have equal width.");
    }
    const indices = new Map(palette.map((item, index) => [item.code, index]));
    return data.flat().map((code) => {
      if (code == null || code === "") return "-";
      const index = indices.get(code);
      if (!Number.isInteger(index) || index < 0 || index >= ALPHABET.length) {
        throw new TypeError("Pattern contains an unknown bead color.");
      }
      return ALPHABET[index];
    }).join("");
  }

  function decode(packed, width, height, palette, limits) {
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        width < 1 || height < 1 || width > limits.MAX_W || height > limits.MAX_H ||
        typeof packed !== "string" || packed.length !== width * height) return null;
    const indices = new Map(palette.map((item, index) => [index, item.code]));
    const data = [];
    for (let r = 0; r < height; r++) {
      const row = [];
      for (let c = 0; c < width; c++) {
        const char = packed[r * width + c];
        if (char === "-") row.push(null);
        else {
          const index = ALPHABET.indexOf(char);
          if (index < 0 || !indices.has(index)) return null;
          row.push(indices.get(index));
        }
      }
      data.push(row);
    }
    return { width, height, data };
  }

  function parseHash(hash, palette, limits) {
    if (typeof hash !== "string") return null;
    const match = hash.match(/^#pattern=(\d+)x(\d+):([A-Za-z0-9_-]+)$/);
    if (!match) return null;
    return decode(match[3], Number(match[1]), Number(match[2]), palette, limits);
  }

  function makeHash(data, palette) {
    const packed = encode(data, palette);
    return "#pattern=" + data[0].length + "x" + data.length + ":" + packed;
  }

  return Object.freeze({ encode, decode, parseHash, makeHash });
});
