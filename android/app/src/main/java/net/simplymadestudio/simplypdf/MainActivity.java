package net.simplymadestudio.simplypdf;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "SimplyPDF";
    static final String PREFS = "simply-pdf-chrome";

    /** Longest the launch screen waits for the web app (a safety net, never normally reached). */
    private static final long MAX_LAUNCH_HOLD_MS = 4000;

    private volatile boolean webReady = false;
    private int chromeColor;
    private boolean chromeDark;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Keep Android's launch screen up until the in-app launch animation has
        // drawn its first frame (AppThemePlugin.ready from src/main.tsx). Without
        // this, the launch screen ends before the WebView has anything to show,
        // and the person sees a blank or black window for a moment.
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        final long started = SystemClock.uptimeMillis();
        splash.setKeepOnScreenCondition(() -> !webReady && SystemClock.uptimeMillis() - started < MAX_LAUNCH_HOLD_MS);

        registerPlugin(AppThemePlugin.class);
        loadSavedChrome();

        super.onCreate(savedInstanceState);

        paintChrome();
        // Capacitor's SystemBars plugin styles the bars from the phone's
        // light/dark mode once it loads (posted to the main thread). Post ours
        // after it, so the app's own theme wins.
        bridge.executeOnMainThread(this::paintChrome);

        // If the WebView's renderer dies (usually out of memory on a very large
        // PDF), Android closes the whole app unless someone handles it. Handle it:
        // throw the dead WebView away and start the screen again, so the person
        // lands back on the home screen instead of watching the app vanish.
        bridge.addWebViewListener(
            new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    Log.w(TAG, "WebView renderer gone (crashed=" + detail.didCrash() + "); recreating the screen");
                    if (view.getParent() instanceof ViewGroup) {
                        ((ViewGroup) view.getParent()).removeView(view);
                    }
                    view.destroy();
                    runOnUiThread(MainActivity.this::recreate);
                    return true;
                }
            }
        );
    }

    @Override
    public void onResume() {
        super.onResume();
        paintChrome();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        // SystemBars re-applies the phone's light/dark style on a configuration
        // change (e.g. the phone switching to dark mode); put the app theme back.
        super.onConfigurationChanged(newConfig);
        paintChrome();
    }

    /** Called by AppThemePlugin once the web app has painted its first frame. */
    void markWebReady() {
        webReady = true;
    }

    /**
     * Called by AppThemePlugin whenever the app theme is applied. Saves it, so the
     * next launch starts in the same colour, and paints the window and bars now.
     */
    void setChrome(int color, boolean dark, String theme) {
        chromeColor = color;
        chromeDark = dark;
        paintChrome();
        // The web app reports its theme on every launch. Only write and only
        // tell Android about the launch screen when something actually changed:
        // that keeps calls into the system out of the launch path entirely.
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean themeChanged = !theme.equals(prefs.getString("theme", null));
        if (themeChanged || prefs.getInt("color", 0) != color || prefs.getBoolean("dark", !dark) != dark) {
            prefs.edit().putInt("color", color).putBoolean("dark", dark).putString("theme", theme).apply();
        }
        if (themeChanged) rememberLaunchScreen(theme);
    }

    private void loadSavedChrome() {
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean phoneDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        if (!prefs.contains("color") || "system".equals(prefs.getString("theme", "system"))) {
            // Nothing saved yet, or "Match device", which follows the phone and may
            // have changed since last time: the app's own default, Paper or Carbon.
            chromeColor = phoneDark ? 0xFF0B0C12 : 0xFFF2EFE8;
            chromeDark = phoneDark;
        } else {
            chromeColor = prefs.getInt("color", 0xFFF2EFE8);
            chromeDark = prefs.getBoolean("dark", false);
        }
    }

    /**
     * Window, WebView and system bars all in the app theme colour, with status
     * and navigation bar icons that stay readable on it.
     */
    @SuppressWarnings("deprecation")
    private void paintChrome() {
        Window window = getWindow();
        window.setBackgroundDrawable(new ColorDrawable(chromeColor));
        window.getDecorView().setBackgroundColor(chromeColor);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setBackgroundColor(chromeColor);
        }
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        bars.setAppearanceLightStatusBars(!chromeDark);
        bars.setAppearanceLightNavigationBars(!chromeDark);
        // Android 14 and older draw the bars in their own colour (15+ draws the app behind them).
        if (Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(chromeColor);
            window.setNavigationBarColor(chromeColor);
        }
    }

    /** Android 13+: show this theme's launch screen colour next time the app opens. */
    private void rememberLaunchScreen(String theme) {
        if (Build.VERSION.SDK_INT < 33) return;
        int id = "system".equals(theme) ? 0 : getResources().getIdentifier("SplashTheme." + theme, "style", getPackageName());
        try {
            getSplashScreen().setSplashScreenTheme(id == 0 ? Resources.ID_NULL : id);
        } catch (RuntimeException e) {
            Log.w(TAG, "Could not set the launch screen theme", e);
        }
    }
}
