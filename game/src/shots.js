// Lentera Malam — deterministic screenshot scenes.
// ?shot=title|play|late|over|win&seed=N paints one frozen moment of
// the game: the world is built from the seed, advanced by a fixed
// number of 1/60 s steps with scripted input, then frozen. No wall
// clock is read anywhere in the path, so the same URL always renders
// the same frame.

import { ScriptedInput } from './world.js';

const STEP = 1 / 60;

// An input that never moves and never dashes, for idle scenes.
const IDLE_INPUT = {
  moveVector() {
    return null;
  },
  dashRequested() {
    return false;
  },
};

// Run n fixed steps of the world with the given input.
function runSteps(world, input, steps, sound) {
  for (let i = 0; i < steps; i++) {
    if (input.refresh) input.refresh();
    world.update(STEP, input, sound || null);
    if (world.justDied || world.justWon) break;
  }
  world.shake = 0;
  world.shakeX = 0;
  world.shakeY = 0;
}

export function applyShot(game, name, seed) {
  const world = game.world;
  game.frozen = true;

  if (name === 'title') {
    world.reset(seed);
    game.state = 'title';
    return;
  }

  if (name === 'play') {
    world.reset(seed);
    game.state = 'playing';
    runSteps(world, new ScriptedInput(world), 360);
    return;
  }

  if (name === 'late') {
    world.reset(seed);
    world.score = 2450;
    world.embersCollected = 61;
    world.lanternsLitTotal = 12;
    world.lives = 2;
    world.startWave(5);
    world.showBanner('WAVE 5', 'Wisp makin cepat — hati-hati!');
    game.state = 'playing';
    runSteps(world, new ScriptedInput(world), 600);
    return;
  }

  if (name === 'over') {
    world.reset(seed);
    world.startWave(4);
    world.score = 1230;
    world.embersCollected = 27;
    world.lanternsLitTotal = 9;
    world.time = 132;
    world.lives = 0;
    world.player.invuln = 999;
    game.state = 'over';
    runSteps(world, IDLE_INPUT, 90);
    world.banner = null;
    return;
  }

  if (name === 'win') {
    world.reset(seed);
    world.startWave(10);
    for (const lantern of world.lanterns) {
      lantern.filled = 4;
      lantern.lit = true;
    }
    world.score = 4210;
    world.embersCollected = 148;
    world.lanternsLitTotal = 30;
    world.time = 486;
    world.lives = 2;
    world.player.invuln = 999;
    world.waveClearTimer = 1.8;
    game.state = 'win';
    runSteps(world, IDLE_INPUT, 60);
    world.banner = null;
    return;
  }

  // Unknown scene: fall back to the title screen.
  world.reset(seed);
  game.state = 'title';
}
