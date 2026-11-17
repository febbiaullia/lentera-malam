// Lentera Malam — everything the player sees, drawn on one canvas.
// Art is code only: gradients, shapes and glow, no image or font files.
// drawScene(ctx, game) paints the world, the HUD and whichever
// screen the game state asks for.

import { VIEW_WIDTH, VIEW_HEIGHT, ARENA, PLAYER, EMBERS_PER_LANTERN, LANTERNS_PER_WAVE, MAX_LIVES, PALETTE } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A soft radial glow that fades to transparent.
function glow(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.heart : 'rgba(255,93,115,0.22)';
  ctx.fill();
  ctx.restore();
}

export function drawScene(ctx, game) {
  const world = game.world;
  ctx.save();
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (world.shakeX || world.shakeY) ctx.translate(world.shakeX, world.shakeY);

  drawBackground(ctx, world);
  drawFireflies(ctx, world);
  drawLanterns(ctx, world);
  drawEmbers(ctx, world);
  drawWisps(ctx, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  ctx.restore();

  if (game.state === 'title') {
    drawTitleScreen(ctx, game);
    return;
  }
  drawHUD(ctx, game);
  if (world.banner) drawBanner(ctx, world);
  if (game.state === 'paused') drawPauseOverlay(ctx);
  if (game.state === 'over') drawGameOverScreen(ctx, game);
  if (game.state === 'win') drawWinScreen(ctx, game);
}

function drawBackground(ctx, world) {
  // Night sky and ground.
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyBottom);
  sky.addColorStop(0.56, PALETTE.groundTop);
  sky.addColorStop(1, PALETTE.groundBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Stars, twinkling with the world clock.
  for (const star of world.stars) {
    const a = 0.35 + 0.45 * Math.abs(Math.sin(world.time * 0.8 + star.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // A quiet moon, kept clear of the HUD's score and lives.
  glow(ctx, 430, 48, 70, '#f4ecd0', 0.5);
  ctx.fillStyle = '#f7efce';
  ctx.beginPath();
  ctx.arc(430, 48, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(210, 198, 160, 0.7)';
  ctx.beginPath();
  ctx.arc(421, 42, 5, 0, Math.PI * 2);
  ctx.arc(438, 55, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Arena edge: a soft stone border and dark bushes along the bottom.
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.22)';
  ctx.lineWidth = 2;
  roundRect(ctx, ARENA.x - 6, ARENA.y - 6, ARENA.w + 12, ARENA.h + 12, 18);
  ctx.stroke();
  for (const bush of world.bushes) {
    ctx.fillStyle = '#0a1226';
    ctx.beginPath();
    ctx.arc(bush.x - bush.r * 0.5, bush.y, bush.r * 0.7, 0, Math.PI * 2);
    ctx.arc(bush.x + bush.r * 0.4, bush.y, bush.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Faint footpath winding from the keeper's door to the garden.
  ctx.strokeStyle = 'rgba(180, 160, 110, 0.10)';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(640, ARENA.y + ARENA.h);
  ctx.quadraticCurveTo(575, 540, 660, 380);
  ctx.stroke();
}

function drawFireflies(ctx, world) {
  for (const fly of world.fireflies) {
    const x = fly.x + Math.sin(fly.phase) * fly.amp;
    const y = fly.y + Math.cos(fly.phase * 0.7) * fly.amp * 0.6;
    const a = 0.25 + 0.55 * Math.abs(Math.sin(fly.phase * 1.7));
    glow(ctx, x, y, 10, '#c8ffb0', a * 0.8);
    ctx.fillStyle = `rgba(220, 255, 190, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLanterns(ctx, world) {
  for (const lantern of world.lanterns) {
    const { x, y } = lantern;
    const flicker = 0.85 + 0.15 * Math.sin(world.time * 7 + lantern.flicker);
    // Warm light pool on the ground.
    if (lantern.lit) glow(ctx, x, y - 18, 150 * flicker, 'rgba(255, 179, 71, 0.55)', 0.55);
    else glow(ctx, x, y - 18, 60, 'rgba(255, 179, 71, 0.25)', 0.3);
    // Post and roof.
    ctx.fillStyle = PALETTE.lanternPost;
    ctx.fillRect(x - 4, y - 6, 8, 46);
    ctx.fillStyle = '#3d2812';
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 6);
    ctx.lineTo(x + 22, y - 6);
    ctx.lineTo(x, y - 30);
    ctx.closePath();
    ctx.fill();
    // Glass: bright amber when lit, dim grey when waiting.
    ctx.fillStyle = lantern.lit ? '#ffd98a' : '#2a2f45';
    roundRect(ctx, x - 15, y - 40, 30, 34, 5);
    ctx.fill();
    ctx.strokeStyle = lantern.lit ? '#ff8c1a' : '#4a5170';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (lantern.lit) {
      // Flame.
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.ellipse(x, y - 23, 5 * flicker, 9 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8c1a';
      ctx.beginPath();
      ctx.ellipse(x, y - 19, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Ember pips: how many of the 4 this lantern still needs.
      for (let i = 0; i < EMBERS_PER_LANTERN; i++) {
        ctx.fillStyle = i < lantern.filled ? PALETTE.ember : 'rgba(255, 157, 46, 0.25)';
        ctx.beginPath();
        ctx.arc(x - 10 + i * 7, y - 46, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawEmbers(ctx, world) {
  for (const ember of world.embers) {
    const pulse = 0.7 + 0.3 * Math.sin(world.time * 5 + ember.phase);
    glow(ctx, ember.x, ember.y, 16 * pulse, 'rgba(255, 157, 46, 0.8)', 0.7);
    ctx.fillStyle = PALETTE.emberCore;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 3.4 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 5.6 * pulse, 0, Math.PI * 2);
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawWisps(ctx, world) {
  for (const wisp of world.wisps) {
    const def = { chaser: '#8b7bff', darter: '#ff6b81', weaver: '#4fd8c2' }[wisp.kind];
    const windup = wisp.kind === 'darter' && wisp.state === 'windup';
    const wobble = Math.sin(world.time * 6 + wisp.sway) * 2;
    const r = wisp.radius * (windup ? 1.25 : 1);
    // Smoky body.
    const g = ctx.createRadialGradient(wisp.x, wisp.y, 0, wisp.x, wisp.y, r * 1.9);
    g.addColorStop(0, 'rgba(20, 16, 46, 0.95)');
    g.addColorStop(0.6, 'rgba(38, 28, 84, 0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(wisp.x, wisp.y + wobble * 0.3, r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    // Rim in the wisp's colour.
    ctx.strokeStyle = def;
    ctx.globalAlpha = windup ? 0.95 : 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wisp.x, wisp.y + wobble * 0.3, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Two glowing eyes, watching the keeper.
    const p = world.player;
    const d = Math.max(1, Math.hypot(p.x - wisp.x, p.y - wisp.y));
    const ex = ((p.x - wisp.x) / d) * 2.5;
    const ey = ((p.y - wisp.y) / d) * 2.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(wisp.x - 5 + ex, wisp.y - 2 + ey + wobble * 0.3, 2.6, 0, Math.PI * 2);
    ctx.arc(wisp.x + 5 + ex, wisp.y - 2 + ey + wobble * 0.3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // Darter telegraphs its lunge with a thin line.
    if (windup) {
      ctx.strokeStyle = 'rgba(255, 107, 129, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wisp.x, wisp.y);
      ctx.lineTo(wisp.x + wisp.lx * 90, wisp.y + wisp.ly * 90);
      ctx.stroke();
    }
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  // Blink while invulnerable after a hit.
  if (p.invuln > 0 && Math.floor(world.time * 12) % 2 === 0) return;
  // Lantern light around the keeper.
  glow(ctx, p.x, p.y, 120, 'rgba(255, 179, 71, 0.5)', 0.5);
  const bob = p.moving ? Math.sin(world.time * 14) * 2 : Math.sin(world.time * 2) * 1;
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.4);
  // Cloak.
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.quadraticCurveTo(14, -8, 13, 8);
  ctx.quadraticCurveTo(12, 16, 0, 17);
  ctx.quadraticCurveTo(-12, 16, -13, 8);
  ctx.quadraticCurveTo(-14, -8, 0, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerTrim;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Hood and face.
  ctx.fillStyle = '#22305e';
  ctx.beginPath();
  ctx.arc(0, -10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerSkin;
  ctx.beginPath();
  ctx.arc(Math.cos(p.angle) * 2, -10 + Math.sin(p.angle) * 2, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // The keeper's lantern, held out to the side.
  const lx = Math.cos(p.angle) * 20;
  const ly = Math.sin(p.angle) * 14 + 4;
  ctx.strokeStyle = '#7a5a30';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  glow(ctx, lx, ly, 26, 'rgba(255, 200, 100, 0.9)', 0.8);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Carried embers orbit the keeper as a little glow trail.
  for (let i = 0; i < p.carried; i++) {
    const a = world.time * 3 + (i / Math.max(1, p.carried)) * Math.PI * 2;
    const ex = p.x + Math.cos(a) * 26;
    const ey = p.y + Math.sin(a) * 26 - 6;
    ctx.fillStyle = PALETTE.emberCore;
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dash cooldown ring under the keeper.
  if (p.dashCooldown > 0) {
    const frac = 1 - p.dashCooldown / PLAYER.dashCooldown;
    ctx.strokeStyle = 'rgba(255, 217, 138, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 20, 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const part of world.particles) {
    const a = Math.max(0, part.life / part.maxLife);
    if (part.kind === 'ring') {
      ctx.strokeStyle = part.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (part.kind === 'smoke') {
      ctx.fillStyle = part.color;
      ctx.globalAlpha = a * 0.4;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size * (1.6 - a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = part.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx, game) {
  const world = game.world;
  // Top bar.
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(0, 0, VIEW_WIDTH, 76);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 76);
  ctx.lineTo(VIEW_WIDTH, 76);
  ctx.stroke();

  // Score, left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 26px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`SKOR ${world.score.toLocaleString('id-ID')}`, 24, 32);
  ctx.font = '15px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  const carried = world.player.carried;
  ctx.fillText(`Bara dibawa: ${carried} / ${EMBERS_PER_LANTERN} per lentera`, 24, 58);
  if (world.combo > 1) {
    ctx.fillStyle = PALETTE.amber;
    ctx.font = 'bold 16px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(`KOMBO x${world.combo}`, 250, 58);
  }

  // Wave and lantern progress, centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 24px "Trebuchet MS", Verdana, sans-serif';
  const waveLabel = world.wave > 10 ? `WAVE ${world.wave} (tanpa akhir)` : `WAVE ${world.wave} / 10`;
  ctx.fillText(waveLabel, VIEW_WIDTH / 2, 30);
  for (let i = 0; i < LANTERNS_PER_WAVE; i++) {
    const lx = VIEW_WIDTH / 2 - 34 + i * 34;
    const lit = world.lanterns[i] && world.lanterns[i].lit;
    ctx.fillStyle = lit ? PALETTE.amber : 'rgba(255, 179, 71, 0.25)';
    ctx.beginPath();
    ctx.arc(lx, 56, 8, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(lx, 56, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Lives, right.
  ctx.textAlign = 'right';
  for (let i = 0; i < MAX_LIVES; i++) {
    drawHeart(ctx, VIEW_WIDTH - 36 - i * 34, 40, 26, i < world.lives);
  }
  ctx.font = '15px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Terbaik: ${game.best.toLocaleString('id-ID')}`, VIEW_WIDTH - 24, 64);

  // Bottom hints.
  ctx.textAlign = 'left';
  ctx.font = '14px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillStyle = 'rgba(169, 180, 214, 0.85)';
  const dashReady = world.player.dashCooldown <= 0;
  ctx.fillText(dashReady ? 'SHIFT / SPASI: Dash (siap)' : 'SHIFT / SPASI: Dash (isi ulang...)', 24, VIEW_HEIGHT - 14);
  ctx.textAlign = 'right';
  ctx.fillText(`P: jeda    M: suara ${game.muted ? 'mati' : 'nyala'}`, VIEW_WIDTH - 24, VIEW_HEIGHT - 14);
}

function drawBanner(ctx, world) {
  const b = world.banner;
  const a = Math.min(1, b.timer / 0.6, (2.2 - b.timer) / 0.3 + 0.4);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 44px Georgia, "Times New Roman", serif';
  ctx.shadowColor = 'rgba(255, 140, 26, 0.8)';
  ctx.shadowBlur = 24;
  ctx.fillText(b.text, VIEW_WIDTH / 2, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px Georgia, serif';
  ctx.fillText(b.sub, VIEW_WIDTH / 2, 336);
  ctx.restore();
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(4, 7, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

function statLine(ctx, label, value, x, y) {
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '19px Georgia, serif';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText(value, x + 300, y);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawTitleScreen(ctx, game) {
  dimScreen(ctx);
  const cx = VIEW_WIDTH / 2;
  // A big lantern above the title.
  glow(ctx, cx, 150, 130, 'rgba(255, 179, 71, 0.6)', 0.7);
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.ellipse(cx, 150, 26, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.ellipse(cx, 150, 12, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 76px Georgia, "Times New Roman", serif';
  ctx.shadowColor = 'rgba(255, 140, 26, 0.7)';
  ctx.shadowBlur = 30;
  ctx.fillText('LENTERA MALAM', cx, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('Jaga cahaya tetap menyala di taman yang gelap', cx, 340);

  ctx.font = '19px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  const lines = [
    'Gerak: WASD / panah (atau tahan klik mouse)   •   Dash: SHIFT / SPASI',
    'Kumpulkan bara api, bawa ke lentera — 4 bara menyalakan 1 lentera.',
    'Nyalakan 3 lentera di tiap wave. Hindari wisp bayangan — 3 nyawa.',
    'Menang: selesaikan wave 10.   P: jeda   •   M: suara',
  ];
  lines.forEach((line, i) => ctx.fillText(line, cx, 396 + i * 30));

  if (game.best > 0) {
    ctx.fillStyle = PALETTE.amber;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(`Skor terbaik: ${game.best.toLocaleString('id-ID')}`, cx, 540);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 24px Georgia, serif';
  const blink = 0.65 + 0.35 * Math.sin(game.world.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillText('Tekan ENTER atau klik untuk mulai', cx, 592);
  ctx.globalAlpha = 1;
}

function drawPauseOverlay(ctx) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('JEDA', VIEW_WIDTH / 2, 330);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Tekan P untuk lanjut bermain', VIEW_WIDTH / 2, 372);
}

function drawGameOverScreen(ctx, game) {
  dimScreen(ctx);
  const stats = game.world.stats();
  const cx = VIEW_WIDTH / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.danger;
  ctx.font = 'bold 60px Georgia, serif';
  ctx.fillText('CAHAYA PADAM', cx, 240);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = 'italic 21px Georgia, serif';
  ctx.fillText('Para wisp memadamkan lentera terakhir...', cx, 278);

  const x0 = cx - 150;
  statLine(ctx, 'Skor akhir', stats.score.toLocaleString('id-ID'), x0, 340);
  statLine(ctx, 'Wave tercapai', String(stats.wave), x0, 372);
  statLine(ctx, 'Bara dikumpulkan', String(stats.embers), x0, 404);
  statLine(ctx, 'Lentera dinyalakan', String(stats.lanterns), x0, 436);
  statLine(ctx, 'Waktu bermain', formatTime(stats.time), x0, 468);
  if (stats.score >= game.best && stats.score > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.amber;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('★ Skor terbaik baru! ★', cx, 512);
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '19px Georgia, serif';
    ctx.fillText(`Skor terbaik: ${game.best.toLocaleString('id-ID')}`, cx, 512);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 23px Georgia, serif';
  const blink = 0.65 + 0.35 * Math.sin(game.world.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillText('Tekan R atau klik untuk main lagi', cx, 566);
  ctx.globalAlpha = 1;
}

function drawWinScreen(ctx, game) {
  dimScreen(ctx);
  const stats = game.world.stats();
  const cx = VIEW_WIDTH / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 58px Georgia, serif';
  ctx.shadowColor = 'rgba(255, 140, 26, 0.8)';
  ctx.shadowBlur = 26;
  ctx.fillText('MALAM TERANG KEMBALI', cx, 240);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = 'italic 21px Georgia, serif';
  ctx.fillText('Sepuluh wave terlewati — semua lentera menyala.', cx, 278);

  const x0 = cx - 150;
  statLine(ctx, 'Skor akhir', stats.score.toLocaleString('id-ID'), x0, 340);
  statLine(ctx, 'Bara dikumpulkan', String(stats.embers), x0, 372);
  statLine(ctx, 'Lentera dinyalakan', String(stats.lanterns), x0, 404);
  statLine(ctx, 'Sentuhan wisp', String(stats.wispsTouched), x0, 436);
  statLine(ctx, 'Waktu bermain', formatTime(stats.time), x0, 468);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.amber;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`Skor terbaik: ${game.best.toLocaleString('id-ID')}`, cx, 512);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 23px Georgia, serif';
  const blink = 0.65 + 0.35 * Math.sin(game.world.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillText('R: main lagi      E: lanjut tanpa akhir', cx, 566);
  ctx.globalAlpha = 1;
}
