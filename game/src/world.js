// Lentera Malam — the world: player, embers, lanterns, wisps, particles.
// One fixed-timestep update per call; no wall clock is read here, so a
// scripted run of update() is perfectly reproducible from its seed.

import {
  ARENA,
  PLAYER,
  LANTERNS_PER_WAVE,
  EMBERS_PER_LANTERN,
  EMBER_SCORE,
  LANTERN_SCORE,
  WAVE_CLEAR_BONUS,
  MAX_LIVES,
  WIN_WAVE,
  COMBO_WINDOW,
  COMBO_MAX,
  EMBER_FIELD,
  WISP,
  wispsForWave,
  wispSpeedScale,
} from './config.js';
import { mulberry32, rand, randInt, pick, clamp, distance } from './random.js';

// Three lantern posts, spread across the night garden.
const LANTERN_SPOTS = [
  { x: 210, y: 210 },
  { x: 640, y: 165 },
  { x: 1070, y: 210 },
];

function lanternSpot(i, rng) {
  const spot = LANTERN_SPOTS[i % LANTERN_SPOTS.length];
  return { x: spot.x + rand(rng, -14, 14), y: spot.y + rand(rng, -10, 10) };
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.reset(seed);
  }

  reset(seed) {
    this.rng = mulberry32(seed);
    this.time = 0;
    this.wave = 1;
    this.score = 0;
    this.lives = MAX_LIVES;
    this.combo = 0;
    this.comboTimer = 0;
    this.embersCollected = 0;
    this.lanternsLitTotal = 0;
    this.wispsTouched = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.banner = null;
    this.waveClearTimer = 0;
    this.emberRespawnTimer = 0;
    this.justClearedWave = false;
    this.justDied = false;
    this.justWon = false;
    this.endless = false;
    this.player = {
      x: ARENA.x + ARENA.w / 2,
      y: ARENA.y + ARENA.h - 90,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      carried: 0,
      dashTime: 0,
      dashCooldown: 0,
      invuln: 0,
      moving: false,
    };
    this.embers = [];
    this.lanterns = [];
    this.wisps = [];
    this.particles = [];
    this.fireflies = [];
    this.stars = [];
    this.bushes = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({ x: rand(this.rng, 0, 1280), y: rand(this.rng, 0, 86), r: rand(this.rng, 0.6, 1.8), tw: rand(this.rng, 0, Math.PI * 2) });
    }
    for (let i = 0; i < 26; i++) {
      this.fireflies.push({
        x: rand(this.rng, ARENA.x, ARENA.x + ARENA.w),
        y: rand(this.rng, ARENA.y, ARENA.y + ARENA.h),
        phase: rand(this.rng, 0, Math.PI * 2),
        speed: rand(this.rng, 0.3, 0.9),
        amp: rand(this.rng, 8, 26),
      });
    }
    for (let i = 0; i < 12; i++) {
      this.bushes.push({ x: rand(this.rng, ARENA.x + 20, ARENA.x + ARENA.w - 20), y: ARENA.y + ARENA.h - 6, r: rand(this.rng, 18, 42) });
    }
    this.startWave(1);
    this.showBanner(`WAVE 1`, 'Nyalakan 3 lentera — kumpulkan bara api');
  }

  showBanner(text, sub) {
    this.banner = { text, sub: sub || '', timer: 2.2 };
  }

  startWave(wave) {
    this.wave = wave;
    this.lanterns = LANTERN_SPOTS.slice(0, LANTERNS_PER_WAVE).map((_, i) => {
      const spot = lanternSpot(i, this.rng);
      return { x: spot.x, y: spot.y, filled: 0, lit: false, flicker: rand(this.rng, 0, Math.PI * 2) };
    });
    this.embers = [];
    const target = Math.min(EMBER_FIELD.base + (wave - 1) * EMBER_FIELD.perWave, EMBER_FIELD.max);
    for (let i = 0; i < target; i++) this.spawnEmber();
    this.wisps = [];
    const plan = wispsForWave(wave);
    const scale = wispSpeedScale(wave);
    for (const [kind, count] of Object.entries(plan)) {
      for (let i = 0; i < count; i++) this.spawnWisp(kind, scale);
    }
    this.emberRespawnTimer = EMBER_FIELD.respawnEvery;
  }

  spawnEmber(x, y) {
    if (x === undefined) {
      let tries = 0;
      do {
        x = rand(this.rng, ARENA.x + 30, ARENA.x + ARENA.w - 30);
        y = rand(this.rng, ARENA.y + 30, ARENA.y + ARENA.h - 30);
        tries++;
      } while (tries < 20 && this.lanterns.some((l) => distance(x, y, l.x, l.y) < 70));
    }
    this.embers.push({ x, y, phase: rand(this.rng, 0, Math.PI * 2), taken: false });
  }

  spawnWisp(kind, scale) {
    const edge = randInt(this.rng, 0, 3);
    let x;
    let y;
    if (edge === 0) { x = rand(this.rng, ARENA.x, ARENA.x + ARENA.w); y = ARENA.y + 16; }
    else if (edge === 1) { x = rand(this.rng, ARENA.x, ARENA.x + ARENA.w); y = ARENA.y + ARENA.h - 16; }
    else if (edge === 2) { x = ARENA.x + 16; y = rand(this.rng, ARENA.y, ARENA.y + ARENA.h); }
    else { x = ARENA.x + ARENA.w - 16; y = rand(this.rng, ARENA.y, ARENA.y + ARENA.h); }
    // Never spawn on top of the player.
    if (distance(x, y, this.player.x, this.player.y) < 280) {
      x = ARENA.x + ARENA.w - x + ARENA.x;
      y = ARENA.y + ARENA.h - y + ARENA.y;
    }
    const def = WISP[kind];
    this.wisps.push({
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: def.radius,
      speed: def.speed * scale,
      state: 'stalk',
      timer: rand(this.rng, 0.5, 2.5),
      lx: 0,
      ly: 0,
      sway: rand(this.rng, 0, Math.PI * 2),
    });
  }

  addScore(points) {
    this.score += points;
  }

  burst(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i++) {
      const a = rand(this.rng, 0, Math.PI * 2);
      const s = rand(this.rng, speed * 0.3, speed);
      this.particles.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 30,
        life: rand(this.rng, life * 0.5, life),
        maxLife: life,
        size: rand(this.rng, 1.5, 3.5),
        color,
      });
    }
  }

  ring(x, y, color) {
    this.particles.push({ kind: 'ring', x, y, life: 0.5, maxLife: 0.5, size: 8, color });
  }

  smoke(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        kind: 'smoke',
        x: x + rand(this.rng, -10, 10),
        y: y + rand(this.rng, -10, 10),
        vx: rand(this.rng, -20, 20),
        vy: rand(this.rng, -50, -15),
        life: rand(this.rng, 0.4, 0.9),
        maxLife: 0.9,
        size: rand(this.rng, 5, 11),
        color: '#8d93b8',
      });
    }
  }

  update(dt, input, sound) {
    this.time += dt;
    this.justClearedWave = false;
    this.justDied = false;
    this.justWon = false;
    const p = this.player;

    if (this.banner) {
      this.banner.timer -= dt;
      if (this.banner.timer <= 0) this.banner = null;
    }

    // --- Player movement and dash ---
    const move = input.moveVector(p.x, p.y);
    p.moving = move !== null;
    let speed = PLAYER.speed;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      speed = PLAYER.dashSpeed;
    }
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (input.dashRequested() && p.dashCooldown <= 0 && p.dashTime <= 0) {
      p.dashTime = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown;
      if (sound) sound.dash();
      this.burst(p.x, p.y, '#ffd98a', 10, 140, 0.4);
    }
    if (move) {
      p.angle = Math.atan2(move.y, move.x);
      p.vx = move.x * speed;
      p.vy = move.y * speed;
    } else {
      p.vx *= 0.8;
      p.vy *= 0.8;
    }
    p.x = clamp(p.x + p.vx * dt, ARENA.x + PLAYER.radius, ARENA.x + ARENA.w - PLAYER.radius);
    p.y = clamp(p.y + p.vy * dt, ARENA.y + PLAYER.radius, ARENA.y + ARENA.h - PLAYER.radius);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.dashTime > 0) {
      this.particles.push({
        kind: 'spark', x: p.x, y: p.y, vx: -p.vx * 0.08, vy: -p.vy * 0.08,
        life: 0.3, maxLife: 0.3, size: 2.5, color: '#ffd98a',
      });
    }

    // --- Ember pickups ---
    for (const ember of this.embers) {
      if (ember.taken) continue;
      if (distance(p.x, p.y, ember.x, ember.y) < PLAYER.radius + 12) {
        ember.taken = true;
        p.carried += 1;
        this.embersCollected += 1;
        if (this.comboTimer > 0) this.combo = Math.min(this.combo + 1, COMBO_MAX);
        else this.combo = 1;
        this.comboTimer = COMBO_WINDOW;
        const gained = EMBER_SCORE * this.combo;
        this.addScore(gained);
        if (sound) sound.pickup(this.combo);
        this.burst(ember.x, ember.y, '#ffb347', 8, 120, 0.45);
      }
    }
    this.embers = this.embers.filter((e) => !e.taken);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // --- Ember respawn keeps the field stocked ---
    this.emberRespawnTimer -= dt;
    const target = Math.min(EMBER_FIELD.base + (this.wave - 1) * EMBER_FIELD.perWave, EMBER_FIELD.max);
    if (this.emberRespawnTimer <= 0) {
      this.emberRespawnTimer = EMBER_FIELD.respawnEvery;
      if (this.embers.length < target) this.spawnEmber();
    }

    // --- Lantern deposits ---
    for (const lantern of this.lanterns) {
      if (lantern.lit || p.carried === 0) continue;
      if (distance(p.x, p.y, lantern.x, lantern.y) < 62) {
        const need = EMBERS_PER_LANTERN - lantern.filled;
        const give = Math.min(need, p.carried);
        lantern.filled += give;
        p.carried -= give;
        this.burst(lantern.x, lantern.y - 20, '#ffd98a', 6, 90, 0.4);
        if (lantern.filled >= EMBERS_PER_LANTERN) {
          lantern.lit = true;
          this.lanternsLitTotal += 1;
          this.addScore(LANTERN_SCORE);
          if (sound) sound.lanternLit();
          this.burst(lantern.x, lantern.y - 24, '#ffb347', 36, 220, 0.8);
          this.burst(lantern.x, lantern.y - 24, '#ffe9a8', 18, 140, 0.6);
          this.ring(lantern.x, lantern.y - 24, '#ffd98a');
          this.shake = Math.max(this.shake, 5);
        }
      }
    }

    // --- Wave cleared? ---
    if (this.lanterns.every((l) => l.lit) && this.waveClearTimer <= 0) {
      const bonus = WAVE_CLEAR_BONUS + (this.wave - 1) * 50;
      this.addScore(bonus);
      this.justClearedWave = true;
      if (sound) sound.waveClear(this.wave);
      this.waveClearTimer = 1.8;
      if (this.wave >= WIN_WAVE && !this.endless) {
        this.justWon = true;
      } else {
        this.showBanner(`WAVE ${this.wave} SELESAI`, `Bonus +${bonus} — bersiap untuk wave ${this.wave + 1}`);
      }
    }
    if (this.waveClearTimer > 0) {
      this.waveClearTimer -= dt;
      if (this.waveClearTimer <= 0 && (this.wave < WIN_WAVE || this.endless)) {
        this.startWave(this.wave + 1);
        this.showBanner(`WAVE ${this.wave}`, this.wave % 3 === 0 ? 'Wisp makin cepat — hati-hati!' : 'Nyalakan 3 lentera lagi');
      }
    }

    // --- Wisps ---
    for (const wisp of this.wisps) {
      this.updateWisp(wisp, dt);
    }
    // Gentle separation so wisps never stack into one blob.
    for (let i = 0; i < this.wisps.length; i++) {
      for (let j = i + 1; j < this.wisps.length; j++) {
        const a = this.wisps[i];
        const b = this.wisps[j];
        const d = distance(a.x, a.y, b.x, b.y);
        const min = a.radius + b.radius - 2;
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }

    // --- Wisp touch ---
    const dashing = p.dashTime > 0;
    for (const wisp of this.wisps) {
      if (dashing || p.invuln > 0) continue;
      if (distance(p.x, p.y, wisp.x, wisp.y) < PLAYER.radius + wisp.radius - 2) {
        this.damagePlayer(wisp, sound);
        break;
      }
    }

    // --- Particles and fireflies ---
    for (const part of this.particles) {
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      if (part.kind === 'spark') part.vy += 160 * dt;
      if (part.kind === 'ring') part.size += 260 * dt;
    }
    this.particles = this.particles.filter((part) => part.life > 0);
    for (const fly of this.fireflies) {
      fly.phase += dt * fly.speed;
    }

    // --- Screen shake decays ---
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 22);
      this.shakeX = rand(this.rng, -this.shake, this.shake);
      this.shakeY = rand(this.rng, -this.shake, this.shake);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  updateWisp(wisp, dt) {
    const p = this.player;
    const dx = p.x - wisp.x;
    const dy = p.y - wisp.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / d;
    const ny = dy / d;
    wisp.timer -= dt;

    if (wisp.kind === 'chaser') {
      wisp.vx = nx * wisp.speed;
      wisp.vy = ny * wisp.speed;
    } else if (wisp.kind === 'weaver') {
      wisp.sway += dt * 3.2;
      const px = -ny * Math.sin(wisp.sway) * 0.85;
      const py = nx * Math.sin(wisp.sway) * 0.85;
      wisp.vx = (nx + px) * wisp.speed;
      wisp.vy = (ny + py) * wisp.speed;
    } else if (wisp.kind === 'darter') {
      if (wisp.state === 'stalk') {
        wisp.vx = nx * wisp.speed;
        wisp.vy = ny * wisp.speed;
        if (wisp.timer <= 0) {
          wisp.state = 'windup';
          wisp.timer = 0.45;
          wisp.lx = nx;
          wisp.ly = ny;
        }
      } else if (wisp.state === 'windup') {
        wisp.vx *= 0.9;
        wisp.vy *= 0.9;
        wisp.lx = nx;
        wisp.ly = ny;
        if (wisp.timer <= 0) {
          wisp.state = 'lunge';
          wisp.timer = 0.5;
          wisp.vx = wisp.lx * WISP.darter.lungeSpeed;
          wisp.vy = wisp.ly * WISP.darter.lungeSpeed;
        }
      } else if (wisp.state === 'lunge') {
        if (wisp.timer <= 0) {
          wisp.state = 'recover';
          wisp.timer = 0.9;
        }
      } else {
        wisp.vx *= 0.86;
        wisp.vy *= 0.86;
        if (wisp.timer <= 0) {
          wisp.state = 'stalk';
          wisp.timer = rand(this.rng, 1.6, 3.0);
        }
      }
    }

    wisp.x = clamp(wisp.x + wisp.vx * dt, ARENA.x + wisp.radius, ARENA.x + ARENA.w - wisp.radius);
    wisp.y = clamp(wisp.y + wisp.vy * dt, ARENA.y + wisp.radius, ARENA.y + ARENA.h - wisp.radius);
  }

  damagePlayer(wisp, sound) {
    const p = this.player;
    this.lives -= 1;
    this.wispsTouched += 1;
    this.combo = 0;
    this.comboTimer = 0;
    p.invuln = PLAYER.hitInvuln;
    this.shake = 12;
    if (sound) sound.hit();
    this.smoke(p.x, p.y, 18);
    // The hit knocks the keeper back and scatters half the carried embers.
    const d = Math.max(1, distance(p.x, p.y, wisp.x, wisp.y));
    const nx = (p.x - wisp.x) / d;
    const ny = (p.y - wisp.y) / d;
    p.x = clamp(p.x + nx * 46, ARENA.x + PLAYER.radius, ARENA.x + ARENA.w - PLAYER.radius);
    p.y = clamp(p.y + ny * 46, ARENA.y + PLAYER.radius, ARENA.y + ARENA.h - PLAYER.radius);
    const dropped = Math.floor(p.carried / 2);
    for (let i = 0; i < dropped; i++) {
      this.spawnEmber(
        clamp(p.x + rand(this.rng, -90, 90), ARENA.x + 24, ARENA.x + ARENA.w - 24),
        clamp(p.y + rand(this.rng, -70, 70), ARENA.y + 24, ARENA.y + ARENA.h - 24),
      );
    }
    p.carried -= dropped;
    if (this.lives <= 0) {
      this.justDied = true;
    }
  }

  // End-of-run numbers for the results screens.
  stats() {
    return {
      score: this.score,
      wave: this.wave,
      embers: this.embersCollected,
      lanterns: this.lanternsLitTotal,
      wispsTouched: this.wispsTouched,
      time: Math.floor(this.time),
    };
  }
}

