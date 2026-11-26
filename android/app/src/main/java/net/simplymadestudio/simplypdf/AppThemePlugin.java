package net.simplymadestudio.simplypdf;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The web app tells Android about its theme (src/lib/native-theme.ts), so the
 * parts Android draws itself (window, status bar, navigation bar, launch
 * screen) match the app instead of the phone's own light/dark mode.
 */
@CapacitorPlugin(name = "AppTheme")
public class AppThemePlugin extends Plugin {

    /** apply({ background: '#rrggbb', dark: boolean, theme: 'paper' | ... | 'system' }) */
    @PluginMethod
    public void apply(PluginCall call) {
        String background = call.getString("background");
        Boolean dark = call.getBoolean("dark");
        String theme = call.getString("theme", "system");
        if (background == null || dark == null || theme == null || !theme.matches("[a-z]{2,16}")) {
            call.reject("apply needs background, dark and theme");
            return;
        }
        final int color;
        try {
            color = Color.parseColor(background);
        } catch (IllegalArgumentException e) {
            call.reject("Not a colour: " + background);
            return;
        }
        MainActivity activity = (MainActivity) getActivity();
        activity.runOnUiThread(() -> {
            activity.setChrome(color, dark, theme);
            call.resolve();
        });
    }

    /** The in-app launch animation has drawn its first frame: let the launch screen go. */
    @PluginMethod
    public void ready(PluginCall call) {
        ((MainActivity) getActivity()).markWebReady();
        call.resolve();
    }
}
