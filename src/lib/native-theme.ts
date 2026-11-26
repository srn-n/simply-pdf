/**
 * Tells Android about the app theme, so the parts Android draws itself
 * (window, status bar, navigation bar, launch screen) match the app instead
 * of the phone's own light/dark mode. Native side: android/.../AppThemePlugin.java.
 * Does nothing in a plain browser.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

interface AppThemePlugin {
  apply(options: { background: string; dark: boolean; theme: string }): Promise<void>;
  ready(): Promise<void>;
}

const AppTheme = registerPlugin<AppThemePlugin>('AppTheme');
const native = () => Capacitor.isNativePlatform();

export function paintSystemChrome(background: string, dark: boolean, theme: string) {
  if (!native()) return;
  AppTheme.apply({ background, dark, theme }).catch(() => {
    /* an older native shell without the plugin: bars keep their default */
  });
}

let readySent = false;

/** Let Android's launch screen go: the app has painted its first frame. */
export function signalFirstFrame() {
  if (!native() || readySent) return;
  readySent = true;
  AppTheme.ready().catch(() => {});
}
