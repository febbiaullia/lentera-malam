// Lentera Malam — bootstrap and game loop.
// States: title -> playing <-> paused, playing -> over / win.
// The loop runs the world on a fixed 1/60 s step so play and the
// deterministic screenshot scenes advance exactly the same way.
// ?shot=title|play|late|over|win freezes one staged scene instead.

import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';
import { World } from './world.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { drawScene } from './render.js';
import { applyShot } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'lentera-malam-best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new SoundEngine();
    this.world = new World(1);
    this.state = 'title';
    this.frozen = false;
    this.muted = false;
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      this.best = 0;
    }
    // Any first gesture unlocks audio (browsers lock it until then).
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('mousedown', unlock, { once: true });
  }

  saveBest() {
    if (this.world.score > this.best) {
      this.best = this.world.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // Best score is a nicety; a blocked store must not break play.
      }
    }
  }

  startGame() {
    this.world.reset((Math.random() * 0xffffffff) >>> 0);
    this.state = 'playing';
    this.sound.uiClick();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
  }

  update(dt) {
    const input = this.input;

    if (input.wasPressed('KeyM')) this.toggleMute();

    if (this.state === 'title') {
      if (input.wasPressed('Enter') || input.wasPressed('Space') || input.wasClicked()) {
        this.startGame();
      }
      return;
    }

    if (this.state === 'paused') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasClicked()) {
        this.state = 'playing';
        this.sound.uiClick();
      }
      return;
    }

    if (this.state === 'over') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.wasClicked()) {
        this.startGame();
      }
      return;
    }

    if (this.state === 'win') {
      if (input.wasPressed('KeyR') || input.wasClicked()) {
        this.startGame();
      } else if (input.wasPressed('KeyE')) {
        // Endless: keep going past wave 10, waves keep scaling.
        this.world.endless = true;
        this.world.waveClearTimer = 0.5;
        this.state = 'playing';
        this.sound.uiClick();
      }
      return;
    }

    // Playing.
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      this.state = 'paused';
      this.sound.uiClick();
      return;
    }
    this.world.update(dt, input, this.sound);
    if (this.world.justDied) {
      this.state = 'over';
      this.saveBest();
      this.sound.gameOver();
    } else if (this.world.justWon) {
      this.state = 'win';
      this.saveBest();
      this.sound.win();
    }
  }

  render() {
    drawScene(this.ctx, this);
  }

  run() {
    let last = performance.now();
    let acc = 0;
    const loop = (now) => {
      const elapsed = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (!this.frozen) {
        acc += elapsed;
        let steps = 0;
        while (acc >= STEP && steps < 5) {
          this.update(STEP);
          acc -= STEP;
          steps++;
        }
        if (steps === 5) acc = 0;
        this.input.endFrame();
      }
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

function main() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  const game = new Game(canvas);
  window.__game = game;
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    const seed = Number(params.get('seed') || '1') || 1;
    applyShot(game, shot, seed);
  }
  game.run();
}

main();
