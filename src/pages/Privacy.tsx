import { PROMISES } from '../tools/registry';
import { isNative } from '../lib/platform';

// The Android app and the website prove the promise differently, so this page
// has an app version and a web version of the parts that differ.
const CHECKS = isNative
  ? [
      'Turn on aeroplane mode.',
      'Open Simply PDF and use any tool. It works exactly the same, because it never needed the network.',
      'Look at the app in Android Settings › Apps › Simply PDF › Permissions. There is no internet access to grant, and none is asked for.',
    ]
  : [
      'Open Simply PDF once, then switch off Wi-Fi and mobile data (or turn on aeroplane mode).',
      'Use any tool. It works exactly the same, because after loading it never needed the network.',
      "On a computer, open the browser's developer tools, go to the Network tab and use a tool. Nothing is sent: no upload, no analytics, no third-party requests.",
    ];

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-8 pb-32 sm:px-6">
      <p className="eyebrow mb-3">Privacy</p>
      <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
        Your files stay <span className="marker">{isNative ? 'on your phone' : 'on your device'}</span>. Here's how you can tell.
      </h1>
      <div className="mt-8 space-y-9 text-[16px] leading-relaxed text-ink-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">What happens to a file</h2>
          {isNative ? (
            <p>
              When you choose a file, the app reads it into memory. Every tool, from merging to compressing to signing, runs as code on your phone. The
              finished file is saved to Documents › Simply PDF or handed to the share sheet. There is no server that receives documents, because there is
              no server at all.
            </p>
          ) : (
            <p>
              When you choose a file, this page reads it into memory. Every tool, from merging to compressing to signing, runs as code in your browser,
              on your device. The finished file is downloaded straight from that memory or handed to your device's share sheet. The website only sends
              you the app itself; there is no server that receives documents.
            </p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Check it yourself</h2>
          <ol className="space-y-3">
            {CHECKS.map((c, i) => (
              <li key={c} className="flex gap-4">
                <span className="num pt-1 text-xs text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">The four promises</h2>
          <ol className="divide-y divide-rule border-y border-rule">
            {PROMISES.map((p) => (
              <li key={p.word} className="space-y-1 py-4">
                <p className="text-lg font-semibold text-ink">
                  <s className="decoration-danger decoration-2">{p.word}</s>
                </p>
                <p className="text-[15px] font-medium text-ink">{p.line}</p>
                <p className="text-sm">{p.proof}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">What is stored, and where</h2>
          {isNative ? (
            <p>
              Your theme choice, the names and sizes of files you've made (you can turn this off), and an unsent Text to PDF draft. All of it stays in
              the app's own storage on this phone and is left out of cloud backups. Settings has a button that clears it.
            </p>
          ) : (
            <p>
              Your theme choice, the names and sizes of files you've made (you can turn this off), and an unsent Text to PDF draft. All of it stays in
              this browser's storage on this device. Settings has a button that clears it, and clearing the site's data in your browser removes it too.
              A copy of the app itself is kept by the browser so it opens offline; it never contains your files.
            </p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">{isNative ? 'Permissions' : 'Permissions and cookies'}</h2>
          {isNative ? (
            <p>
              None on Android 11 and newer. On Android 10 and older the app asks for storage access the first time you save, because that is the only
              way those versions allow saving into your Documents folder. You can say no and use Share instead.
            </p>
          ) : (
            <p>
              None. The site never asks for your camera, microphone, location or notifications, sets no cookies and loads nothing from other websites:
              fonts, the PDF engine and every icon come from this site. Its security policy forbids it from contacting any other server.
            </p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Tested, not promised</h2>
          <p>
            {__TEST_COUNT__} automated tests check the PDF engine and the privacy rules: page ranges, rotation on sideways pages, characters the PDF fonts
            can't draw, that compressing never claims a saving it didn't make, and that no code talks to another server. Every change has to pass
            them before it reaches you.
          </p>
        </section>
      </div>
    </article>
  );
}
