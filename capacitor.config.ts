import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.simplymadestudio.simplypdf',
  appName: 'Simply PDF',
  // npm run build:android writes the app's copy of the web build here.
  webDir: 'dist-android',
  android: {
    // Nothing is loaded from the network, so mixed content stays off. Remote
    // debugging is left to Capacitor's default: on for debug builds (so the
    // device tests can drive the WebView), always off for release builds.
    allowMixedContent: false,
    backgroundColor: '#f2efe8',
  },
  plugins: {
    SystemBars: {
      // The page uses viewport-fit=cover and pads itself with
      // env(safe-area-inset-*). Saying so up front lets the app draw behind
      // the status bar from the first frame, so the bar shows the app's own
      // colour instead of a strip of window background while it loads.
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
