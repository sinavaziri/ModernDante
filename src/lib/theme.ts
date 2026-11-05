// Light and dark mode. The site follows the device's setting until a visitor presses the header button,
// and then remembers their choice in this browser. Dark mode is the .dark class on <html>.

const THEME_KEY = 'theme';
const DEVICE_DARK = '(prefers-color-scheme: dark)';

/** Runs in <head> before the page is drawn, so a dark page never flashes light first */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_KEY}');var d=s?s==='dark':matchMedia('${DEVICE_DARK}').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

function storedTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

/** Choosing what the device already prefers forgets the choice, so the site goes back to following the device */
export function setDark(dark: boolean) {
  try {
    if (dark === matchMedia(DEVICE_DARK).matches) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch {
    // Storage can be blocked. The switch still works for this page.
  }
  document.documentElement.classList.toggle('dark', dark);
}

/** Calls back whenever the theme changes, and follows the device's setting while no choice is stored */
export function subscribeToTheme(onChange: () => void): () => void {
  const html = document.documentElement;
  const observer = new MutationObserver(onChange);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  const device = matchMedia(DEVICE_DARK);
  const followDevice = () => {
    if (!storedTheme()) html.classList.toggle('dark', device.matches);
  };
  device.addEventListener('change', followDevice);
  return () => {
    observer.disconnect();
    device.removeEventListener('change', followDevice);
  };
}
