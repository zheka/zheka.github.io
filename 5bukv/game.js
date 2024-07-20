"use strict";

class BitWriteStream {
  constructor() {
    this.buf = [];
    this.pos = 0;
  }

  toBase64() {
    return btoa(String.fromCharCode.apply(null, this.buf));
  }

  write(b, v) {
    if (b < 1 || b > 8) {
      throw `cannot write ${b} bits`;
    }
    const m = (1 << b) - 1;
    if (v != (v & m)) {
      throw `value ${v} does not fit in ${b} bits`;
    }
    if (this.pos == 0) {
      this.buf.push(v);
    } else {
      this.buf[this.buf.length - 1] |= (v << this.pos) & 0xff;
    }
    if (this.pos + b > 8) {
      this.buf.push(v >> (8 - this.pos));
    }
    this.pos = (this.pos + b) % 8;
  }
};

class BitReadStream {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }

  static fromBase64(s) {
    return new BitReadStream(Array.from(atob(s), (c) => c.charCodeAt(0)));
  }

  read(b) {
    if (b < 1 || b > 8) {
      throw `cannot read ${b} bits`;
    }
    const m = (1 << b) - 1;
    let v = (this.buf[0] >> this.pos) & m;
    if (this.pos + b >= 8) {
      this.buf.shift();
      v |= (this.buf[0] << (8 - this.pos)) & m;
    }
    this.pos = (this.pos + b) % 8;
    return v;
  }
};

function packEN(b, s) {
  for (let i = 0; i < s.length; i++) {
    b.write(5, s.charCodeAt(i) - "A".charCodeAt(0));
  }
}

function unpackEN(b, n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += String.fromCharCode(b.read(5) + "A".charCodeAt(0));
  }
  return s;
}

function packRU(b, s) {
  for (let i = 0; i < s.length; i++) {
    b.write(5, s.charCodeAt(i) - "А".charCodeAt(0));
  }
}

function unpackRU(b, n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += String.fromCharCode(b.read(5) + "А".charCodeAt(0));
  }
  return s;
}

// Pack game object into an obfuscated string.
function pack_game(g) {
  let b = new BitWriteStream();
  packEN(b, "RU");
  b.write(4, g.w.length);
  packRU(b, g.w);
  b.write(4, g.n);
  return b.toBase64();
}

// Unpack obfuscated string into a game object.
function unpack_game(s) {
  let b = BitReadStream.fromBase64(s);
  unpackEN(b, 2);
  const m = b.read(4);
  const w = unpackRU(b, m);
  const n = b.read(4);
  return {w: w, n: n};
}

function pack_progress(p) {
  let b = new BitWriteStream();
  b.write(4, p.length);
  for (const w of p) {
    packRU(b, w);
  }
  return b.toBase64();
}

function unpack_progress(s, m) {
  let b = BitReadStream.fromBase64(s);
  const n = b.read(4);
  let p = [];
  for (let i = 0; i < n; i++) {
    p.push(unpackRU(b, m));
  }
  return p;
}

function normalize_word(w, l) {
  let r = w.trim().toUpperCase();
  if (l == "ru") {
    r = r.replaceAll("Ё", "Е");
  }
  return r;
}

// Score word by pattern. For each character in word:
//   0 if character is missing in pattern
//   1 if character is present but at wrong position
//   2 if character is present at correct position
// Multiple occurences are matched.
// Examples (pattern, word, scores):
//   ABC XYZ 000
//   ABC XYA 001
//   ABC AYZ 200
//   ABC ACZ 210
//   ABC AAZ 200 - second occurence of A is missing
//   ABA AAZ 210 - second occurence of A is at wrong position
// Returns object:
//   v: true if fully matched
//   s: character scores
function score_word(p, w) {
  if (w == p) {
    return {v: true, s: new Array(w.length).fill(2)};
  }
  let s = new Array(w.length).fill(0); // character scores
  let u = new Array(p.length).fill(false); // used characters
  // Find present characters at correct positions
  for (let i = 0; i < w.length; i++) {
    if (i >= p.length) {
      break;
    }
    if (w[i] == p[i]) {
      s[i] = 2;
      u[i] = true;
    }
  }
  // Find present characters at wrong positions
  for (let i = 0; i < w.length; i++) {
    if (s[i] != 0) {
      continue;
    }
    for (let j = 0; j < p.length; j++) {
      if (u[j]) {
        continue;
      }
      if (w[i] == p[j]) {
        s[i] = 1;
        u[j] = true;
        break;
      }
    }
  }
  return {v: false, s: s};
}

// Verify word. Returns object:
//   v: true if word exists as is
//   w: normalized form of the word
//   u: link to the article
async function verify_word(w, l) {
  w = normalize_word(w, l).toLowerCase();
  if (!w) {
    return {v: false};
  }
  let u = new URL("https://ru.wiktionary.org/w/api.php");
  u.searchParams.set("origin", "*");
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("titles", w);
  return fetch(u, {mode: 'cors', method: 'GET'})
  .then((r) => r.json())
  .then((r) => {
    // console.log(r);
    let k = Object.keys(r.query.pages)[0];
    if (k == -1) {
      return {v: false};
    }
    return {v: true};
  });
}
