// Whether a reader has the notes on. Remembered in this browser, like the theme. Storage can
// be missing or refuse writes (private windows, blocked site data), so the choice is also kept
// in memory, and the switch still works for the rest of the visit.

const NOTES_KEY = 'notes:on';
const CHANGE_EVENT = 'notes-change';

let chosen: boolean | null = null;

export function getNotesOn(): boolean {
  if (chosen !== null) return chosen;
  try {
    return localStorage.getItem(NOTES_KEY) === '1';
  } catch {
    return false;
  }
}

export function setNotesOn(on: boolean) {
  chosen = on;
  try {
    if (on) localStorage.setItem(NOTES_KEY, '1');
    else localStorage.removeItem(NOTES_KEY);
  } catch {
    // Storage is unavailable; the choice lasts until the page is closed
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Calls back when the notes are turned on or off, here or in another tab */
export function subscribeToNotes(onChange: () => void): () => void {
  const fromOtherTab = (e: StorageEvent) => {
    if (e.key !== NOTES_KEY && e.key !== null) return;
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