// A virtual input for scripted play: steer toward the nearest ember,
// or toward a lantern that still needs embers when carrying enough.
// Used by the deterministic screenshot scenes (and handy for tests).
export function autopilotMove(world) {
  const p = world.player;
  let target = null;
  if (p.carried >= EMBERS_PER_LANTERN) {
    let best = Infinity;
    for (const lantern of world.lanterns) {
      if (lantern.lit) continue;
      const d = distance(p.x, p.y, lantern.x, lantern.y);
      if (d < best) {
        best = d;
        target = lantern;
      }
    }
  }
  if (!target) {
    let best = Infinity;
    for (const ember of world.embers) {
      const d = distance(p.x, p.y, ember.x, ember.y);
      if (d < best) {
        best = d;
        target = ember;
      }
    }
  }
  if (!target) return { x: 0, y: 0, dash: false };
  let dx = target.x - p.x;
  let dy = target.y - p.y;
  // Flee a wisp that gets too close.
  for (const wisp of world.wisps) {
    const d = distance(p.x, p.y, wisp.x, wisp.y);
    if (d < 110) {
      dx += ((p.x - wisp.x) / d) * 260;
      dy += ((p.y - wisp.y) / d) * 260;
    }
  }
  const len = Math.hypot(dx, dy) || 1;
  let dash = false;
  for (const wisp of world.wisps) {
    if (distance(p.x, p.y, wisp.x, wisp.y) < 64 && p.dashCooldown <= 0) dash = true;
  }
  return { x: dx / len, y: dy / len, dash };
}

// Adapts autopilotMove to the Input shape world.update expects.
export class ScriptedInput {
  constructor(world) {
    this.world = world;
    this.current = { x: 0, y: 0, dash: false };
  }

  refresh() {
    this.current = autopilotMove(this.world);
  }

  moveVector() {
    return { x: this.current.x, y: this.current.y };
  }

  dashRequested() {
    return this.current.dash;
  }
}
