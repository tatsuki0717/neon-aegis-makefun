// Keyboard and mouse input: held movement keys, the aim point in arena coordinates,
// one-shot action flags (start, pause, mute) and the firing state.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export class Input {
  constructor(canvas, toArenaPoint) {
    this.canvas = canvas;
    this.toArenaPoint = toArenaPoint;
    this.held = { up: false, down: false, left: false, right: false };
    this.mouse = { x: 480, y: 200, down: false, inside: false };
    this.spaceDown = false;
    this.pendingActions = 0;
    this.attach();
  }

  attach() {
    window.addEventListener('keydown', (event) => {
      if (MOVE_KEYS[event.code]) { this.held[MOVE_KEYS[event.code]] = true; event.preventDefault(); }
      else if (event.code === 'Space') {
        if (!event.repeat) { this.spaceDown = true; this.pendingActions |= ACTION_CONFIRM; }
        event.preventDefault();
      } else if (event.code === 'Enter' && !event.repeat) this.pendingActions |= ACTION_CONFIRM;
      else if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) this.pendingActions |= ACTION_PAUSE;
      else if (event.code === 'KeyM' && !event.repeat) this.pendingActions |= ACTION_MUTE;
      else if (event.code === 'KeyR' && !event.repeat) this.pendingActions |= ACTION_CONFIRM;
    });
    window.addEventListener('keyup', (event) => {
      if (MOVE_KEYS[event.code]) this.held[MOVE_KEYS[event.code]] = false;
      else if (event.code === 'Space') this.spaceDown = false;
    });
    this.canvas.addEventListener('pointermove', (event) => {
      const point = this.toArenaPoint(event.clientX, event.clientY);
      this.mouse.x = point.x; this.mouse.y = point.y; this.mouse.inside = true;
    });
    this.canvas.addEventListener('pointerdown', (event) => {
      const point = this.toArenaPoint(event.clientX, event.clientY);
      this.mouse.x = point.x; this.mouse.y = point.y; this.mouse.down = true;
      this.pendingActions |= ACTION_CONFIRM;
    });
    window.addEventListener('pointerup', () => { this.mouse.down = false; });
    window.addEventListener('blur', () => {
      this.held = { up: false, down: false, left: false, right: false };
      this.mouse.down = false; this.spaceDown = false;
    });
  }

  movementVector() {
    const x = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
    const y = (this.held.down ? 1 : 0) - (this.held.up ? 1 : 0);
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  isFiring() { return this.mouse.down || this.spaceDown; }

  takeActions() {
    const actions = this.pendingActions;
    this.pendingActions = 0;
    return actions;
  }

  // Screenshot staging drives the game through this pilot instead of real devices.
  setPilotState({ move = { x: 0, y: 0 }, aim = { x: 480, y: 200 }, firing = false } = {}) {
    this.pilotMove = move; this.mouse.x = aim.x; this.mouse.y = aim.y; this.pilotFiring = firing;
  }
}
