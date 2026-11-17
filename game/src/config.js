// Lentera Malam — tuning and palette in one place.
// Every number the game balances on lives here, so a tweak never
// means hunting through the world, render or audio code.

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

// Playfield: the band below the HUD bar at the top.
export const ARENA = { x: 32, y: 92, w: 1216, h: 596 };

export const PLAYER = {
  radius: 16,
  speed: 265,
  dashSpeed: 760,
  dashTime: 0.16,
  dashCooldown: 1.1,
  dashInvuln: 0.3,
  hitInvuln: 1.3,
};

export const LANTERNS_PER_WAVE = 3;
export const EMBERS_PER_LANTERN = 4;
export const EMBER_SCORE = 10;
export const LANTERN_SCORE = 100;
export const WAVE_CLEAR_BONUS = 250;
export const MAX_LIVES = 3;
export const WIN_WAVE = 10;
export const COMBO_WINDOW = 3.0;
export const COMBO_MAX = 5;

// Ember field: how many embers sit on the ground and how fast they return.
export const EMBER_FIELD = { base: 9, perWave: 1, max: 14, respawnEvery: 1.4 };

// Wisp kinds. speed is the cruise speed; darters lunge, weavers sway.
export const WISP = {
  chaser: { radius: 14, speed: 118, color: '#8b7bff', eye: '#e8e4ff' },
  darter: { radius: 12, speed: 72, lungeSpeed: 400, color: '#ff6b81', eye: '#ffe3e8' },
  weaver: { radius: 13, speed: 96, color: '#4fd8c2', eye: '#e2fff9' },
};

// How a wave is staffed. Counts grow with the wave number; speed too.
export function wispsForWave(wave) {
  const chasers = 1 + Math.floor(wave / 2);
  const darters = wave >= 2 ? Math.floor(wave / 2) : 0;
  const weavers = wave >= 3 ? Math.floor((wave - 1) / 2) : 0;
  return { chaser: chasers, darter: darters, weaver: weavers };
}

export function wispSpeedScale(wave) {
  return 1 + 0.06 * (wave - 1);
}

// The night palette: deep indigo sky, warm amber light, pale fireflies.
export const PALETTE = {
  skyTop: '#070d24',
  skyBottom: '#131c3f',
  groundTop: '#0d1530',
  groundBottom: '#080d20',
  hudBar: 'rgba(6, 10, 26, 0.72)',
  hudLine: 'rgba(255, 179, 71, 0.35)',
  text: '#f5ecd7',
  textDim: '#a9b4d6',
  amber: '#ffb347',
  amberDeep: '#ff8c1a',
  ember: '#ff9d2e',
  emberCore: '#ffe9a8',
  lanternGlass: '#ffd98a',
  lanternPost: '#5a3d24',
  playerCloak: '#2b3a6e',
  playerTrim: '#ffb347',
  playerSkin: '#f2c9a0',
  heart: '#ff5d73',
  danger: '#ff5d73',
  ok: '#7fe3a8',
};
