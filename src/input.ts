export interface InputSystem {
  getInput: () => { x: number; y: number };
  isScurryPressed: () => boolean;
  consumeScurry: () => boolean;
  onScurryTrigger: (callback: () => void) => void;
  reset: () => void;
  dispose: () => void;
}

export function createInput(joystickZone?: HTMLElement): InputSystem {
  const keysDown = new Set<string>();
  let touchVector = { x: 0, y: 0 };
  let scurryRequested = false;
  let scurryListener: (() => void) | null = null;

  function onKeyDown(e: KeyboardEvent) {
    keysDown.add(e.code);
    if (e.code === 'Space') {
      e.preventDefault();
      scurryRequested = true;
      if (scurryListener) scurryListener();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keysDown.delete(e.code);
  }

  function onBlur() {
    keysDown.clear();
    touchVector = { x: 0, y: 0 };
    scurryRequested = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    getInput: () => {
      let kx = 0;
      let ky = 0;

      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) kx -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) kx += 1;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) ky -= 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) ky += 1;

      // Combine with touch vector if active
      const x = Math.abs(touchVector.x) > 0.1 ? touchVector.x : kx;
      const y = Math.abs(touchVector.y) > 0.1 ? touchVector.y : ky;

      return { x, y };
    },

    isScurryPressed: () => scurryRequested,

    consumeScurry: () => {
      if (scurryRequested) {
        scurryRequested = false;
        return true;
      }
      return false;
    },

    onScurryTrigger: (callback: () => void) => {
      scurryListener = callback;
    },

    reset: () => {
      keysDown.clear();
      touchVector = { x: 0, y: 0 };
      scurryRequested = false;
    },

    dispose: () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
