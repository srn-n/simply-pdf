import { Check } from 'lucide-react';
import { THEMES, clearRecent, resolvedTheme, updateSettings, useSettings, toast, type MotionChoice } from '../lib/store';
import { APP } from '../tools/registry';
import { isNative } from '../lib/platform';
import { Link } from '../components/Shell';
import { Button, Segmented, Sheet, Switch, cx } from '../components/ui';


export default function Settings() {
  const s = useSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pt-6 pb-32 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <Sheet className="space-y-6 p-5 sm:p-6">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold">Theme</p>
            <button
              onClick={() => updateSettings({ theme: 'system' })}
              aria-pressed={s.theme === 'system'}
              className={cx('press h-8 rounded-full px-3 text-[12px] font-semibold', s.theme === 'system' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-sunk')}
            >
              Match device
            </button>
          </div>
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2.5">
            {THEMES.map((t) => {
              const active = s.theme === t.id || (s.theme === 'system' && resolvedTheme() === t.id);
              const [bg, ink, accent] = t.swatch;
              return (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={s.theme === t.id}
                  onClick={() => updateSettings({ theme: t.id })}
                  className={cx(
                    'press relative overflow-hidden rounded-[18px] border-2 p-2.5 text-left',
                    active ? 'border-ink' : 'border-rule hover:border-rule-strong',
                  )}
                >
                  {/* a tiny page in that theme */}
                  <span className="block h-16 rounded-[10px] p-2.5" style={{ background: bg, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.06)' }} aria-hidden>
                    <span className="block h-2 w-3/5 rounded-full" style={{ background: ink }} />
                    <span className="mt-1.5 block h-1.5 w-4/5 rounded-full opacity-30" style={{ background: ink }} />
                    <span className="mt-1.5 block h-1.5 w-2/5 rounded-full" style={{ background: accent }} />
                  </span>
                  <span className="mt-2 block text-[13px] font-semibold">{t.name}</span>
                  <span className="block truncate text-[11px] text-ink-3">{t.note}</span>
                  {active && (
                    <span className="hop absolute top-3.5 right-3.5 flex size-5 items-center justify-center rounded-full bg-ink text-paper" aria-hidden>
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13px] font-semibold">Motion</p>
          <Segmented<MotionChoice>
            label="Motion"
            value={s.motion}
            onChange={(motion) => updateSettings({ motion })}
            options={[
              { value: 'full', label: 'Bouncy' },
              { value: 'gentle', label: 'Gentle' },
              { value: 'off', label: 'Still' },
            ]}
          />
          <p className="text-xs leading-relaxed text-ink-3">
            {s.motion === 'full' && `Springs, squash and the launch animation. Follows your ${isNative ? 'phone' : 'device'} if it asks for less motion.`}
            {s.motion === 'gentle' && 'Things still move, but settle softly without bouncing.'}
            {s.motion === 'off' && 'Nothing moves. The launch animation is skipped too.'}
          </p>
        </div>
        <Switch
          checked={s.rememberRecent}
          onChange={(v) => updateSettings({ rememberRecent: v })}
          label="Remember recent activity"
          hint="Keeps the names and sizes of files you've made, on this device only. Turning it off also clears the list."
        />
        <div className="flex flex-wrap gap-2 border-t border-rule pt-5">
          <Button
            size="sm"
            onClick={() => {
              clearRecent();
              try {
                localStorage.removeItem('simply-pdf:text-draft');
              } catch {
                /* ignore */
              }
              toast('Recent list and text draft cleared');
            }}
          >
            Clear everything stored here
          </Button>
        </div>
      </Sheet>

      <Sheet className="space-y-4 p-5 sm:p-6">
        <p className="eyebrow">About</p>
        <dl className="num grid grid-cols-[8rem_1fr] gap-y-2 text-xs">
          <dt className="text-ink-3">Version</dt>
          <dd>{__APP_VERSION__}</dd>
          <dt className="text-ink-3">Edition</dt>
          <dd>{isNative ? 'Android app' : 'Web app'}</dd>
          <dt className="text-ink-3">Automated tests</dt>
          <dd>{__TEST_COUNT__}</dd>
          <dt className="text-ink-3">Network use</dt>
          <dd>{isNative ? 'None. The app has no internet permission.' : 'Loads the app, then nothing. Files never leave this device.'}</dd>
        </dl>
        <p className="text-sm leading-relaxed text-ink-2">
          Made by{' '}
          <a className="font-semibold text-ink underline decoration-rule-strong underline-offset-4" href={APP.studioUrl}>
            {APP.studio}
          </a>
          .
        </p>
        <Link to="/privacy" className="inline-block text-sm font-semibold underline decoration-rule-strong underline-offset-4">
          How privacy works
        </Link>
      </Sheet>
    </div>
  );
}
