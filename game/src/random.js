// Lentera Malam — small seeded random helpers.
// mulberry32 is tiny, fast and deterministic: the same seed always
// deals the same night, which is what the screenshot scenes rely on.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Float in [min, max).
export function rand(rng, min, max) {
  return min + rng() * (max - min);
}

// Integer in [min, max] inclusive.
export function randInt(rng, min, max) {
  return Math.floor(rand(rng, min, max + 1));
}

// One element of an array, uniformly.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// True with probability p (0..1).
export function chance(rng, p) {
  return rng() < p;
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}
