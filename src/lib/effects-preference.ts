// Whether a listener has the sound effects under the readings on. They are on until turned off, and the
// choice is remembered in this browser, like the notes switch. Storage can be missing or refuse writes, so
// the choice is also kept in memory for the rest of the visit.

const EFFECTS_KEY = 'effects:off';
const CHANGE_EVENT = 'effects-change';

let chosen: boolean | null = null;

export function getEffectsOn(): boolean {
  if (chosen !== null) return chosen;
  try {
    return localStorage.getItem(EFFECTS_KEY) !== '1';
  } catch {
    return true;
  }
}

export function setEffectsOn(on: boolean) {
  chosen = on;
  try {
    if (on) localStorage.removeItem(EFFECTS_KEY);
    else localStorage.setItem(EFFECTS_KEY, '1');
  } catch {
    // Storage is unavailable; the choice lasts until the page is closed
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Calls back when the effects are turned on or off, here or in another tab */
export function subscribeToEffects(onChange: () => void): () => void {
  const fromOtherTab = (e: StorageEvent) => {
    if (e.key !== EFFECTS_KEY && e.key !== null) return;
    chosen = null;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', fromOtherTab);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', fromOtherTab);
  };
}
