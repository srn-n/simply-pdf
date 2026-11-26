/**
 * Polyfills for pdf.js, loaded before it in the page and in its worker.
 *
 * pdf.js 6 calls JavaScript features that only arrived in Chrome 114–134
 * (Promise.withResolvers, URL.parse, AbortSignal.any, Set.union, …), even in
 * its "legacy" build. Plenty of browsers in use are behind that, and so is
 * Android's built-in WebView: Android 14 ships with Chrome 113, and phones
 * that don't update it from the Play Store stay there. Older Safari and
 * Firefox releases, and Chrome on PCs that don't update, are behind too.
 * Without these, every tool that opens a PDF fails there.
 * Each polyfill only installs itself when the feature is missing.
 */
import 'core-js/actual/promise/with-resolvers';
import 'core-js/actual/promise/try';
import 'core-js/actual/url/parse';
import 'core-js/actual/url/can-parse';
import 'core-js/actual/set';
import 'core-js/actual/iterator';
import 'core-js/actual/typed-array/from-base64';
import 'core-js/actual/typed-array/to-base64';
import 'core-js/actual/typed-array/from-hex';
import 'core-js/actual/typed-array/to-hex';
import 'core-js/actual/math/sum-precise';
import 'core-js/actual/array-buffer/transfer';
import 'core-js/actual/array-buffer/transfer-to-fixed-length';
import 'core-js/actual/array/from-async';
import 'core-js/actual/object/group-by';
import 'core-js/actual/map/group-by';
import 'core-js/actual/map/get-or-insert-computed';
import 'core-js/actual/weak-map/get-or-insert-computed';

// Not in core-js: combine abort signals (Chrome 116).
if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as { any?: unknown }).any !== 'function') {
  (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any = (signals) => {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        break;
      }
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
    return controller.signal;
  };
}

// Not in core-js: `for await` over a ReadableStream (Chrome 124). pdf.js reads
// a page's text this way, so PDF to text needs it.
type AsyncIterableStream = ReadableStream & { values?: unknown; [Symbol.asyncIterator]?: unknown };
if (typeof ReadableStream !== 'undefined' && !(ReadableStream.prototype as AsyncIterableStream)[Symbol.asyncIterator]) {
  const proto = ReadableStream.prototype as AsyncIterableStream;
  const values = function (this: ReadableStream, options?: { preventCancel?: boolean }) {
    const reader = this.getReader();
    const preventCancel = !!options?.preventCancel;
    return {
      async next() {
        try {
          const result = await reader.read();
          if (result.done) reader.releaseLock();
          return result;
        } catch (err) {
          reader.releaseLock();
          throw err;
        }
      },
      async return(value?: unknown) {
        if (!preventCancel) {
          const cancelled = reader.cancel(value);
          reader.releaseLock();
          await cancelled;
        } else {
          reader.releaseLock();
        }
        return { done: true, value };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
  Object.defineProperty(proto, 'values', { value: values, writable: true, configurable: true });
  Object.defineProperty(proto, Symbol.asyncIterator, { value: values, writable: true, configurable: true });
}
