// PATCHWORK editor. Loaded by snippet.js only when the store is opened in the
// dashboard editor (?pw_edit=<token>). Highlights elements, collects clues on click,
// and applies draft changes live. Talks only to the dashboard via postMessage.
(function () {
  if (window.parent === window || !window.__patchwork) return;
  var DASHBOARD = new URL(document.currentScript.src).origin;

  var mode = "browse"; // "browse": store works normally; "select": clicks pick elements
  var selected = null;
  var original = null; // selected element's state before draft changes

  function send(msg) {
    window.parent.postMessage(msg, DASHBOARD);
  }

  function box(color) {
    var b = document.createElement("div");
    b.style.cssText =
      "position:fixed;pointer-events:none;z-index:2147483647;display:none;" +
      "box-sizing:border-box;border:2px solid " + color + ";background:" + color + "1a";
    return b;
  }
  var hoverBox = box("#3b82f6");
  var selectBox = box("#f59e0b");

  function place(b, el) {
    if (!el || !el.isConnected) return (b.style.display = "none");
    var r = el.getBoundingClientRect();
    b.style.display = "block";
    b.style.left = r.left + "px";
    b.style.top = r.top + "px";
    b.style.width = r.width + "px";
    b.style.height = r.height + "px";
  }

  // SVG parts are not useful targets; climb to the HTML element that holds them.
  function pick(el) {
    while (el && el instanceof SVGElement) el = el.parentElement;
    return el;
  }

  function norm(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function step(el) {
    var classes = Array.prototype.map.call(el.classList, function (c) { return "." + CSS.escape(c); });
    return el.tagName.toLowerCase() + classes.join("");
  }

  // Clues in the patch target format (docs/DATA_MODEL.md).
  function clues(el) {
    var attrs = {};
    Array.prototype.forEach.call(el.attributes, function (a) {
      if (a.name !== "class" && a.name !== "style") attrs[a.name] = a.value;
    });
    var text = norm(el.textContent);
    var p = el.parentElement;
    var path = [];
    for (var n = el; n && n !== document.body && path.length < 3; n = n.parentElement) path.unshift(step(n));
    return {
      tag: el.tagName.toLowerCase(),
      text: text && text.length <= 80 ? text : null,
      classes: Array.prototype.slice.call(el.classList),
      attrs: attrs,
      parent: p ? { tag: p.tagName.toLowerCase(), classes: Array.prototype.slice.call(p.classList) } : null,
      selector: path.join(" > "),
    };
  }

  // Undo previous draft changes on the selected element.
  function restore() {
    if (!selected) return;
    if (original.style === null) selected.removeAttribute("style");
    else selected.setAttribute("style", original.style);
    if (original.textChanged) selected.textContent = original.text;
    Object.keys(original.attrs).forEach(function (name) {
      var v = original.attrs[name];
      if (v === null) selected.removeAttribute(name);
      else selected.setAttribute(name, v);
    });
    original.textChanged = false;
    original.attrs = {};
  }

  function select(el) {
    restore();
    selected = el;
    original = { style: el.getAttribute("style"), text: el.textContent, textChanged: false, attrs: {} };
    var cs = getComputedStyle(el);
    send({
      type: "pw:select",
      target: clues(el),
      current: { color: cs.color, backgroundColor: cs.backgroundColor, fontSize: cs.fontSize },
      // A text change replaces all children, which would delete nested elements the site needs.
      textEditable: el.children.length === 0,
    });
  }

  function applyDraft(changes) {
    if (!selected) return;
    restore();
    changes.forEach(function (ch) {
      if (ch.type === "text") original.textChanged = true;
      if (ch.type === "attribute" && !(ch.name in original.attrs)) {
        original.attrs[ch.name] = selected.getAttribute(ch.name);
      }
    });
    window.__patchwork.apply(selected, changes);
  }

  // Select mode: swallow pointer events before the store's own handlers see them.
  function block(e) {
    if (mode !== "select") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === "click") {
      var el = pick(e.target);
      if (el && el !== document.documentElement && el !== document.body) select(el);
    }
  }
  ["click", "mousedown", "mouseup", "pointerdown", "pointerup", "dblclick"].forEach(function (t) {
    window.addEventListener(t, block, true);
  });

  var hovered = null;
  window.addEventListener("mousemove", function (e) {
    hovered = mode === "select" ? pick(e.target) : null;
  }, true);
  document.addEventListener("mouseleave", function () { hovered = null; });

  // Keep outlines on their elements through scrolling, resizing and re-renders.
  (function frame() {
    place(hoverBox, hovered);
    place(selectBox, selected);
    requestAnimationFrame(frame);
  })();

  window.addEventListener("message", function (e) {
    if (e.origin !== DASHBOARD || e.source !== window.parent) return;
    var msg = e.data || {};
    if (msg.type === "pw:mode") {
      mode = msg.mode === "select" ? "select" : "browse";
      document.documentElement.style.cursor = mode === "select" ? "crosshair" : "";
    } else if (msg.type === "pw:apply" && Array.isArray(msg.changes)) {
      applyDraft(msg.changes);
    }
  });

  function init() {
    document.body.appendChild(hoverBox);
    document.body.appendChild(selectBox);
    send({ type: "pw:ready" });
  }
  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
