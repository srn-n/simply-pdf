import { useEffect, useRef, useState } from 'react';
import { resolvedMotion } from '../lib/store';
import { aliveRecently } from '../lib/router';
import { isNative } from '../lib/platform';

/**
 * The launch screen, about five seconds, in two acts like the studio's other
 * apps. Act 1: the Simply Made Studio card (two capsules slide together and
 * lock). Act 2: three sheets fly in and stack, lines write themselves, a
 * highlighter swipes, the DONE stamp lands, and "Simply PDF" bounces in while
 * a counter runs to 100. Then the desk zooms toward you and dissolves.
 *
 * The animation is CSS (see .splash in styles.css) and uses the active
 * theme's colours, so every theme gets its own version. A tap skips it once
 * the studio name has been seen; a CSS failsafe hides it after 8 s no matter what.
 */

const LEAVE_AT = 4500;
const LEAVE_FOR = 480;
const SKIP_AFTER = 1200;
const WORD = 'Simply PDF';

let shownThisLaunch = false;

/** Android app: once per launch. Website: once per browser tab. Never with
 *  motion off, never under automated tests unless asked for. */
export function shouldShowSplash(): boolean {
  if (typeof window === 'undefined' || shownThisLaunch) return false;
  const forced = new URLSearchParams(location.search).has('splash');
  if (!forced && (navigator.webdriver || resolvedMotion() === 'off')) return false;
  if (isNative) {
    // Back within seconds of last using the app (Android restarted it after a
    // crash, or it was reopened straight away): skip the show, go to work.
    if (!forced && aliveRecently(20_000)) {
      shownThisLaunch = true;
      return false;
    }
    shownThisLaunch = true;
    return true;
  }
  // On the web the show plays once per browser tab: reloading the page or
  // coming back to the tab goes straight to work. Also skipped if the app was
  // in use seconds ago (another tab, or the browser restored the page).
  let seenInTab = false;
  try {
    seenInTab = sessionStorage.getItem('simply-pdf:splash') === '1';
    sessionStorage.setItem('simply-pdf:splash', '1');
  } catch {
    /* storage blocked: fall back to the time check */
  }
  shownThisLaunch = true;
  return forced || (!seenInTab && !aliveRecently(20_000));
}

function Mark({ className }: { className?: string }) {
  return (
    <span className={`sp-mark ${className ?? ''}`} aria-hidden>
      <i />
      <i />
    </span>
  );
}

export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const started = useRef(performance.now());
  const finished = useRef(false);

  const finish = (delay: number) => {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    window.setTimeout(onDone, delay);
  };

  useEffect(() => {
    const t = window.setTimeout(() => finish(LEAVE_FOR + 20), LEAVE_AT);
    const skip = () => performance.now() - started.current > SKIP_AFTER && finish(LEAVE_FOR);
    // Android's Back button (a 'splash-skip' event) always skips, even during the studio card.
    const back = () => finish(LEAVE_FOR);
    window.addEventListener('keydown', skip);
    window.addEventListener('splash-skip', back);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('splash-skip', back);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`splash${leaving ? ' is-leaving' : ''}`}
      aria-label="Simply PDF is starting"
      role="status"
      onPointerDown={() => performance.now() - started.current > SKIP_AFTER && finish(LEAVE_FOR)}
    >
      {/* Act 1: the studio card */}
      <div className="sp-intro" aria-hidden>
        <Mark className="big" />
        <p className="sp-studio">Simply Made Studio</p>
        <p className="sp-presents">presents</p>
      </div>

      {/* Act 2 */}
      <p className="sp-header" aria-hidden>
        <Mark /> Simply Made Studio
      </p>
      <div className="sp-stage" aria-hidden>
        <div className="sp-desk">
          <div className="sp-sheet s1" />
          <div className="sp-sheet s2" />
          <div className="sp-sheet s3">
            <b className="t" />
            <b />
            <b className="hl" />
            <b />
            <b className="short" />
            <span className="sp-stamp">Done</span>
          </div>
        </div>
        <p className="sp-word">
          {WORD.split('').map((ch, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </p>
        <p className="sp-count num">
          <span className="sp-num" />%
        </p>
      </div>
      <div className="sp-foot" aria-hidden>
        <p className="sp-promise">No accounts · No ads · No tracking · No guesswork</p>
        <p className="sp-skip">Tap to skip</p>
      </div>
    </div>
  );
}
