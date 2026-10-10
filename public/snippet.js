// PATCHWORK snippet. Runs on every visitor's page (in <head>).
// Fetches live patches, finds each target element by its clues, applies the changes,
// and re-applies when the page re-renders. If anything fails, the original page shows.
(function () {
  if (window.__patchwork) return;
  window.__patchwork = {}; // editor.js reuses apply() from here

  var script = document.currentScript;
  var KEY = script && script.getAttribute("data-key");
  if (!KEY) return;
  var API = new URL(script.src).origin;

  var HIDE_MS = 1000; // never hide the page longer than this
  var THRESHOLD = 0.6; // share of the max clue score needed to match
  var WEIGHT = { text: 4, attrs: 3, classes: 2, parent: 1 };

  // Anti-flicker: hide until patches apply, or HIDE_MS, whichever comes first.
  var hide = document.createElement("style");
  hide.textContent = "html{visibility:hidden!important}";
  document.documentElement.appendChild(hide);
  var shown = false;
  function show() {
    if (shown) return;
    shown = true;
    hide.remove();
  }
  setTimeout(show, HIDE_MS);

  var patches = [];
  var applied = {}; // patch id -> element it was applied to
  var reported = {}; // patch id -> true once reported broken this page load

  function norm(s) {
    return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  // 0..1: how well an element matches the target's clues.
  function score(el, t) {
    var got = 0, max = 0;
    if (t.text != null) {
      max += WEIGHT.text;
      if (norm(el.textContent) === norm(t.text)) got += WEIGHT.text;
    }
    var attrs = t.attrs ? Object.keys(t.attrs) : [];
    if (attrs.length) {
      max += WEIGHT.attrs;
      var a = attrs.filter(function (n) { return el.getAttribute(n) === String(t.attrs[n]); });
      got += (WEIGHT.attrs * a.length) / attrs.length;
    }
    var classes = t.classes || [];
    if (classes.length) {
      max += WEIGHT.classes;
      var c = classes.filter(function (n) { return el.classList.contains(n); });
      got += (WEIGHT.classes * c.length) / classes.length;
    }
    if (t.parent) {
      max += WEIGHT.parent;
      var p = el.parentElement;
      if (
        p &&
        p.tagName.toLowerCase() === t.parent.tag &&
        (t.parent.classes || []).every(function (n) { return p.classList.contains(n); })
      ) got += WEIGHT.parent;
    }
    return max ? got / max : 0;
  }

  // Returns { el } on a confident match, { nearMiss: true } if something resembles
  // the target but is not confident enough, or {} if the target is simply not on the page.
  function find(t) {
    var nearMiss = false;
    if (t.selector) {
      try {
        var hits = document.querySelectorAll(t.selector);
        if (hits.length === 1 && score(hits[0], t) >= THRESHOLD) return { el: hits[0] };
        if (hits.length) nearMiss = true;
      } catch (e) {}
    }
    var best = null, bestScore = 0;
    var els = document.getElementsByTagName(t.tag || "*");
    for (var i = 0; i < els.length; i++) {
      var s = score(els[i], t);
      if (s > bestScore) { best = els[i]; bestScore = s; }
      if (t.text != null && norm(els[i].textContent) === norm(t.text)) nearMiss = true;
    }
    if (best && bestScore >= THRESHOLD) return { el: best };
    return { nearMiss: nearMiss };
  }

  function kebab(prop) {
    return prop.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); });
  }

  function apply(el, changes) {
    changes.forEach(function (ch) {
      if (ch.type === "text") el.textContent = ch.value;
      else if (ch.type === "style") {
        Object.keys(ch.props || {}).forEach(function (k) {
          el.style.setProperty(kebab(k), ch.props[k], "important");
        });
      } else if (ch.type === "hide") el.style.setProperty("display", "none", "important");
      else if (ch.type === "attribute") {
        if (ch.value === null) el.removeAttribute(ch.name);
        else el.setAttribute(ch.name, ch.value);
      }
    });
  }

  window.__patchwork.apply = apply;

  // Inside the dashboard editor (?pw_edit=<token>): load editor.js from PATCHWORK.
  if (new URLSearchParams(location.search).get("pw_edit")) {
    var ed = document.createElement("script");
    ed.src = API + "/editor.js";
    document.documentElement.appendChild(ed);
  }

  function report(patch) {
    if (reported[patch.id]) return;
    reported[patch.id] = true;
    fetch(API + "/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: KEY, patch_id: patch.id }),
      keepalive: true,
    }).catch(function () {});
  }

  function run() {
    patches.forEach(function (patch) {
      try {
        var done = applied[patch.id];
        if (done && done.isConnected) return; // already patched; never re-touch it
        var r = find(patch.target || {});
        if (r.el) {
          apply(r.el, patch.changes || []);
          applied[patch.id] = r.el;
        } else if (r.nearMiss) report(patch);
      } catch (e) {}
    });
  }

  function start() {
    run();
    show();
    // childList + subtree only: our own style/attribute changes never trigger it,
    // and text changes land on already-patched elements, which run() skips.
    new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  }

  fetch(API + "/api/live?key=" + encodeURIComponent(KEY))
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      patches = (data.patches || []).filter(function (p) {
        return p.page === "*" || p.page === location.pathname;
      });
      if (!patches.length) return show();
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
      else start();
    })
    .catch(function (e) {
      console.warn("[PATCHWORK] patches not loaded, showing original page", e);
      show();
    });
})();
