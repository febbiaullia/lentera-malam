// Lentera Malam — keyboard and mouse input.
// Keys are tracked by code (KeyW, ArrowUp, Space, ...). wasPressed()
// answers once per physical press and is cleared at the end of each
// frame by the game loop, so menus never double-trigger.

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.down.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouseDown = false;
    });

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (event) => {
      event.preventDefault();
      this.mouseDown = true;
      this.mouseClicked = true;
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
  }

  // Normalised movement vector from the held keys, or null when idle.
  // Holding the mouse button steers toward the cursor instead.
  moveVector(playerX, playerY) {
    let x = 0;
    let y = 0;
    for (const code of this.down) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        x += dir[0];
        y += dir[1];
      }
    }
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    }
    if (this.mouseDown) {
      const dx = this.mouseX - playerX;
      const dy = this.mouseY - playerY;
      const len = Math.hypot(dx, dy);
      if (len > 12) return { x: dx / len, y: dy / len };
    }
    return null;
  }

  // Dash answers to a held Shift/Space and to a quick tap alike: the
  // pressed set carries a tap across to the next frame's update.
  dashRequested() {
    return (
      this.down.has('ShiftLeft') ||
      this.down.has('ShiftRight') ||
      this.down.has('Space') ||
      this.pressed.has('ShiftLeft') ||
      this.pressed.has('ShiftRight') ||
      this.pressed.has('Space')
    );
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  wasClicked() {
    return this.mouseClicked;
  }

  // Called by the game loop after each frame's updates.
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
