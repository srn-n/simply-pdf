// Runs before the app. If this browser, or this phone's Android System WebView,
// is too old to run Simply PDF at all, say so plainly instead of showing a
// blank page. Built with DOM methods and a class from styles.css: the website's
// security policy forbids inline style attributes.
(function () {
  var ok =
    typeof structuredClone === 'function' &&
    typeof Array.prototype.at === 'function' &&
    typeof Object.hasOwn === 'function' &&
    typeof Promise.allSettled === 'function';
  if (ok) return;
  window.__simplyPdfUnsupported = true;
  // Inside the Android app: Capacitor's bridge is present, or the user agent
  // carries the WebView marker "; wv)".
  var inApp = !!window.Capacitor || /; wv\)/.test(navigator.userAgent);
  var text = inApp
    ? [
        'Please update Android System WebView',
        'Simply PDF uses the part of Android that shows web pages inside apps. The version on this phone is too old to open PDFs.',
        'Open the Play Store, search for Android System WebView (and Chrome), tap Update, then open Simply PDF again.',
      ]
    : [
        'Please update your browser',
        'Simply PDF needs a browser from 2022 or later to open PDFs, and this one is older.',
        'Update Chrome, Edge, Firefox or Safari (or your phone’s system updates), then open this page again.',
      ];
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('root');
    if (!root) return;
    var box = document.createElement('div');
    box.className = 'fallback-msg';
    var h = document.createElement('h1');
    h.textContent = text[0];
    var p1 = document.createElement('p');
    p1.textContent = text[1];
    var p2 = document.createElement('p');
    p2.textContent = text[2];
    box.appendChild(h);
    box.appendChild(p1);
    box.appendChild(p2);
    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(box);
  });
})();
