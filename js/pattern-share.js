/* Compact, URL-safe encoding for bracelet patterns.
   New v2 hashes carry stable bead color codes; v1 hashes remain readable. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CARA_PATTERN_SHARE = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";

  /* Frozen order used by all v1 links before stable color IDs were introduced.
     Do not reorder this list: old shared URLs depend on these exact indices. */
  const LEGACY_CODES = Object.freeze([
    "FGB0370", "DB0010", "DB0654", "DB0757", "DB2103", "DB0310",
    "DB0732", "DB0726", "DB0727", "DB0157", "DB1498", "DB0725",
    "DB0321", "DB0721", "DB2359", "DB0756", "DB1133", "DB0724",
    "DB0774", "DB1134", "DB2109", "DB0351", "DB0200", "DB2264",
    "DB0785", "DB0628", "DB0766", "DB1832", "DB1582", "DB0680",
    "DB1268", "DB2116", "DB0389",
  ]);

  function validSize(width, height, limits) {
    return Number.isInteger(width) && Number.isInteger(height) &&
      width >= 1 && height >= 1 && width <= limits.MAX_W && height <= limits.MAX_H;
  }

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

  /* Legacy index-based decoder remains available for existing callers/tests. */
  function decode(packed, width, height, palette, limits) {
    if (!validSize(width, height, limits) || typeof packed !== "string" || packed.length !== width * height) return null;
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

  function encodeStable(data, palette) {
    if (!Array.isArray(data) || !data.length || !Array.isArray(data[0]) || !data[0].length) {
      throw new TypeError("Pattern must be a non-empty rectangular grid.");
    }
    const width = data[0].length;
    if (data.some((row) => !Array.isArray(row) || row.length !== width)) {
      throw new TypeError("Pattern rows must have equal width.");
    }
    const available = new Set(palette.map((item) => item.code));
    const codes = [], indexByCode = new Map();
    const packed = data.flat().map((code) => {
      if (code == null || code === "") return "-";
      if (!available.has(code)) throw new TypeError("Pattern contains an unknown bead color.");
      if (!indexByCode.has(code)) {
        const index = codes.length;
        if (index >= ALPHABET.length) throw new TypeError("Pattern uses too many distinct bead colors.");
        codes.push(code);
        indexByCode.set(code, index);
      }
      return ALPHABET[indexByCode.get(code)];
    }).join("");
    return { width, height: data.length, codes, packed };
  }

  function decodeStable(packed, width, height, dictionary, palette, limits) {
    if (!validSize(width, height, limits) || typeof packed !== "string" || packed.length !== width * height) return null;
    if (!Array.isArray(dictionary) || dictionary.length > ALPHABET.length) return null;
    const available = new Set(palette.map((item) => item.code));
    if (new Set(dictionary).size !== dictionary.length || dictionary.some((code) => !available.has(code))) return null;
    const data = [];
    for (let r = 0; r < height; r++) {
      const row = [];
      for (let c = 0; c < width; c++) {
        const char = packed[r * width + c];
        if (char === "-") row.push(null);
        else {
          const index = ALPHABET.indexOf(char);
          if (index < 0 || index >= dictionary.length) return null;
          row.push(dictionary[index]);
        }
      }
      data.push(row);
    }
    return { width, height, data };
  }

  function decodeLegacy(packed, width, height, palette, limits) {
    if (!validSize(width, height, limits) || typeof packed !== "string" || packed.length !== width * height) return null;
    const available = new Set(palette.map((item) => item.code));
    const data = [];
    for (let r = 0; r < height; r++) {
      const row = [];
      for (let c = 0; c < width; c++) {
        const char = packed[r * width + c];
        if (char === "-") row.push(null);
        else {
          const index = ALPHABET.indexOf(char);
          const code = LEGACY_CODES[index];
          if (index < 0 || !code || !available.has(code)) return null;
          row.push(code);
        }
      }
      data.push(row);
    }
    return { width, height, data };
  }

  function parseHash(hash, palette, limits) {
    if (typeof hash !== "string") return null;
    const v2 = hash.match(/^#pattern=v2=(\d+)x(\d+):([A-Z0-9]+(?:,[A-Z0-9]+)*|-):([A-Za-z0-9_-]+)$/);
    if (v2) {
      const dictionary = v2[3] === "-" ? [] : v2[3].split(",");
      return decodeStable(v2[4], Number(v2[1]), Number(v2[2]), dictionary, palette, limits);
    }
    const v1 = hash.match(/^#pattern=(\d+)x(\d+):([A-Za-z0-9_-]+)$/);
    if (!v1) return null;
    return decodeLegacy(v1[3], Number(v1[1]), Number(v1[2]), palette, limits);
  }

  function makeHash(data, palette) {
    const encoded = encodeStable(data, palette);
    const dictionary = encoded.codes.length ? encoded.codes.join(",") : "-";
    return "#pattern=v2=" + encoded.width + "x" + encoded.height + ":" + dictionary + ":" + encoded.packed;
  }

  return Object.freeze({ encode, decode, parseHash, makeHash });
});
