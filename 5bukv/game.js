"use strict";

// Pack game object into an obfuscated string.
function pack_game(g) {
  const s = JSON.stringify(g);
  const b = new TextEncoder().encode(s);
  const bs = Array.from(b, (c) => String.fromCodePoint(c)).join("");
  return btoa(bs);
}

// Unpack obfuscated string into a game object.
function unpack_game(s) {
  const bs = atob(s);
  const b = Uint8Array.from(bs, (c) => c.codePointAt(0));
  return JSON.parse(new TextDecoder().decode(b));
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
